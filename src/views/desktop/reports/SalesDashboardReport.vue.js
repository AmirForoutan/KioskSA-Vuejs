import { computed, onMounted, ref } from "vue";
import "@majidh1/jalalidatepicker";
import "@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css";
import { loadDesktopCreditTransactions, loadDesktopInvoices, } from "../../../services/desktopApi";
import { setupJalaliDateInputs } from "../../../utilities";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import { escapeHtml, formatMoney, money, moneyPair, printReceipt, reportRange } from "./receiptPrint";
const from = ref("");
const to = ref("");
const loading = ref(false);
const message = ref("");
const rows = ref([]);
const creditTransactions = ref([]);
useDesktopToastMessage(message);
const totalSales = computed(() => rows.value.reduce((sum, row) => sum + money(row.Payable), 0));
const totalRawSales = computed(() => rows.value.reduce((sum, row) => sum + money(row.Price), 0));
const totalDiscount = computed(() => rows.value.reduce((sum, row) => sum + invoiceDiscount(row), 0));
const totalTax = computed(() => rows.value.reduce((sum, row) => sum + money(row.Tax), 0));
const totalPacking = computed(() => rows.value.reduce((sum, row) => sum + money(row.PackingPrice), 0));
const totalCash = computed(() => rows.value.reduce((sum, row) => sum + paymentPart(row, "cash"), 0));
const totalPos = computed(() => rows.value.reduce((sum, row) => sum + paymentPart(row, "pos"), 0));
const totalCredit = computed(() => rows.value.reduce((sum, row) => sum + paymentPart(row, "credit"), 0));
const averageInvoice = computed(() => (rows.value.length ? Math.round(totalSales.value / rows.value.length) : 0));
const invoiceTypes = computed(() => group(rows.value, (row) => row.InvoiceTypeName || "نامشخص"));
const dailySales = computed(() => group(rows.value, (row) => row.OrderDate || "بدون تاریخ").sort((a, b) => a.key.localeCompare(b.key)).slice(-14));
const paymentBreakdown = computed(() => [
    { key: "cash", title: "نقدی", count: 0, total: totalCash.value },
    { key: "pos", title: "کارتخوان", count: 0, total: totalPos.value },
    { key: "credit", title: "اعتباری", count: 0, total: totalCredit.value },
]);
const topCustomers = computed(() => group(rows.value, (row) => row.CustomerName || "بدون مشتری").sort((a, b) => b.total - a.total).slice(0, 8));
onMounted(async () => {
    setupJalaliDateInputs();
    await loadReport();
});
async function loadReport() {
    loading.value = true;
    message.value = "";
    try {
        rows.value = await loadDesktopInvoices({ FromDate: from.value.trim(), ToDate: to.value.trim() });
        try {
            creditTransactions.value = await loadDesktopCreditTransactions({ FromDate: from.value.trim(), ToDate: to.value.trim() });
        }
        catch {
            creditTransactions.value = [];
        }
        if (!rows.value.length)
            message.value = "برای این بازه داده‌ای پیدا نشد";
    }
    catch (error) {
        rows.value = [];
        creditTransactions.value = [];
        message.value = error instanceof Error ? error.message : "خطا در دریافت داشبورد فروش";
    }
    finally {
        loading.value = false;
    }
}
function optionalAmount(row, ...keys) {
    for (const key of keys) {
        const value = row[key];
        if (value !== undefined && value !== null && value !== "")
            return money(value);
    }
    return null;
}
function invoiceDiscount(row) {
    return optionalAmount(row, "Discount", "InvoiceDiscount", "TotalDiscount", "discount", "invoiceDiscount", "totalDiscount") ?? 0;
}
function paymentPart(row, key) {
    const pos = money(row.PosPrice);
    const cash = money(row.CashPrice);
    const credit = money(row.CreditPrice);
    if (pos + cash + credit === 0 && money(row.Payable) > 0) {
        const legacyCredit = Math.min(legacyCreditAmount(row), money(row.Payable));
        if (key === "credit")
            return legacyCredit;
        if (key === "pos")
            return Math.max(0, money(row.Payable) - legacyCredit);
        return 0;
    }
    if (key === "cash")
        return cash;
    if (key === "credit")
        return credit;
    return pos;
}
function legacyCreditAmount(row) {
    return creditTransactions.value
        .filter((transaction) => Number(transaction.TransactionType) === 2 && Number(transaction.InvoiceId || 0) === Number(row.SaleInvoiceId))
        .reduce((sum, transaction) => sum + money(transaction.Amount), 0);
}
function group(source, keySelector) {
    const map = new Map();
    source.forEach((invoice) => {
        const key = keySelector(invoice);
        const current = map.get(key) || { key, title: key, count: 0, total: 0 };
        current.count += 1;
        current.total += money(invoice.Payable);
        map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
}
function printDashboardReport() {
    const range = reportRange(from.value, to.value);
    const payments = paymentBreakdown.value.map((row) => moneyPair(row.title, row.total)).join("");
    const types = invoiceTypes.value.map((row) => `<tr><td>${escapeHtml(row.title)}</td><td class="num">${row.count.toLocaleString("fa-IR")}</td><td class="num">${formatMoney(row.total)}</td></tr>`).join("");
    const days = dailySales.value.map((row) => `<tr><td>${escapeHtml(row.title)}</td><td class="num">${row.count.toLocaleString("fa-IR")}</td><td class="num">${formatMoney(row.total)}</td></tr>`).join("");
    printReceipt("داشبورد فروش", range, `<div class="section"><div class="section-title">سرجمع فروش</div>
      ${moneyPair("جمع خام", totalRawSales.value)}
      ${moneyPair("جمع تخفیف", totalDiscount.value)}
      ${moneyPair("مالیات", totalTax.value)}
      ${moneyPair("بسته‌بندی", totalPacking.value)}
      ${moneyPair("جمع قابل پرداخت", totalSales.value)}
      ${moneyPair("میانگین فاکتور", averageInvoice.value)}
      ${moneyPair("تعداد فاکتور", rows.value.length)}
    </div>
    <div class="section"><div class="section-title">نحوه تسویه</div>${payments}</div>
    <div class="section"><div class="section-title">نوع سفارش</div><table><thead><tr><th>نوع</th><th class="num">تعداد</th><th class="num">مبلغ</th></tr></thead><tbody>${types}</tbody></table></div>
    <div class="section"><div class="section-title">فروش روزانه</div><table><thead><tr><th>تاریخ</th><th class="num">تعداد</th><th class="num">مبلغ</th></tr></thead><tbody>${days}</tbody></table></div>`);
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['dash-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-message']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['list-row']} */ ;
/** @type {__VLS_StyleScopedClasses['list-row']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-grid']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dash-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dash-toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "dash-input" },
    placeholder: "از تاریخ",
    readonly: true,
    'data-jdp': true,
});
(__VLS_ctx.from);
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "dash-input" },
    placeholder: "تا تاریخ",
    readonly: true,
    'data-jdp': true,
});
(__VLS_ctx.to);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadReport) },
    ...{ class: "dash-btn primary" },
    disabled: (__VLS_ctx.loading),
});
(__VLS_ctx.loading ? "در حال دریافت" : "اعمال فیلتر");
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.printDashboardReport) },
    ...{ class: "dash-btn" },
    disabled: (!__VLS_ctx.rows.length),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "kpi-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "kpi teal" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.totalSales.toLocaleString());
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "kpi red" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.totalDiscount.toLocaleString());
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "kpi amber" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.rows.length.toLocaleString());
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "kpi indigo" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.averageInvoice.toLocaleString());
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "kpi rose" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
((__VLS_ctx.totalTax + __VLS_ctx.totalPacking).toLocaleString());
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "kpi blue" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.totalCredit.toLocaleString());
if (__VLS_ctx.message) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "dash-message" },
    });
    (__VLS_ctx.message);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dash-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "dash-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title" },
});
for (const [row] of __VLS_getVForSourceType((__VLS_ctx.paymentBreakdown))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "list-row" },
        key: (row.key),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (row.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    (row.total.toLocaleString());
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "dash-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title" },
});
for (const [row] of __VLS_getVForSourceType((__VLS_ctx.invoiceTypes))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "list-row" },
        key: (row.key),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (row.title);
    (row.count);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    (row.total.toLocaleString());
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "dash-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title" },
});
for (const [row] of __VLS_getVForSourceType((__VLS_ctx.topCustomers))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "list-row" },
        key: (row.key),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (row.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    (row.total.toLocaleString());
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "dash-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title" },
});
for (const [row] of __VLS_getVForSourceType((__VLS_ctx.dailySales))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "list-row" },
        key: (row.key),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (row.title);
    (row.count);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    (row.total.toLocaleString());
}
/** @type {__VLS_StyleScopedClasses['dash-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-input']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-input']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi']} */ ;
/** @type {__VLS_StyleScopedClasses['teal']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi']} */ ;
/** @type {__VLS_StyleScopedClasses['red']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi']} */ ;
/** @type {__VLS_StyleScopedClasses['amber']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi']} */ ;
/** @type {__VLS_StyleScopedClasses['indigo']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi']} */ ;
/** @type {__VLS_StyleScopedClasses['rose']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi']} */ ;
/** @type {__VLS_StyleScopedClasses['blue']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-message']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['list-row']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['list-row']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['list-row']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['list-row']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            from: from,
            to: to,
            loading: loading,
            message: message,
            rows: rows,
            totalSales: totalSales,
            totalDiscount: totalDiscount,
            totalTax: totalTax,
            totalPacking: totalPacking,
            totalCredit: totalCredit,
            averageInvoice: averageInvoice,
            invoiceTypes: invoiceTypes,
            dailySales: dailySales,
            paymentBreakdown: paymentBreakdown,
            topCustomers: topCustomers,
            loadReport: loadReport,
            printDashboardReport: printDashboardReport,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
