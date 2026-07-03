<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import Chart from "chart.js/auto";
import type { Chart as ChartInstance, ChartConfiguration } from "chart.js";
import {
  loadDesktopCreditTransactions,
  loadDesktopInvoices,
  type DesktopCreditTransaction,
  type DesktopInvoice,
} from "../../../services/desktopApi";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import { escapeHtml, formatMoney, money, moneyPair, printReceipt, reportRange } from "./receiptPrint";

type GroupRow = { key: string; title: string; count: number; total: number; discount?: number };

const props = defineProps<{ fromDate?: string; toDate?: string; query?: string; refreshKey?: number }>();

const chartColors = ["#14b8a6", "#f59e0b", "#6366f1", "#ef4444", "#22c55e", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#8b5cf6"];
const chartSoftColors = ["rgba(20,184,166,.78)", "rgba(245,158,11,.78)", "rgba(99,102,241,.78)", "rgba(239,68,68,.78)", "rgba(34,197,94,.78)", "rgba(6,182,212,.78)", "rgba(236,72,153,.78)", "rgba(132,204,22,.78)", "rgba(249,115,22,.78)", "rgba(139,92,246,.78)"];

const loading = ref(false);
const message = ref("");
const allRows = ref<DesktopInvoice[]>([]);
const creditTransactions = ref<DesktopCreditTransaction[]>([]);

useDesktopToastMessage(message);

const dailyCanvas = ref<HTMLCanvasElement | null>(null);
const typeCanvas = ref<HTMLCanvasElement | null>(null);
const paymentCanvas = ref<HTMLCanvasElement | null>(null);
const hourlyCanvas = ref<HTMLCanvasElement | null>(null);
const discountCanvas = ref<HTMLCanvasElement | null>(null);
const customerCanvas = ref<HTMLCanvasElement | null>(null);

let dailyChart: ChartInstance | null = null;
let typeChart: ChartInstance | null = null;
let paymentChart: ChartInstance | null = null;
let hourlyChart: ChartInstance | null = null;
let discountChart: ChartInstance | null = null;
let customerChart: ChartInstance | null = null;

const rows = computed(() => {
  const s = String(props.query || "").trim();
  if (!s) return allRows.value;
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
const paymentBreakdown = computed<GroupRow[]>(() => [
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
    } catch {
      creditTransactions.value = [];
    }
    if (!allRows.value.length) message.value = "برای این بازه داده‌ای پیدا نشد";
  } catch (error) {
    allRows.value = [];
    creditTransactions.value = [];
    message.value = error instanceof Error ? error.message : "خطا در دریافت داشبورد فروش";
  } finally {
    loading.value = false;
    await nextTick();
    renderCharts();
  }
}

function optionalAmount(row: DesktopInvoice, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") return money(value);
  }
  return null;
}

function invoiceDiscount(row: DesktopInvoice) {
  return optionalAmount(row, "Discount", "InvoiceDiscount", "TotalDiscount", "discount", "invoiceDiscount", "totalDiscount") ?? 0;
}

function paymentPart(row: DesktopInvoice, key: "pos" | "cash" | "credit") {
  const pos = money(row.PosPrice);
  const cash = money(row.CashPrice);
  const credit = money(row.CreditPrice);
  if (pos + cash + credit === 0 && money(row.Payable) > 0) {
    const legacyCredit = Math.min(legacyCreditAmount(row), money(row.Payable));
    if (key === "credit") return legacyCredit;
    if (key === "pos") return Math.max(0, money(row.Payable) - legacyCredit);
    return 0;
  }
  if (key === "cash") return cash;
  if (key === "credit") return credit;
  return pos;
}

function legacyCreditAmount(row: DesktopInvoice) {
  return creditTransactions.value.filter((transaction) => Number(transaction.TransactionType) === 2 && Number(transaction.InvoiceId || 0) === Number(row.SaleInvoiceId)).reduce((sum, transaction) => sum + money(transaction.Amount), 0);
}

function group(source: DesktopInvoice[], keySelector: (row: DesktopInvoice) => string): GroupRow[] {
  const map = new Map<string, GroupRow>();
  source.forEach((invoice) => {
    const key = keySelector(invoice);
    const current = map.get(key) || { key, title: key, count: 0, total: 0 };
    current.count += 1;
    current.total += money(invoice.Payable);
    map.set(key, current);
  });
  return Array.from(map.values());
}

function discountForDate(date: string) {
  return rows.value.filter((row) => (row.OrderDate || "بدون تاریخ") === date).reduce((sum, row) => sum + invoiceDiscount(row), 0);
}

function chartOptions(title: string, stacked = false): ChartConfiguration["options"] {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "bottom", labels: { color: "#cbd5e1", font: { family: "Tahoma", size: 12 }, boxWidth: 14, boxHeight: 14 } },
      title: { display: false, text: title },
      tooltip: { rtl: true, bodyFont: { family: "Tahoma" }, titleFont: { family: "Tahoma" }, callbacks: { label: (ctx: any) => `${ctx.dataset.label || ""}: ${Number(ctx.parsed?.y ?? ctx.parsed ?? 0).toLocaleString("fa-IR")}` } },
    },
    scales: {
      x: { stacked, ticks: { color: "#94a3b8", font: { family: "Tahoma" } }, grid: { color: "rgba(148,163,184,.08)" } },
      y: { stacked, beginAtZero: true, ticks: { color: "#94a3b8", font: { family: "Tahoma" } }, grid: { color: "rgba(148,163,184,.08)" } },
    },
  };
}

function createChart(canvas: HTMLCanvasElement | null, config: ChartConfiguration) {
  if (!canvas) return null;
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
  dailyChart = createChart(dailyCanvas.value, { type: "bar", data: { labels: daily.map((row) => row.title), datasets: [{ type: "bar" as const, label: "فروش روزانه", data: daily.map((row) => row.total), backgroundColor: daily.map((_, i) => chartSoftColors[i % chartSoftColors.length]), borderColor: daily.map((_, i) => chartColors[i % chartColors.length]), borderWidth: 1, borderRadius: 9, maxBarThickness: 38 }, { type: "line" as const, label: "میانگین متحرک", data: movingAverage(daily.map((row) => row.total)), borderColor: "#fef3c7", backgroundColor: "rgba(254,243,199,.14)", pointBackgroundColor: "#f59e0b", pointRadius: 3, tension: .35, fill: true }] }, options: chartOptions("روند فروش روزانه") });
  typeChart = createChart(typeCanvas.value, { type: "doughnut", data: { labels: types.map((row) => row.title), datasets: [{ data: types.map((row) => row.total), backgroundColor: types.map((_, i) => chartSoftColors[i % chartSoftColors.length]), borderColor: "#171b24", borderWidth: 4, hoverOffset: 10 }] }, options: chartOptions("سهم نوع سفارش") });
  const paymentOptions = chartOptions("ترکیب پرداخت") as any;
  paymentOptions.indexAxis = "y";
  paymentOptions.plugins.legend.display = false;
  paymentOptions.scales.x.beginAtZero = true;
  paymentChart = createChart(paymentCanvas.value, { type: "bar", data: { labels: payments.map((row) => row.title), datasets: [{ label: "مبلغ پرداخت", data: payments.map((row) => row.total), backgroundColor: ["rgba(245,158,11,.86)", "rgba(59,130,246,.86)", "rgba(20,184,166,.86)"], borderColor: ["#f59e0b", "#3b82f6", "#14b8a6"], borderWidth: 2, borderRadius: 10, minBarLength: 8, maxBarThickness: 42 }] }, options: paymentOptions });
  hourlyChart = createChart(hourlyCanvas.value, { type: "line", data: { labels: hourly.map((row) => `${row.title}:00`), datasets: [{ label: "فروش ساعتی", data: hourly.map((row) => row.total), borderColor: "#ec4899", backgroundColor: "rgba(236,72,153,.18)", pointBackgroundColor: "#f59e0b", pointBorderColor: "#fef3c7", pointRadius: 4, tension: .38, fill: true }] }, options: chartOptions("فروش ساعتی") });
  discountChart = createChart(discountCanvas.value, { type: "bar", data: { labels: discounts.map((row) => row.title), datasets: [{ label: "فروش", data: discounts.map((row) => row.total), backgroundColor: "rgba(20,184,166,.72)", borderColor: "#14b8a6", borderWidth: 1, borderRadius: 8, maxBarThickness: 34 }, { label: "تخفیف", data: discounts.map((row) => row.discount || 0), backgroundColor: "rgba(248,113,113,.82)", borderColor: "#f87171", borderWidth: 1, borderRadius: 8, maxBarThickness: 34 }] }, options: chartOptions("فروش و تخفیف روزانه") });
  customerChart = createChart(customerCanvas.value, { type: "bar", data: { labels: customers.map((row) => row.title), datasets: [{ label: "فروش مشتری", data: customers.map((row) => row.total), backgroundColor: customers.map((_, i) => chartSoftColors[i % chartSoftColors.length]), borderColor: customers.map((_, i) => chartColors[i % chartColors.length]), borderWidth: 1, borderRadius: 8, maxBarThickness: 32 }] }, options: chartOptions("مشتریان برتر") });
}

function movingAverage(values: number[]) {
  return values.map((_, index) => {
    const start = Math.max(0, index - 2);
    const slice = values.slice(start, index + 1);
    return Math.round(slice.reduce((sum, value) => sum + value, 0) / slice.length);
  });
}

function destroyCharts() {
  dailyChart?.destroy(); typeChart?.destroy(); paymentChart?.destroy(); hourlyChart?.destroy(); discountChart?.destroy(); customerChart?.destroy();
  dailyChart = null; typeChart = null; paymentChart = null; hourlyChart = null; discountChart = null; customerChart = null;
}

function printDashboardReport() {
  const range = reportRange(props.fromDate || "", props.toDate || "");
  const payments = paymentBreakdown.value.map((row) => moneyPair(row.title, row.total)).join("");
  const types = invoiceTypes.value.map((row) => `<tr><td>${escapeHtml(row.title)}</td><td class="num">${row.count.toLocaleString("fa-IR")}</td><td class="num">${formatMoney(row.total)}</td></tr>`).join("");
  const days = dailySales.value.map((row) => `<tr><td>${escapeHtml(row.title)}</td><td class="num">${row.count.toLocaleString("fa-IR")}</td><td class="num">${formatMoney(row.total)}</td></tr>`).join("");
  printReceipt("داشبورد فروش", range, `<div class="section"><div class="section-title">سرجمع فروش</div>${moneyPair("جمع خام", totalRawSales.value)}${moneyPair("جمع تخفیف", totalDiscount.value)}${moneyPair("درصد تخفیف", `${discountRatio.value}%`)}${moneyPair("مالیات", totalTax.value)}${moneyPair("بسته‌بندی", totalPacking.value)}${moneyPair("جمع قابل پرداخت", totalSales.value)}${moneyPair("میانگین فاکتور", averageInvoice.value)}${moneyPair("تعداد فاکتور", rows.value.length)}</div><div class="section"><div class="section-title">نحوه تسویه</div>${payments}</div><div class="section"><div class="section-title">نوع سفارش</div><table><thead><tr><th>نوع</th><th class="num">تعداد</th><th class="num">مبلغ</th></tr></thead><tbody>${types}</tbody></table></div><div class="section"><div class="section-title">فروش روزانه</div><table><thead><tr><th>تاریخ</th><th class="num">تعداد</th><th class="num">مبلغ</th></tr></thead><tbody>${days}</tbody></table></div>`);
}
</script>

<template>
  <div class="dash-shell">
    <div class="dash-actions">
      <button class="dash-btn" :disabled="!rows.length" @click="printDashboardReport">چاپ گزارش</button>
    </div>
    <div class="kpi-grid">
      <div class="kpi teal"><span>جمع فروش</span><b>{{ totalSales.toLocaleString() }}</b></div>
      <div class="kpi red"><span>جمع تخفیف</span><b>{{ totalDiscount.toLocaleString() }}</b><small>{{ discountRatio }}٪ از فروش خام</small></div>
      <div class="kpi amber"><span>تعداد فاکتور</span><b>{{ rows.length.toLocaleString() }}</b></div>
      <div class="kpi indigo"><span>میانگین فاکتور</span><b>{{ averageInvoice.toLocaleString() }}</b></div>
      <div class="kpi rose"><span>مالیات و بسته‌بندی</span><b>{{ (totalTax + totalPacking).toLocaleString() }}</b></div>
      <div class="kpi blue"><span>فروش اعتباری</span><b>{{ totalCredit.toLocaleString() }}</b></div>
    </div>
    <div v-if="message" class="dash-message">{{ message }}</div>
    <div class="dash-grid">
      <section class="dash-panel wide hero-panel"><div class="panel-title"><span>روند فروش روزانه</span><small>۱۴ روز آخر + میانگین متحرک</small></div><div class="chart-box"><canvas ref="dailyCanvas"></canvas></div></section>
      <section class="dash-panel"><div class="panel-title"><span>سهم نوع سفارش</span><small>سالن / بیرون‌بر</small></div><div class="chart-box"><canvas ref="typeCanvas"></canvas></div></section>
      <section class="dash-panel"><div class="panel-title"><span>ترکیب پرداخت</span><small>نقدی، کارتخوان، اعتباری</small></div><div class="chart-box"><canvas ref="paymentCanvas"></canvas></div><div class="payment-breakdown"><div v-for="(row, index) in paymentBreakdown" :key="row.key"><i :style="{ background: chartColors[index] }"></i><span>{{ row.title }}</span><b>{{ row.total.toLocaleString() }}</b></div></div></section>
      <section class="dash-panel wide"><div class="panel-title"><span>فروش و تخفیف روزانه</span><small>مقایسه مبلغ فروش با تخفیف</small></div><div class="chart-box"><canvas ref="discountCanvas"></canvas></div></section>
      <section class="dash-panel"><div class="panel-title"><span>فروش ساعتی</span><small>شناسایی ساعت‌های شلوغ</small></div><div class="chart-box"><canvas ref="hourlyCanvas"></canvas></div></section>
      <section class="dash-panel"><div class="panel-title"><span>مشتریان برتر</span><small>براساس جمع فروش</small></div><div class="chart-box"><canvas ref="customerCanvas"></canvas></div><div class="rank-list"><div v-for="(row, index) in topCustomers" :key="row.key" class="rank-row"><i :style="{ background: chartColors[index % chartColors.length] }"></i><span>{{ row.title }}</span><b>{{ row.total.toLocaleString() }}</b></div></div></section>
    </div>
  </div>
</template>

<style scoped>
.dash-shell { height: 100%; min-height: 0; display: flex; flex-direction: column; gap: 12px; }
.dash-actions { display: flex; justify-content: flex-end; }
.dash-btn { min-height: 42px; border-radius: 8px; padding: 8px 12px; color: #eef2ff; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1); cursor: pointer; white-space: nowrap; }
.dash-btn:disabled { opacity: .55; cursor: not-allowed; }
.kpi-grid { display: grid; grid-template-columns: repeat(6, minmax(130px,1fr)); gap: 10px; }
.kpi, .dash-panel, .dash-message { border-radius: 12px; background: linear-gradient(145deg, rgba(255,255,255,.06), rgba(255,255,255,.025)); border: 1px solid rgba(255,255,255,.09); box-shadow: 0 16px 40px rgba(0,0,0,.16); }
.kpi { min-height: 92px; display: grid; align-content: center; gap: 7px; padding: 12px; position: relative; overflow: hidden; }
.kpi::after { content: ""; position: absolute; inset: auto -28px -38px auto; width: 95px; height: 95px; border-radius: 999px; background: currentColor; opacity: .08; }
.kpi span, .panel-title small, .rank-row span, .payment-breakdown span { color: #a7b0c3; }
.kpi b { color: #eef2ff; font-size: 21px; } .kpi small { color: #cbd5e1; }
.kpi.teal { color: #14b8a6; border-color: rgba(20,184,166,.3); } .kpi.red { color: #f87171; border-color: rgba(248,113,113,.3); } .kpi.amber { color: #f59e0b; border-color: rgba(245,158,11,.3); } .kpi.indigo { color: #818cf8; border-color: rgba(99,102,241,.3); } .kpi.rose { color: #fb7185; border-color: rgba(244,63,94,.3); } .kpi.blue { color: #60a5fa; border-color: rgba(59,130,246,.3); }
.dash-message { padding: 10px 12px; color: #fde68a; background: rgba(245,158,11,.12); border-color: rgba(245,158,11,.22); }
.dash-grid { flex: 1; min-height: 0; overflow: auto; display: grid; grid-template-columns: 1.4fr 1fr; align-content: start; gap: 12px; padding-bottom: 4px; }
.dash-panel { padding: 14px; display: flex; flex-direction: column; gap: 12px; min-height: 360px; }
.dash-panel.wide { min-height: 380px; } .dash-panel.hero-panel { min-height: 410px; }
.panel-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-weight: 900; color: #eef2ff; }
.panel-title span { font-size: 16px; } .panel-title small { font-weight: 600; font-size: 12px; }
.chart-box { position: relative; flex: 1; min-height: 240px; }
.payment-breakdown, .rank-list { display: grid; gap: 8px; }
.payment-breakdown div, .rank-row { min-height: 36px; display: grid; grid-template-columns: 12px 1fr auto; align-items: center; gap: 8px; border-radius: 10px; padding: 8px 10px; background: rgba(255,255,255,.035); }
.payment-breakdown i, .rank-row i { width: 11px; height: 11px; border-radius: 999px; }
.rank-row { grid-template-columns: 14px 1fr auto; } .rank-row b, .payment-breakdown b { color: #eef2ff; }
@media (max-width:1180px) { .kpi-grid, .dash-grid { grid-template-columns: 1fr; } }
</style>
