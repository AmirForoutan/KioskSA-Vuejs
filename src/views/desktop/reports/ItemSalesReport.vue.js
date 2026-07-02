import { computed, onMounted, ref } from "vue";
import "@majidh1/jalalidatepicker";
import "@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css";
import { can } from "../../../components/acl/can";
import { loadDesktopInvoiceItems, loadDesktopInvoices, } from "../../../services/desktopApi";
import { exportToExcel } from "../../utils/exportExcel";
import { setupJalaliDateInputs } from "../../../utilities";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
const modes = [
    { key: "summary", title: "سرجمع اقلام" },
    { key: "date", title: "تفکیک تاریخی" },
    { key: "invoice", title: "تفکیک فاکتور" },
];
const activeMode = ref("summary");
const from = ref("");
const to = ref("");
const q = ref("");
const loading = ref(false);
const message = ref("");
const invoices = ref([]);
useDesktopToastMessage(message);
const lines = ref([]);
const filteredLines = computed(() => {
    const s = q.value.trim();
    if (!s)
        return lines.value;
    return lines.value.filter((row) => `${row.goodsName} ${row.customer} ${row.phone} ${row.invoiceNo} ${row.date}`.includes(s));
});
const summaryRows = computed(() => {
    const map = new Map();
    filteredLines.value.forEach((line) => {
        const current = map.get(line.goodsKey) || {
            goodsName: line.goodsName,
            quantity: 0,
            invoiceCount: 0,
            total: 0,
        };
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
        const current = map.get(key) || {
            date: line.date,
            goodsName: line.goodsName,
            quantity: 0,
            invoiceCount: 0,
            total: 0,
        };
        current.quantity = Number(current.quantity) + line.quantity;
        current.total = Number(current.total) + line.total;
        current.invoiceCount = Number(current.invoiceCount) + 1;
        map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => String(b.date).localeCompare(String(a.date)));
});
const invoiceRows = computed(() => filteredLines.value.map((line) => ({
    invoiceNo: line.invoiceNo,
    date: line.date,
    customer: line.customer || "بدون مشتری",
    goodsName: line.goodsName,
    quantity: line.quantity,
    total: line.total,
})));
const activeRows = computed(() => {
    if (activeMode.value === "date")
        return dateRows.value;
    if (activeMode.value === "invoice")
        return invoiceRows.value;
    return summaryRows.value;
});
const topItems = computed(() => summaryRows.value.slice(0, 8));
const maxItemTotal = computed(() => Math.max(1, ...topItems.value.map((row) => Number(row.total))));
const totalItemsSale = computed(() => filteredLines.value.reduce((sum, row) => sum + row.total, 0));
const totalQuantity = computed(() => filteredLines.value.reduce((sum, row) => sum + row.quantity, 0));
onMounted(() => {
    setupDatePicker();
    loadReport();
});
function setupDatePicker() {
    setupJalaliDateInputs();
}
async function loadReport() {
    loading.value = true;
    message.value = "";
    lines.value = [];
    try {
        invoices.value = await loadDesktopInvoices({ FromDate: from.value.trim(), ToDate: to.value.trim() });
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
        if (!lines.value.length) {
            message.value = "سرویس اقلام فاکتور داده‌ای برنگرداند؛ برای این گزارش endpoint /getinvoiceitems باید آیتم‌های هر فاکتور را برگرداند";
        }
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در دریافت گزارش فروش اقلام";
    }
    finally {
        loading.value = false;
    }
}
function normalizeItem(invoice, item) {
    const quantity = amount(item.Quantity ?? item.Count ?? item.GoodsCount ?? 1);
    const unitPrice = amount(item.Price ?? item.GoodsPrice ?? item.ProductPrice);
    const total = amount(item.TotalPrice ?? item.Payable ?? item.SumPrice ?? item.SumItem ?? item.GoodsSumItem) || unitPrice * quantity;
    const goodsName = String(item.GoodsName || item.ProductTitle || item.ProductName || item.GoodsCode || item.ProductCode || item.GoodsId || "کالای نامشخص");
    return {
        invoiceId: invoice.SaleInvoiceId,
        invoiceNo: invoice.SaleInvoiceNumberDay,
        date: invoice.OrderDate,
        customer: invoice.CustomerName || "",
        phone: invoice.Phone || "",
        goodsKey: String(item.GoodsId || item.ProductId || item.GoodsCode || item.ProductCode || goodsName),
        goodsName,
        quantity,
        total,
    };
}
function amount(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}
function exportExcel() {
    if (!can("reports.export.excel"))
        return;
    const columns = activeMode.value === "invoice"
        ? [
            { key: "invoiceNo", title: "شماره فاکتور" },
            { key: "date", title: "تاریخ" },
            { key: "customer", title: "مشتری" },
            { key: "goodsName", title: "کالا" },
            { key: "quantity", title: "تعداد" },
            { key: "total", title: "مبلغ" },
        ]
        : activeMode.value === "date"
            ? [
                { key: "date", title: "تاریخ" },
                { key: "goodsName", title: "کالا" },
                { key: "quantity", title: "تعداد" },
                { key: "invoiceCount", title: "تعداد ردیف فاکتور" },
                { key: "total", title: "مبلغ" },
            ]
            : [
                { key: "goodsName", title: "کالا" },
                { key: "quantity", title: "تعداد" },
                { key: "invoiceCount", title: "تعداد ردیف فاکتور" },
                { key: "total", title: "مبلغ" },
            ];
    exportToExcel(activeRows.value, columns, `item-sales-${activeMode.value}`);
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['ir-btn']} */ ;
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
    ...{ class: "ir-toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "ir-input" },
    placeholder: "جستجوی کالا، مشتری، فاکتور...",
});
(__VLS_ctx.q);
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "ir-input" },
    placeholder: "از تاریخ",
    readonly: true,
    'data-jdp': true,
});
(__VLS_ctx.from);
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "ir-input" },
    placeholder: "تا تاریخ",
    readonly: true,
    'data-jdp': true,
});
(__VLS_ctx.to);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadReport) },
    ...{ class: "ir-btn primary" },
    disabled: (__VLS_ctx.loading),
});
(__VLS_ctx.loading ? "در حال دریافت" : "اعمال فیلتر");
if (__VLS_ctx.can('reports.export.excel')) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.exportExcel) },
        ...{ class: "ir-btn" },
        disabled: (!__VLS_ctx.activeRows.length),
    });
}
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
/** @type {__VLS_StyleScopedClasses['ir-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-input']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-input']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-input']} */ ;
/** @type {__VLS_StyleScopedClasses['ir-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
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
            from: from,
            to: to,
            q: q,
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
            loadReport: loadReport,
            exportExcel: exportExcel,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
