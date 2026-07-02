import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import Chart from "chart.js/auto";
import "@majidh1/jalalidatepicker";
import "@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css";
import { loadDesktopCreditTransactions, loadDesktopInvoices, } from "../../../services/desktopApi";
import { setupJalaliDateInputs } from "../../../utilities";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
const chartColors = ["#14b8a6", "#f59e0b", "#6366f1", "#ef4444", "#22c55e", "#06b6d4", "#ec4899", "#84cc16"];
const from = ref("");
const to = ref("");
const loading = ref(false);
const message = ref("");
const rows = ref([]);
const creditTransactions = ref([]);
useDesktopToastMessage(message);
const dailyCanvas = ref(null);
const typeCanvas = ref(null);
const paymentCanvas = ref(null);
const hourlyCanvas = ref(null);
let dailyChart = null;
let typeChart = null;
let paymentChart = null;
let hourlyChart = null;
const totalSales = computed(() => rows.value.reduce((sum, row) => sum + amount(row.Payable), 0));
const totalTax = computed(() => rows.value.reduce((sum, row) => sum + amount(row.Tax), 0));
const totalPacking = computed(() => rows.value.reduce((sum, row) => sum + amount(row.PackingPrice), 0));
const totalCredit = computed(() => rows.value.reduce((sum, row) => sum + paymentPart(row, "credit"), 0));
const averageInvoice = computed(() => (rows.value.length ? Math.round(totalSales.value / rows.value.length) : 0));
const dailySales = computed(() => group(rows.value, (row) => row.OrderDate || "بدون تاریخ")
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-14));
const invoiceTypes = computed(() => group(rows.value, (row) => row.InvoiceTypeName || "نامشخص").sort((a, b) => b.total - a.total));
const paymentBreakdown = computed(() => [
    { key: "cash", title: "نقدی", count: 0, total: rows.value.reduce((sum, row) => sum + paymentPart(row, "cash"), 0) },
    { key: "pos", title: "کارتخوان", count: 0, total: rows.value.reduce((sum, row) => sum + paymentPart(row, "pos"), 0) },
    { key: "credit", title: "اعتباری", count: 0, total: rows.value.reduce((sum, row) => sum + paymentPart(row, "credit"), 0) },
]);
const topCustomers = computed(() => group(rows.value, (row) => row.CustomerName || "بدون مشتری")
    .sort((a, b) => b.total - a.total)
    .slice(0, 8));
const hourlySales = computed(() => group(rows.value, (row) => {
    const hour = String(row.OrderTime || "").slice(0, 2);
    return hour || "--";
})
    .filter((row) => row.key !== "--")
    .sort((a, b) => a.key.localeCompare(b.key)));
onMounted(async () => {
    setupDatePicker();
    await loadReport();
});
onBeforeUnmount(() => {
    destroyCharts();
});
function setupDatePicker() {
    setupJalaliDateInputs();
}
async function loadReport() {
    loading.value = true;
    message.value = "";
    try {
        rows.value = await loadDesktopInvoices({ FromDate: from.value.trim(), ToDate: to.value.trim() });
        try {
            creditTransactions.value = await loadDesktopCreditTransactions({
                FromDate: from.value.trim(),
                ToDate: to.value.trim(),
            });
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
        await nextTick();
        renderCharts();
    }
}
function amount(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}
function paymentPart(row, key) {
    const pos = amount(row.PosPrice);
    const cash = amount(row.CashPrice);
    const credit = amount(row.CreditPrice);
    if (pos + cash + credit === 0 && amount(row.Payable) > 0) {
        const legacyCredit = Math.min(legacyCreditAmount(row), amount(row.Payable));
        if (key === "credit")
            return legacyCredit;
        if (key === "pos")
            return Math.max(0, amount(row.Payable) - legacyCredit);
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
        .reduce((sum, transaction) => sum + amount(transaction.Amount), 0);
}
function group(source, keySelector) {
    const map = new Map();
    source.forEach((invoice) => {
        const key = keySelector(invoice);
        const current = map.get(key) || { key, title: key, count: 0, total: 0 };
        current.count += 1;
        current.total += amount(invoice.Payable);
        map.set(key, current);
    });
    return Array.from(map.values());
}
function chartOptions(title) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "bottom",
                labels: { color: "#cbd5e1", font: { family: "Tahoma", size: 12 } },
            },
            title: {
                display: false,
                text: title,
            },
            tooltip: {
                rtl: true,
                bodyFont: { family: "Tahoma" },
                titleFont: { family: "Tahoma" },
            },
        },
        scales: {
            x: {
                ticks: { color: "#94a3b8", font: { family: "Tahoma" } },
                grid: { color: "rgba(148, 163, 184, 0.08)" },
            },
            y: {
                ticks: { color: "#94a3b8", font: { family: "Tahoma" } },
                grid: { color: "rgba(148, 163, 184, 0.08)" },
            },
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
    const types = invoiceTypes.value.length ? invoiceTypes.value : [{ key: "empty", title: "بدون داده", count: 0, total: 0 }];
    const payments = paymentBreakdown.value;
    const hourly = hourlySales.value;
    dailyChart = createChart(dailyCanvas.value, {
        type: "bar",
        data: {
            labels: daily.map((row) => row.title),
            datasets: [
                {
                    label: "فروش روزانه",
                    data: daily.map((row) => row.total),
                    backgroundColor: daily.map((_, index) => chartColors[index % chartColors.length]),
                    borderRadius: 7,
                    maxBarThickness: 36,
                },
            ],
        },
        options: chartOptions("روند فروش روزانه"),
    });
    typeChart = createChart(typeCanvas.value, {
        type: "doughnut",
        data: {
            labels: types.map((row) => row.title),
            datasets: [
                {
                    data: types.map((row) => row.total),
                    backgroundColor: types.map((_, index) => chartColors[index % chartColors.length]),
                    borderColor: "#171b24",
                    borderWidth: 3,
                },
            ],
        },
        options: chartOptions("سهم نوع سفارش"),
    });
    const paymentOptions = chartOptions("ترکیب پرداخت");
    paymentOptions.indexAxis = "y";
    paymentOptions.plugins.legend.display = false;
    paymentOptions.scales.x.beginAtZero = true;
    paymentChart = createChart(paymentCanvas.value, {
        type: "bar",
        data: {
            labels: payments.map((row) => row.title),
            datasets: [
                {
                    label: "مبلغ پرداخت",
                    data: payments.map((row) => row.total),
                    backgroundColor: ["rgba(245, 158, 11, 0.78)", "rgba(59, 130, 246, 0.78)", "rgba(20, 184, 166, 0.78)"],
                    borderColor: ["#f59e0b", "#3b82f6", "#14b8a6"],
                    borderWidth: 2,
                    borderRadius: 8,
                    minBarLength: 8,
                    maxBarThickness: 36,
                },
            ],
        },
        options: paymentOptions,
    });
    hourlyChart = createChart(hourlyCanvas.value, {
        type: "line",
        data: {
            labels: hourly.map((row) => `${row.title}:00`),
            datasets: [
                {
                    label: "فروش ساعتی",
                    data: hourly.map((row) => row.total),
                    borderColor: "#ec4899",
                    backgroundColor: "rgba(236, 72, 153, 0.18)",
                    pointBackgroundColor: "#f59e0b",
                    pointBorderColor: "#fef3c7",
                    pointRadius: 4,
                    tension: 0.35,
                    fill: true,
                },
            ],
        },
        options: chartOptions("توزیع فروش بر اساس ساعت"),
    });
}
function destroyCharts() {
    dailyChart?.destroy();
    typeChart?.destroy();
    paymentChart?.destroy();
    hourlyChart?.destroy();
    dailyChart = null;
    typeChart = null;
    paymentChart = null;
    hourlyChart = null;
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
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
/** @type {__VLS_StyleScopedClasses['dash-message']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-breakdown']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-breakdown']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-breakdown']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-row']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-row']} */ ;
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
    ...{ class: "dash-panel wide" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title" },
});
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
        ...{ style: ({ background: ['#f59e0b', '#3b82f6', '#14b8a6'][index] }) },
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "dash-panel wide" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chart-box" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.canvas, __VLS_intrinsicElements.canvas)({
    ref: "hourlyCanvas",
});
/** @type {typeof __VLS_ctx.hourlyCanvas} */ ;
/** @type {__VLS_StyleScopedClasses['dash-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-input']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-input']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi']} */ ;
/** @type {__VLS_StyleScopedClasses['teal']} */ ;
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
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-list']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-row']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['wide']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-box']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            chartColors: chartColors,
            from: from,
            to: to,
            loading: loading,
            message: message,
            rows: rows,
            dailyCanvas: dailyCanvas,
            typeCanvas: typeCanvas,
            paymentCanvas: paymentCanvas,
            hourlyCanvas: hourlyCanvas,
            totalSales: totalSales,
            totalTax: totalTax,
            totalPacking: totalPacking,
            totalCredit: totalCredit,
            averageInvoice: averageInvoice,
            paymentBreakdown: paymentBreakdown,
            topCustomers: topCustomers,
            loadReport: loadReport,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
