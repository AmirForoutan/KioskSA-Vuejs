import { computed, onMounted, ref, watch } from "vue";
import { can } from "../../../components/acl/can";
import { loadDesktopInvoiceItems, loadDesktopInvoices } from "../../../services/desktopApi";
import { exportToExcel } from "../../utils/exportExcel";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import { escapeHtml, formatMoney, money, moneyPair, printReceipt, reportRange } from "./receiptPrint";
const props = defineProps();
const modes = [
    { key: "summary", title: "سرجمع اقلام" },
    { key: "date", title: "تفکیک تاریخی" },
    { key: "invoice", title: "تفکیک فاکتور" },
];
const activeMode = ref("summary");
const loading = ref(false);
const message = ref("");
const invoices = ref([]);
const lines = ref([]);
useDesktopToastMessage(message);
const filteredLines = computed(() => {
    const s = String(props.query || "").trim();
    if (!s)
        return lines.value;
    return lines.value.filter((row) => `${row.goodsName} ${row.customer} ${row.phone} ${row.invoiceNo} ${row.date}`.includes(s));
});
const summaryRows = computed(() => {
    const map = new Map();
    filteredLines.value.forEach((line) => {
        const current = map.get(line.goodsKey) || { goodsName: line.goodsName, quantity: 0, invoiceCount: 0, total: 0 };
        current.quantity = Number(current.quantity) + line.quantity;
        current.total = Number(current.total) + line.total;
        current.invoiceCount = Number(current.invoiceCount) + 1;
        map.set(line.goodsKey, current);
    });
    return Array.from(map.values()).sort((a, b) => Number(b.total) - Number(a.total));
});
const dateRows = computed(() => {
    const map = new Map();
    filteredLines.value.forEach((line) => {
        const key = `${line.date}-${line.goodsKey}`;
        const current = map.get(key) || { date: line.date, goodsName: line.goodsName, quantity: 0, invoiceCount: 0, total: 0 };
        current.quantity = Number(current.quantity) + line.quantity;
        current.total = Number(current.total) + line.total;
        current.invoiceCount = Number(current.invoiceCount) + 1;
        map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => String(b.date).localeCompare(String(a.date)));
});
const invoiceRows = computed(() => filteredLines.value.map((line) => ({ invoiceNo: line.invoiceNo, date: line.date, customer: line.customer || "بدون مشتری", goodsName: line.goodsName, quantity: line.quantity, total: line.total })));
const activeRows = computed(() => activeMode.value === "date" ? dateRows.value : activeMode.value === "invoice" ? invoiceRows.value : summaryRows.value);
const topItems = computed(() => summaryRows.value.slice(0, 8));
const maxItemTotal = computed(() => Math.max(1, ...topItems.value.map((row) => Number(row.total))));
const totalItemsSale = computed(() => filteredLines.value.reduce((sum, row) => sum + row.total, 0));
const totalQuantity = computed(() => filteredLines.value.reduce((sum, row) => sum + row.quantity, 0));
onMounted(loadReport);
watch(() => props.refreshKey, loadReport);
async function loadReport() {
    loading.value = true;
    message.value = "";
    lines.value = [];
    try {
        invoices.value = await loadDesktopInvoices({ FromDate: String(props.fromDate || "").trim(), ToDate: String(props.toDate || "").trim() });
        const allItems = await Promise.all(invoices.value.map(async (invoice) => {
            try {
                const items = await loadDesktopInvoiceItems(invoice.SaleInvoiceId);
                return items.map((item) => normalizeItem(invoice, item));
            }
            catch {
                return [];
            }
        }));
        lines.value = allItems.flat();
        if (!lines.value.length)
            message.value = "سرویس اقلام فاکتور داده‌ای برنگرداند؛ برای این گزارش endpoint /getinvoiceitems باید آیتم‌های هر فاکتور را برگرداند";
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در دریافت گزارش فروش اقلام";
    }
    finally {
        loading.value = false;
    }
}
function normalizeItem(invoice, item) {
    const quantity = money(item.Quantity ?? item.Count ?? item.GoodsCount ?? 1);
    const unitPrice = money(item.Price ?? item.GoodsPrice ?? item.ProductPrice);
    const total = money(item.TotalPrice ?? item.Payable ?? item.SumPrice ?? item.SumItem ?? item.GoodsSumItem) || unitPrice * quantity;
    const goodsName = String(item.GoodsName || item.ProductTitle || item.ProductName || item.GoodsCode || item.ProductCode || item.GoodsId || "کالای نامشخص");
    return { invoiceId: invoice.SaleInvoiceId, invoiceNo: invoice.SaleInvoiceNumberDay, date: invoice.OrderDate, customer: invoice.CustomerName || "", phone: invoice.Phone || "", goodsKey: String(item.GoodsId || item.ProductId || item.GoodsCode || item.ProductCode || goodsName), goodsName, quantity, total };
}
function exportExcel() {
    if (!can("reports.export.excel"))
        return;
    const columns = activeMode.value === "invoice"
        ? [{ key: "invoiceNo", title: "شماره فاکتور" }, { key: "date", title: "تاریخ" }, { key: "customer", title: "مشتری" }, { key: "goodsName", title: "کالا" }, { key: "quantity", title: "تعداد" }, { key: "total", title: "مبلغ" }]
        : activeMode.value === "date"
            ? [{ key: "date", title: "تاریخ" }, { key: "goodsName", title: "کالا" }, { key: "quantity", title: "تعداد" }, { key: "invoiceCount", title: "تعداد ردیف فاکتور" }, { key: "total", title: "مبلغ" }]
            : [{ key: "goodsName", title: "کالا" }, { key: "quantity", title: "تعداد" }, { key: "invoiceCount", title: "تعداد ردیف فاکتور" }, { key: "total", title: "مبلغ" }];
    exportToExcel(activeRows.value, columns, `item-sales-${activeMode.value}`);
}
function printItemReport() {
    const rowsHtml = activeRows.value.map((row) => {
        if (activeMode.value === "invoice")
            return `<tr><td>${escapeHtml(row.invoiceNo)}</td><td>${escapeHtml(row.goodsName)}</td><td class="num">${formatMoney(row.quantity)}</td><td class="num">${formatMoney(row.total)}</td></tr>`;
        if (activeMode.value === "date")
            return `<tr><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.goodsName)}</td><td class="num">${formatMoney(row.quantity)}</td><td class="num">${formatMoney(row.total)}</td></tr>`;
        return `<tr><td>${escapeHtml(row.goodsName)}</td><td class="num">${formatMoney(row.quantity)}</td><td class="num">${formatMoney(row.total)}</td></tr>`;
    }).join("");
    const headers = activeMode.value === "invoice" ? "<tr><th>فاکتور</th><th>کالا</th><th class=\"num\">تعداد</th><th class=\"num\">مبلغ</th></tr>" : activeMode.value === "date" ? "<tr><th>تاریخ</th><th>کالا</th><th class=\"num\">تعداد</th><th class=\"num\">مبلغ</th></tr>" : "<tr><th>کالا</th><th class=\"num\">تعداد</th><th class=\"num\">مبلغ</th></tr>";
    printReceipt("گزارش فروش اقلام", reportRange(props.fromDate || "", props.toDate || ""), `<div class="section"><div class="section-title">سرجمع</div>${moneyPair("جمع فروش اقلام", totalItemsSale.value)}${moneyPair("تعداد اقلام", totalQuantity.value)}${moneyPair("ردیف آیتم", filteredLines.value.length)}</div><div class="section"><div class="section-title">${escapeHtml(modes.find((m) => m.key === activeMode.value)?.title || "گزارش")}</div><table><thead>${headers}</thead><tbody>${rowsHtml}</tbody></table></div>`);
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['ir-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-message']} */ ;
/** @type {__VLS_StyleScopedClasses['item-bars']} */ ;
/** @type {__VLS_StyleScopedClasses['item-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['item-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['item-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-tr']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ir-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ir-actions" },
});
if (__VLS_ctx.can('reports.export.excel')) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.exportExcel) },
        ...{ class: "ir-btn" },
        disabled: (!__VLS_ctx.activeRows.length),
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.printItemReport) },
    ...{ class: "ir-btn" },
    disabled: (!__VLS_ctx.activeRows.length),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ir-tabs" },
});
for (const [mode] of __VLS_getVForSourceType((__VLS_ctx.modes))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.activeMode = mode.key;
            } },
        key: (mode.key),
        ...{ class: ({ active: __VLS_ctx.activeMode === mode.key }) },
    });
    (mode.title);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ir-summary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.totalItemsSale.toLocaleString());
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.totalQuantity.toLocaleString());
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.filteredLines.length.toLocaleString());
if (__VLS_ctx.message) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ir-message" },
    });
    (__VLS_ctx.message);
}
if (__VLS_ctx.topItems.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "item-bars" },
    });
    for (const [row] of __VLS_getVForSourceType((__VLS_ctx.topItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (String(row.goodsName)),
            ...{ class: "item-bar" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (row.goodsName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ style: ({ width: `${Math.max(8, (Number(row.total) / __VLS_ctx.maxItemTotal) * 100)}%` }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
        (Number(row.total).toLocaleString());
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ir-table" },
});
if (__VLS_ctx.activeMode === 'summary') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ir-tr summary ir-th" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
}
else if (__VLS_ctx.activeMode === 'date') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ir-tr date ir-th" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ir-tr invoice ir-th" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
}
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ir-empty" },
    });
}
if (__VLS_ctx.activeMode === 'summary') {
    for (const [row] of __VLS_getVForSourceType((__VLS_ctx.summaryRows))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (String(row.goodsName)),
            ...{ class: "ir-tr summary" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bold" },
        });
        (row.goodsName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (Number(row.quantity).toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (Number(row.invoiceCount).toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bold" },
        });
        (Number(row.total).toLocaleString());
    }
}
else if (__VLS_ctx.activeMode === 'date') {
    for (const [row] of __VLS_getVForSourceType((__VLS_ctx.dateRows))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (`${row.date}-${row.goodsName}`),
            ...{ class: "ir-tr date" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (row.date);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bold" },
        });
        (row.goodsName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (Number(row.quantity).toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (Number(row.invoiceCount).toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bold" },
        });
        (Number(row.total).toLocaleString());
    }
}
else {
    for (const [row] of __VLS_getVForSourceType((__VLS_ctx.invoiceRows))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (`${row.invoiceNo}-${row.goodsName}`),
            ...{ class: "ir-tr invoice" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bold" },
        });
        (row.invoiceNo);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (row.date);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (row.customer);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bold" },
        });
        (row.goodsName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (Number(row.quantity).toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bold" },
        });
        (Number(row.total).toLocaleString());
    }
}
/** @type {__VLS_StyleScopedClasses['ir-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-message']} */ ;
/** @type {__VLS_StyleScopedClasses['item-bars']} */ ;
/** @type {__VLS_StyleScopedClasses['item-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-table']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['summary']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-th']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['date']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-th']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['invoice']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-th']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['summary']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['date']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['invoice']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            can: can,
            modes: modes,
            activeMode: activeMode,
            loading: loading,
            message: message,
            filteredLines: filteredLines,
            summaryRows: summaryRows,
            dateRows: dateRows,
            invoiceRows: invoiceRows,
            activeRows: activeRows,
            topItems: topItems,
            maxItemTotal: maxItemTotal,
            totalItemsSale: totalItemsSale,
            totalQuantity: totalQuantity,
            exportExcel: exportExcel,
            printItemReport: printItemReport,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
