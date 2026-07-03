import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import Chart from "chart.js/auto";
import { loadDesktopCreditTransactions, loadDesktopInvoices, } from "../../../services/desktopApi";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import { escapeHtml, formatMoney, money, moneyPair, printReceipt, reportRange } from "./receiptPrint";
const props = defineProps();
const chartColors = ["#14b8a6", "#f59e0b", "#6366f1", "#ef4444", "#22c55e", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#8b5cf6"];
const chartSoftColors = ["rgba(20,184,166,.78)", "rgba(245,158,11,.78)", "rgba(99,102,241,.78)", "rgba(239,68,68,.78)", "rgba(34,197,94,.78)", "rgba(6,182,212,.78)", "rgba(236,72,153,.78)", "rgba(132,204,22,.78)", "rgba(249,115,22,.78)", "rgba(139,92,246,.78)"];
const loading = ref(false);
const message = ref("");
const allRows = ref([]);
const creditTransactions = ref([]);
useDesktopToastMessage(message);
const dailyCanvas = ref(null);
const typeCanvas = ref(null);
const paymentCanvas = ref(null);
const hourlyCanvas = ref(null);
const discountCanvas = ref(null);
const customerCanvas = ref(null);
let dailyChart = null;
let typeChart = null;
let paymentChart = null;
let hourlyChart = null;
let discountChart = null;
let customerChart = null;
const rows = computed(() => {
    const s = String(props.query || "").trim();
    if (!s)
        return allRows.value;
    return allRows.value.filter((row) => {
        const haystack = `${row.SaleInvoiceNumberDay} ${row.CustomerCode ?? ""} ${row.CustomerName ?? ""} ${row.Phone ?? ""} ${row.InvoiceTypeName ?? ""} ${row.TableTitle ?? ""} ${row.TableCode ?? ""}`;
        return haystack.includes(s);
    });
});
const totalSales = computed(() => rows.value.reduce((sum, row) => sum + money(row.Payable), 0));
const totalRawSales = computed(() => rows.value.reduce((sum, row) => sum + money(row.Price), 0));
const totalDiscount = computed(() => rows.value.reduce((sum, row) => sum + invoiceDiscount(row), 0));
const totalTax = computed(() => rows.value.reduce((sum, row) => sum + money(row.Tax), 0));
const totalPacking = computed(() => rows.value.reduce((sum, row) => sum + money(row.PackingPrice), 0));
const totalCash = computed(() => rows.value.reduce((sum, row) => sum + paymentPart(row, "cash"), 0));
const totalPos = computed(() => rows.value.reduce((sum, row) => sum + paymentPart(row, "pos"), 0));
const totalCredit = computed(() => rows.value.reduce((sum, row) => sum + paymentPart(row, "credit"), 0));
const averageInvoice = computed(() => (rows.value.length ? Math.round(totalSales.value / rows.value.length) : 0));
const discountRatio = computed(() => totalRawSales.value ? Math.round((totalDiscount.value / totalRawSales.value) * 1000) / 10 : 0);
const dailySales = computed(() => group(rows.value, (row) => row.OrderDate || "بدون تاریخ").sort((a, b) => a.key.localeCompare(b.key)).slice(-14));
const dailyDiscounts = computed(() => dailySales.value.map((row) => ({ ...row, discount: discountForDate(row.key) })));
const invoiceTypes = computed(() => group(rows.value, (row) => row.InvoiceTypeName || "نامشخص").sort((a, b) => b.total - a.total));
const paymentBreakdown = computed(() => [
    { key: "cash", title: "نقدی", count: 0, total: totalCash.value },
    { key: "pos", title: "کارتخوان", count: 0, total: totalPos.value },
    { key: "credit", title: "اعتباری", count: 0, total: totalCredit.value },
]);
const topCustomers = computed(() => group(rows.value, (row) => row.CustomerName || "بدون مشتری").sort((a, b) => b.total - a.total).slice(0, 8));
const hourlySales = computed(() => group(rows.value, (row) => String(row.OrderTime || "").slice(0, 2) || "--").filter((row) => row.key !== "--").sort((a, b) => a.key.localeCompare(b.key)));
onMounted(loadReport);
onBeforeUnmount(() => destroyCharts());
watch(() => props.refreshKey, loadReport);
watch(() => props.query, async () => { await nextTick(); renderCharts(); });
async function loadReport() {
    loading.value = true;
    message.value = "";
    try {
        allRows.value = await loadDesktopInvoices({ FromDate: String(props.fromDate || "").trim(), ToDate: String(props.toDate || "").trim() });
        try {
            creditTransactions.value = await loadDesktopCreditTransactions({ FromDate: String(props.fromDate || "").trim(), ToDate: String(props.toDate || "").trim() });
        }
        catch {
            creditTransactions.value = [];
        }
        if (!allRows.value.length)
            message.value = "برای این بازه داده‌ای پیدا نشد";
    }
    catch (error) {
        allRows.value = [];
        creditTransactions.value = [];
        message.value = error instanceof Error ? error.message : "خطا در دریافت داشبورد فروش";
    }
    finally {
        loading.value = false;
        await nextTick();
        renderCharts();
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
    return creditTransactions.value.filter((transaction) => Number(transaction.TransactionType) === 2 && Number(transaction.InvoiceId || 0) === Number(row.SaleInvoiceId)).reduce((sum, transaction) => sum + money(transaction.Amount), 0);
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
    return Array.from(map.values());
}
function discountForDate(date) {
    return rows.value.filter((row) => (row.OrderDate || "بدون تاریخ") === date).reduce((sum, row) => sum + invoiceDiscount(row), 0);
}
function chartOptions(title, stacked = false) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
            legend: { position: "bottom", labels: { color: "#cbd5e1", font: { family: "Tahoma", size: 12 }, boxWidth: 14, boxHeight: 14 } },
            title: { display: false, text: title },
            tooltip: { rtl: true, bodyFont: { family: "Tahoma" }, titleFont: { family: "Tahoma" }, callbacks: { label: (ctx) => `${ctx.dataset.label || ""}: ${Number(ctx.parsed?.y ?? ctx.parsed ?? 0).toLocaleString("fa-IR")}` } },
        },
        scales: {
            x: { stacked, ticks: { color: "#94a3b8", font: { family: "Tahoma" } }, grid: { color: "rgba(148,163,184,.08)" } },
            y: { stacked, beginAtZero: true, ticks: { color: "#94a3b8", font: { family: "Tahoma" } }, grid: { color: "rgba(148,163,184,.08)" } },
        },
    };
}
function createChart(canvas, config) {
    if (!canvas)
        return null;
    return new Chart(canvas, config);
}
function renderCharts() {
    destroyCharts();
    const daily = dailySales.value;
    const discounts = dailyDiscounts.value;
    const types = invoiceTypes.value.length ? invoiceTypes.value : [{ key: "empty", title: "بدون داده", count: 0, total: 0 }];
    const payments = paymentBreakdown.value;
    const hourly = hourlySales.value;
    const customers = topCustomers.value;
    dailyChart = createChart(dailyCanvas.value, { type: "bar", data: { labels: daily.map((row) => row.title), datasets: [{ type: "bar", label: "فروش روزانه", data: daily.map((row) => row.total), backgroundColor: daily.map((_, i) => chartSoftColors[i % chartSoftColors.length]), borderColor: daily.map((_, i) => chartColors[i % chartColors.length]), borderWidth: 1, borderRadius: 9, maxBarThickness: 38 }, { type: "line", label: "میانگین متحرک", data: movingAverage(daily.map((row) => row.total)), borderColor: "#fef3c7", backgroundColor: "rgba(254,243,199,.14)", pointBackgroundColor: "#f59e0b", pointRadius: 3, tension: .35, fill: true }] }, options: chartOptions("روند فروش روزانه") });
    typeChart = createChart(typeCanvas.value, { type: "doughnut", data: { labels: types.map((row) => row.title), datasets: [{ data: types.map((row) => row.total), backgroundColor: types.map((_, i) => chartSoftColors[i % chartSoftColors.length]), borderColor: "#171b24", borderWidth: 4, hoverOffset: 10 }] }, options: chartOptions("سهم نوع سفارش") });
    const paymentOptions = chartOptions("ترکیب پرداخت");
    paymentOptions.indexAxis = "y";
    paymentOptions.plugins.legend.display = false;
    paymentOptions.scales.x.beginAtZero = true;
    paymentChart = createChart(paymentCanvas.value, { type: "bar", data: { labels: payments.map((row) => row.title), datasets: [{ label: "مبلغ پرداخت", data: payments.map((row) => row.total), backgroundColor: ["rgba(245,158,11,.86)", "rgba(59,130,246,.86)", "rgba(20,184,166,.86)"], borderColor: ["#f59e0b", "#3b82f6", "#14b8a6"], borderWidth: 2, borderRadius: 10, minBarLength: 8, maxBarThickness: 42 }] }, options: paymentOptions });
    hourlyChart = createChart(hourlyCanvas.value, { type: "line", data: { labels: hourly.map((row) => `${row.title}:00`), datasets: [{ label: "فروش ساعتی", data: hourly.map((row) => row.total), borderColor: "#ec4899", backgroundColor: "rgba(236,72,153,.18)", pointBackgroundColor: "#f59e0b", pointBorderColor: "#fef3c7", pointRadius: 4, tension: .38, fill: true }] }, options: chartOptions("فروش ساعتی") });
    discountChart = createChart(discountCanvas.value, { type: "bar", data: { labels: discounts.map((row) => row.title), datasets: [{ label: "فروش", data: discounts.map((row) => row.total), backgroundColor: "rgba(20,184,166,.72)", borderColor: "#14b8a6", borderWidth: 1, borderRadius: 8, maxBarThickness: 34 }, { label: "تخفیف", data: discounts.map((row) => row.discount || 0), backgroundColor: "rgba(248,113,113,.82)", borderColor: "#f87171", borderWidth: 1, borderRadius: 8, maxBarThickness: 34 }] }, options: chartOptions("فروش و تخفیف روزانه") });
    customerChart = createChart(customerCanvas.value, { type: "bar", data: { labels: customers.map((row) => row.title), datasets: [{ label: "فروش مشتری", data: customers.map((row) => row.total), backgroundColor: customers.map((_, i) => chartSoftColors[i % chartSoftColors.length]), borderColor: customers.map((_, i) => chartColors[i % chartColors.length]), borderWidth: 1, borderRadius: 8, maxBarThickness: 32 }] }, options: chartOptions("مشتریان برتر") });
}
function movingAverage(values) {
    return values.map((_, index) => {
        const start = Math.max(0, index - 2);
        const slice = values.slice(start, index + 1);
        return Math.round(slice.reduce((sum, value) => sum + value, 0) / slice.length);
    });
}
function destroyCharts() {
    dailyChart?.destroy();
    typeChart?.destroy();
    paymentChart?.destroy();
    hourlyChart?.destroy();
    discountChart?.destroy();
    customerChart?.destroy();
    dailyChart = null;
    typeChart = null;
    paymentChart = null;
    hourlyChart = null;
    discountChart = null;
    customerChart = null;
}
function printDashboardReport() {
    const range = reportRange(props.fromDate || "", props.toDate || "");
    const payments = paymentBreakdown.value.map((row) => moneyPair(row.title, row.total)).join("");
    const types = invoiceTypes.value.map((row) => `<tr><td>${escapeHtml(row.title)}</td><td class="num">${row.count.toLocaleString("fa-IR")}</td><td class="num">${formatMoney(row.total)}</td></tr>`).join("");
    const days = dailySales.value.map((row) => `<tr><td>${escapeHtml(row.title)}</td><td class="num">${row.count.toLocaleString("fa-IR")}</td><td class="num">${formatMoney(row.total)}</td></tr>`).join("");
    printReceipt("داشبورد فروش", range, `<div class="section"><div class="section-title">سرجمع فروش</div>${moneyPair("جمع خام", totalRawSales.value)}${moneyPair("جمع تخفیف", totalDiscount.value)}${moneyPair("درصد تخفیف", `${discountRatio.value}%`)}${moneyPair("مالیات", totalTax.value)}${moneyPair("بسته‌بندی", totalPacking.value)}${moneyPair("جمع قابل پرداخت", totalSales.value)}${moneyPair("میانگین فاکتور", averageInvoice.value)}${moneyPair("تعداد فاکتور", rows.value.length)}</div><div class="section"><div class="section-title">نحوه تسویه</div>${payments}</div><div class="section"><div class="section-title">نوع سفارش</div><table><thead><tr><th>نوع</th><th class="num">تعداد</th><th class="num">مبلغ</th></tr></thead><tbody>${types}</tbody></table></div><div class="section"><div class="section-title">فروش روزانه</div><table><thead><tr><th>تاریخ</th><th class="num">تعداد</th><th class="num">مبلغ</th></tr></thead><tbody>${days}</tbody></table></div>`);
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
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
/** @type {__VLS_StyleScopedClasses['kpi']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-message']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-breakdown']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-breakdown']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-row']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-breakdown']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-row']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-row']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-row']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-breakdown']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-grid']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dash-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dash-actions" },
});
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
(__VLS_ctx.discountRatio);
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
    ...{ class: "dash-panel wide hero-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chart-box" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.canvas, __VLS_intrinsicElements.canvas)({
    ref: "dailyCanvas",
});
/** @type {typeof __VLS_ctx.dailyCanvas} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "dash-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chart-box" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.canvas, __VLS_intrinsicElements.canvas)({
    ref: "typeCanvas",
});
/** @type {typeof __VLS_ctx.typeCanvas} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "dash-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chart-box" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.canvas, __VLS_intrinsicElements.canvas)({
    ref: "paymentCanvas",
});
/** @type {typeof __VLS_ctx.paymentCanvas} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "payment-breakdown" },
});
for (const [row, index] of __VLS_getVForSourceType((__VLS_ctx.paymentBreakdown))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (row.key),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ style: ({ background: __VLS_ctx.chartColors[index] }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (row.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    (row.total.toLocaleString());
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "dash-panel wide" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chart-box" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.canvas, __VLS_intrinsicElements.canvas)({
    ref: "discountCanvas",
});
/** @type {typeof __VLS_ctx.discountCanvas} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "dash-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chart-box" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.canvas, __VLS_intrinsicElements.canvas)({
    ref: "hourlyCanvas",
});
/** @type {typeof __VLS_ctx.hourlyCanvas} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "dash-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chart-box" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.canvas, __VLS_intrinsicElements.canvas)({
    ref: "customerCanvas",
});
/** @type {typeof __VLS_ctx.customerCanvas} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rank-list" },
});
for (const [row, index] of __VLS_getVForSourceType((__VLS_ctx.topCustomers))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (row.key),
        ...{ class: "rank-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ style: ({ background: __VLS_ctx.chartColors[index % __VLS_ctx.chartColors.length] }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (row.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    (row.total.toLocaleString());
}
/** @type {__VLS_StyleScopedClasses['dash-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-actions']} */ ;
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
/** @type {__VLS_StyleScopedClasses['wide']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-box']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-box']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-box']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-breakdown']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['wide']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-box']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-box']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-box']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-list']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-row']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            chartColors: chartColors,
            message: message,
            dailyCanvas: dailyCanvas,
            typeCanvas: typeCanvas,
            paymentCanvas: paymentCanvas,
            hourlyCanvas: hourlyCanvas,
            discountCanvas: discountCanvas,
            customerCanvas: customerCanvas,
            rows: rows,
            totalSales: totalSales,
            totalDiscount: totalDiscount,
            totalTax: totalTax,
            totalPacking: totalPacking,
            totalCredit: totalCredit,
            averageInvoice: averageInvoice,
            discountRatio: discountRatio,
            paymentBreakdown: paymentBreakdown,
            topCustomers: topCustomers,
            printDashboardReport: printDashboardReport,
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
