import { computed, onMounted, ref } from "vue";
import "@majidh1/jalalidatepicker";
import "@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css";
import { can } from "../../../components/acl/can";
import { loadDesktopInvoiceItems, loadDesktopInvoices, } from "../../../services/desktopApi";
import { exportToExcel } from "../../utils/exportExcel";
import { setupJalaliDateInputs } from "../../../utilities";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
const from = ref("");
const to = ref("");
const q = ref("");
const loading = ref(false);
const detailLoading = ref(false);
const message = ref("");
const detailMessage = ref("");
const rows = ref([]);
useDesktopToastMessage(message);
useDesktopToastMessage(detailMessage);
const selectedKey = ref("");
const activeView = ref("summary");
const detailLines = ref([]);
const filtered = computed(() => {
    const s = q.value.trim();
    if (!s)
        return rows.value;
    return rows.value.filter((row) => `${row.customer} ${row.phone}`.includes(s));
});
const selectedCustomer = computed(() => rows.value.find((row) => row.key === selectedKey.value) || null);
const totalSales = computed(() => filtered.value.reduce((sum, row) => sum + row.totalSales, 0));
const totalCredit = computed(() => filtered.value.reduce((sum, row) => sum + row.totalCredit, 0));
const itemSummary = computed(() => {
    const map = new Map();
    detailLines.value.forEach((line) => {
        const current = map.get(line.goodsKey) || {
            goodsName: line.goodsName,
            quantity: 0,
            total: 0,
            invoiceCount: 0,
        };
        current.quantity += line.quantity;
        current.total += line.total;
        current.invoiceCount += 1;
        map.set(line.goodsKey, current);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
});
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
    selectedKey.value = "";
    activeView.value = "summary";
    detailLines.value = [];
    try {
        const invoices = await loadDesktopInvoices({
            FromDate: from.value.trim(),
            ToDate: to.value.trim(),
        });
        rows.value = groupByCustomer(invoices);
        if (!rows.value.length)
            message.value = "داده‌ای برای این بازه پیدا نشد";
    }
    catch (error) {
        rows.value = [];
        message.value = error instanceof Error ? error.message : "خطا در دریافت گزارش مشتریان";
    }
    finally {
        loading.value = false;
    }
}
function customerKey(invoice) {
    const code = Number(invoice.CustomerCode || 0);
    if (code > 1)
        return `customer-${code}`;
    const phone = String(invoice.Phone || "").trim();
    if (phone)
        return `phone-${phone}`;
    const name = String(invoice.CustomerName || "unknown").trim().toLowerCase();
    return `name-${name || "unknown"}`;
}
function paymentPart(row, key) {
    const pos = amount(row.PosPrice);
    const cash = amount(row.CashPrice);
    const credit = amount(row.CreditPrice);
    if (pos + cash + credit === 0 && amount(row.Payable) > 0) {
        return key === "pos" ? amount(row.Payable) : 0;
    }
    if (key === "cash")
        return cash;
    if (key === "credit")
        return credit;
    return pos;
}
function groupByCustomer(invoices) {
    const map = new Map();
    invoices.forEach((invoice) => {
        const key = customerKey(invoice);
        const current = map.get(key) ||
            {
                key,
                customerCode: Number(invoice.CustomerCode || 0),
                customer: invoice.CustomerName || "بدون مشتری",
                phone: invoice.Phone || "",
                invoiceCount: 0,
                totalSales: 0,
                totalTax: 0,
                totalPacking: 0,
                totalCash: 0,
                totalPos: 0,
                totalCredit: 0,
                lastDate: invoice.OrderDate,
                lastTime: invoice.OrderTime,
                invoices: [],
            };
        if ((!current.customer || current.customer === "بدون مشتری") && invoice.CustomerName) {
            current.customer = invoice.CustomerName;
        }
        if (!current.phone && invoice.Phone)
            current.phone = invoice.Phone;
        current.invoiceCount += 1;
        current.totalSales += amount(invoice.Payable);
        current.totalTax += amount(invoice.Tax);
        current.totalPacking += amount(invoice.PackingPrice);
        current.totalCash += paymentPart(invoice, "cash");
        current.totalPos += paymentPart(invoice, "pos");
        current.totalCredit += paymentPart(invoice, "credit");
        current.lastDate = invoice.OrderDate;
        current.lastTime = invoice.OrderTime;
        current.invoices.push(invoice);
        map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => b.totalSales - a.totalSales);
}
async function toggleCustomer(row) {
    if (selectedKey.value === row.key) {
        selectedKey.value = "";
        activeView.value = "summary";
        detailLines.value = [];
        detailMessage.value = "";
        return;
    }
    selectedKey.value = row.key;
    activeView.value = "detail";
    await loadCustomerDetail(row);
}
async function loadCustomerDetail(row) {
    detailLoading.value = true;
    detailMessage.value = "";
    detailLines.value = [];
    try {
        const results = await Promise.all(row.invoices.map(async (invoice) => {
            try {
                const items = await loadDesktopInvoiceItems(invoice.SaleInvoiceId);
                return items.map((item) => normalizeItem(invoice, item));
            }
            catch {
                return [];
            }
        }));
        detailLines.value = results.flat();
        if (!detailLines.value.length) {
            detailMessage.value = "سرویس اقلام فاکتور برای این مشتری داده‌ای برنگرداند؛ فهرست فاکتورها پایین نمایش داده شده است";
        }
    }
    finally {
        detailLoading.value = false;
    }
}
function normalizeItem(invoice, item) {
    const quantity = amount(item.Quantity ?? item.Count ?? item.GoodsCount ?? 1);
    const unitPrice = amount(item.Price ?? item.GoodsPrice ?? item.ProductPrice);
    const total = amount(item.TotalPrice ?? item.Payable ?? item.SumPrice ?? item.SumItem ?? item.GoodsSumItem) || unitPrice * quantity;
    const goodsName = String(item.GoodsName || item.ProductTitle || item.ProductName || item.GoodsCode || item.ProductCode || item.GoodsId || "کالای نامشخص");
    return {
        invoiceNo: invoice.SaleInvoiceNumberDay,
        date: invoice.OrderDate,
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
    if (activeView.value === "detail" && selectedCustomer.value) {
        exportToExcel(detailLines.value, [
            { key: "invoiceNo", title: "شماره فاکتور" },
            { key: "date", title: "تاریخ" },
            { key: "goodsName", title: "کالا" },
            { key: "quantity", title: "تعداد" },
            { key: "total", title: "مبلغ" },
        ], `customer-detail-${selectedCustomer.value.customerCode || selectedCustomer.value.phone || "selected"}`);
        return;
    }
    exportToExcel(filtered.value, [
        { key: "customer", title: "مشتری" },
        { key: "phone", title: "موبایل" },
        { key: "invoiceCount", title: "تعداد فاکتور" },
        { key: "totalSales", title: "جمع فروش" },
        { key: "totalCash", title: "نقدی" },
        { key: "totalPos", title: "کارتخوان" },
        { key: "totalCredit", title: "اعتباری" },
        { key: "totalTax", title: "جمع مالیات" },
        { key: "totalPacking", title: "جمع بسته بندی" },
        { key: "lastDate", title: "آخرین تاریخ" },
        { key: "lastTime", title: "آخرین ساعت" },
    ], "customer-ledger");
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['cl-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-message']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['pay']} */ ;
/** @type {__VLS_StyleScopedClasses['pay']} */ ;
/** @type {__VLS_StyleScopedClasses['pay']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['item-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['item-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['item-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['item-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-grid']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cl-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cl-toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "cl-input" },
    placeholder: "جستجوی مشتری یا موبایل...",
});
(__VLS_ctx.q);
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "cl-input" },
    placeholder: "از تاریخ",
    readonly: true,
    'data-jdp': true,
});
(__VLS_ctx.from);
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "cl-input" },
    placeholder: "تا تاریخ",
    readonly: true,
    'data-jdp': true,
});
(__VLS_ctx.to);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadReport) },
    ...{ class: "cl-btn primary" },
    disabled: (__VLS_ctx.loading),
});
(__VLS_ctx.loading ? "در حال دریافت" : "اعمال فیلتر");
if (__VLS_ctx.can('reports.export.excel')) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.exportExcel) },
        ...{ class: "cl-btn" },
        disabled: (!__VLS_ctx.filtered.length),
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cl-tabs" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeView = 'summary';
        } },
    ...{ class: ({ active: __VLS_ctx.activeView === 'summary' }) },
});
if (__VLS_ctx.selectedCustomer) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedCustomer))
                    return;
                __VLS_ctx.activeView = 'detail';
            } },
        ...{ class: ({ active: __VLS_ctx.activeView === 'detail' }) },
    });
    (__VLS_ctx.selectedCustomer.customer);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cl-summary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.filtered.length.toLocaleString());
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.totalSales.toLocaleString());
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.totalCredit.toLocaleString());
if (__VLS_ctx.selectedCustomer) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    (__VLS_ctx.selectedCustomer.customer);
}
if (__VLS_ctx.message) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cl-message" },
    });
    (__VLS_ctx.message);
}
if (__VLS_ctx.activeView === 'summary') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cl-table" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cl-tr summary cl-th" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    if (__VLS_ctx.loading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "cl-empty" },
        });
    }
    for (const [row] of __VLS_getVForSourceType((__VLS_ctx.filtered))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "cl-tr summary" },
            key: (row.key),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onChange: (...[$event]) => {
                    if (!(__VLS_ctx.activeView === 'summary'))
                        return;
                    __VLS_ctx.toggleCustomer(row);
                } },
            type: "checkbox",
            checked: (__VLS_ctx.selectedKey === row.key),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bold" },
        });
        (row.customer);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (row.phone || "-");
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (row.invoiceCount.toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bold" },
        });
        (row.totalSales.toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "pay cash" },
        });
        (row.totalCash.toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "pay pos" },
        });
        (row.totalPos.toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "pay credit" },
        });
        (row.totalCredit.toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (row.lastDate);
        (row.lastTime);
    }
}
else if (__VLS_ctx.selectedCustomer) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "detail-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-title" },
    });
    (__VLS_ctx.selectedCustomer.customer);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-sub" },
    });
    (__VLS_ctx.selectedCustomer.invoiceCount.toLocaleString());
    (__VLS_ctx.selectedCustomer.totalSales.toLocaleString());
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.activeView === 'summary'))
                    return;
                if (!(__VLS_ctx.selectedCustomer))
                    return;
                __VLS_ctx.activeView = 'summary';
            } },
        ...{ class: "cl-btn" },
    });
    if (__VLS_ctx.detailMessage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "cl-message" },
        });
        (__VLS_ctx.detailMessage);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "item-summary" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.itemSummary))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (item.goodsName),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.goodsName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
        (item.quantity.toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.total.toLocaleString());
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "detail-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mini-table" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mini-tr mini-th" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    for (const [invoice] of __VLS_getVForSourceType((__VLS_ctx.selectedCustomer.invoices))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (invoice.SaleInvoiceId),
            ...{ class: "mini-tr" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bold" },
        });
        (invoice.SaleInvoiceNumberDay);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (invoice.OrderDate);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (invoice.InvoiceTypeName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.paymentPart(invoice, "cash").toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.paymentPart(invoice, "pos").toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.paymentPart(invoice, "credit").toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bold" },
        });
        (__VLS_ctx.amount(invoice.Payable).toLocaleString());
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cl-table" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cl-tr detail cl-th" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    if (__VLS_ctx.detailLoading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "cl-empty" },
        });
    }
    for (const [line] of __VLS_getVForSourceType((__VLS_ctx.detailLines))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "cl-tr detail" },
            key: (`${line.invoiceNo}-${line.goodsName}`),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bold" },
        });
        (line.invoiceNo);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (line.date);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bold" },
        });
        (line.goodsName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (line.quantity.toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bold" },
        });
        (line.total.toLocaleString());
    }
}
/** @type {__VLS_StyleScopedClasses['cl-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-input']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-input']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-input']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-message']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-table']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['summary']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-th']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['summary']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
/** @type {__VLS_StyleScopedClasses['pay']} */ ;
/** @type {__VLS_StyleScopedClasses['cash']} */ ;
/** @type {__VLS_StyleScopedClasses['pay']} */ ;
/** @type {__VLS_StyleScopedClasses['pos']} */ ;
/** @type {__VLS_StyleScopedClasses['pay']} */ ;
/** @type {__VLS_StyleScopedClasses['credit']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-head']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-title']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-message']} */ ;
/** @type {__VLS_StyleScopedClasses['item-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-title']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-table']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-th']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-table']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['detail']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-th']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['cl-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['detail']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            can: can,
            from: from,
            to: to,
            q: q,
            loading: loading,
            detailLoading: detailLoading,
            message: message,
            detailMessage: detailMessage,
            selectedKey: selectedKey,
            activeView: activeView,
            detailLines: detailLines,
            filtered: filtered,
            selectedCustomer: selectedCustomer,
            totalSales: totalSales,
            totalCredit: totalCredit,
            itemSummary: itemSummary,
            loadReport: loadReport,
            paymentPart: paymentPart,
            toggleCustomer: toggleCustomer,
            amount: amount,
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
