<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import Chart from "chart.js/auto";
import type { Chart as ChartInstance, ChartConfiguration } from "chart.js";
import "@majidh1/jalalidatepicker";
import "@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css";
import {
  loadDesktopCreditTransactions,
  loadDesktopInvoices,
  type DesktopCreditTransaction,
  type DesktopInvoice,
} from "../../../services/desktopApi";
import { setupJalaliDateInputs } from "../../../utilities";
import { useDesktopToastMessage } from "../useDesktopToastMessage";

type GroupRow = { key: string; title: string; count: number; total: number };

const chartColors = ["#14b8a6", "#f59e0b", "#6366f1", "#ef4444", "#22c55e", "#06b6d4", "#ec4899", "#84cc16"];
const from = ref("");
const to = ref("");
const loading = ref(false);
const message = ref("");
const rows = ref<DesktopInvoice[]>([]);
const creditTransactions = ref<DesktopCreditTransaction[]>([]);

useDesktopToastMessage(message);

const dailyCanvas = ref<HTMLCanvasElement | null>(null);
const typeCanvas = ref<HTMLCanvasElement | null>(null);
const paymentCanvas = ref<HTMLCanvasElement | null>(null);
const hourlyCanvas = ref<HTMLCanvasElement | null>(null);

let dailyChart: ChartInstance | null = null;
let typeChart: ChartInstance | null = null;
let paymentChart: ChartInstance | null = null;
let hourlyChart: ChartInstance | null = null;

const totalSales = computed(() => rows.value.reduce((sum, row) => sum + amount(row.Payable), 0));
const totalTax = computed(() => rows.value.reduce((sum, row) => sum + amount(row.Tax), 0));
const totalPacking = computed(() => rows.value.reduce((sum, row) => sum + amount(row.PackingPrice), 0));
const totalCredit = computed(() => rows.value.reduce((sum, row) => sum + paymentPart(row, "credit"), 0));
const averageInvoice = computed(() => (rows.value.length ? Math.round(totalSales.value / rows.value.length) : 0));

const dailySales = computed(() =>
  group(rows.value, (row) => row.OrderDate || "بدون تاریخ")
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-14)
);

const invoiceTypes = computed(() =>
  group(rows.value, (row) => row.InvoiceTypeName || "نامشخص").sort((a, b) => b.total - a.total)
);

const paymentBreakdown = computed<GroupRow[]>(() => [
  { key: "cash", title: "نقدی", count: 0, total: rows.value.reduce((sum, row) => sum + paymentPart(row, "cash"), 0) },
  { key: "pos", title: "کارتخوان", count: 0, total: rows.value.reduce((sum, row) => sum + paymentPart(row, "pos"), 0) },
  { key: "credit", title: "اعتباری", count: 0, total: rows.value.reduce((sum, row) => sum + paymentPart(row, "credit"), 0) },
]);

const topCustomers = computed(() =>
  group(rows.value, (row) => row.CustomerName || "بدون مشتری")
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
);

const hourlySales = computed(() =>
  group(rows.value, (row) => {
    const hour = String(row.OrderTime || "").slice(0, 2);
    return hour || "--";
  })
    .filter((row) => row.key !== "--")
    .sort((a, b) => a.key.localeCompare(b.key))
);

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
    } catch {
      creditTransactions.value = [];
    }
    if (!rows.value.length) message.value = "برای این بازه داده‌ای پیدا نشد";
  } catch (error) {
    rows.value = [];
    creditTransactions.value = [];
    message.value = error instanceof Error ? error.message : "خطا در دریافت داشبورد فروش";
  } finally {
    loading.value = false;
    await nextTick();
    renderCharts();
  }
}

function amount(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function paymentPart(row: DesktopInvoice, key: "pos" | "cash" | "credit") {
  const pos = amount(row.PosPrice);
  const cash = amount(row.CashPrice);
  const credit = amount(row.CreditPrice);
  if (pos + cash + credit === 0 && amount(row.Payable) > 0) {
    const legacyCredit = Math.min(legacyCreditAmount(row), amount(row.Payable));
    if (key === "credit") return legacyCredit;
    if (key === "pos") return Math.max(0, amount(row.Payable) - legacyCredit);
    return 0;
  }
  if (key === "cash") return cash;
  if (key === "credit") return credit;
  return pos;
}

function legacyCreditAmount(row: DesktopInvoice) {
  return creditTransactions.value
    .filter((transaction) => Number(transaction.TransactionType) === 2 && Number(transaction.InvoiceId || 0) === Number(row.SaleInvoiceId))
    .reduce((sum, transaction) => sum + amount(transaction.Amount), 0);
}

function group(source: DesktopInvoice[], keySelector: (row: DesktopInvoice) => string): GroupRow[] {
  const map = new Map<string, GroupRow>();
  source.forEach((invoice) => {
    const key = keySelector(invoice);
    const current = map.get(key) || { key, title: key, count: 0, total: 0 };
    current.count += 1;
    current.total += amount(invoice.Payable);
    map.set(key, current);
  });
  return Array.from(map.values());
}

function chartOptions(title: string): ChartConfiguration["options"] {
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

function createChart(canvas: HTMLCanvasElement | null, config: ChartConfiguration) {
  if (!canvas) return null;
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

  const paymentOptions = chartOptions("ترکیب پرداخت") as any;
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
</script>

<template>
  <div class="dash-shell">
    <div class="dash-toolbar">
      <input class="dash-input" v-model="from" placeholder="از تاریخ" readonly data-jdp />
      <input class="dash-input" v-model="to" placeholder="تا تاریخ" readonly data-jdp />
      <button class="dash-btn primary" :disabled="loading" @click="loadReport">
        {{ loading ? "در حال دریافت" : "اعمال فیلتر" }}
      </button>
    </div>

    <div class="kpi-grid">
      <div class="kpi teal"><span>جمع فروش</span><b>{{ totalSales.toLocaleString() }}</b></div>
      <div class="kpi amber"><span>تعداد فاکتور</span><b>{{ rows.length.toLocaleString() }}</b></div>
      <div class="kpi indigo"><span>میانگین فاکتور</span><b>{{ averageInvoice.toLocaleString() }}</b></div>
      <div class="kpi rose"><span>مالیات و بسته‌بندی</span><b>{{ (totalTax + totalPacking).toLocaleString() }}</b></div>
      <div class="kpi blue"><span>فروش اعتباری</span><b>{{ totalCredit.toLocaleString() }}</b></div>
    </div>

    <div v-if="message" class="dash-message">{{ message }}</div>

    <div class="dash-grid">
      <section class="dash-panel wide">
        <div class="panel-title">روند فروش روزانه</div>
        <div class="chart-box"><canvas ref="dailyCanvas"></canvas></div>
      </section>

      <section class="dash-panel">
        <div class="panel-title">سهم نوع سفارش</div>
        <div class="chart-box"><canvas ref="typeCanvas"></canvas></div>
      </section>

      <section class="dash-panel">
        <div class="panel-title">ترکیب پرداخت</div>
        <div class="chart-box"><canvas ref="paymentCanvas"></canvas></div>
        <div class="payment-breakdown">
          <div v-for="(row, index) in paymentBreakdown" :key="row.key">
            <i :style="{ background: ['#f59e0b', '#3b82f6', '#14b8a6'][index] }"></i>
            <span>{{ row.title }}</span>
            <b>{{ row.total.toLocaleString() }}</b>
          </div>
        </div>
      </section>

      <section class="dash-panel">
        <div class="panel-title">مشتریان برتر</div>
        <div class="rank-list">
          <div v-for="(row, index) in topCustomers" :key="row.key" class="rank-row">
            <i :style="{ background: chartColors[index % chartColors.length] }"></i>
            <span>{{ row.title }}</span>
            <b>{{ row.total.toLocaleString() }}</b>
          </div>
        </div>
      </section>

      <section class="dash-panel wide">
        <div class="panel-title">توزیع فروش بر اساس ساعت</div>
        <div class="chart-box"><canvas ref="hourlyCanvas"></canvas></div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.dash-shell {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dash-toolbar {
  display: grid;
  grid-template-columns: 180px 180px auto;
  justify-content: start;
  gap: 10px;
}

.dash-input,
.dash-btn {
  min-height: 46px;
  border-radius: 8px;
  padding: 9px 11px;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.dash-btn {
  cursor: pointer;
}

.dash-btn.primary {
  font-weight: 900;
  background: rgba(20, 184, 166, 0.18);
  border-color: rgba(20, 184, 166, 0.34);
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(140px, 1fr));
  gap: 10px;
}

.kpi,
.dash-panel,
.dash-message {
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.kpi {
  min-height: 86px;
  display: grid;
  align-content: center;
  gap: 7px;
  padding: 12px;
}

.kpi span,
.panel-title,
.rank-row span {
  color: #a7b0c3;
}

.kpi b {
  color: #eef2ff;
  font-size: 21px;
}

.kpi.teal {
  border-color: rgba(20, 184, 166, 0.28);
}

.kpi.amber {
  border-color: rgba(245, 158, 11, 0.28);
}

.kpi.indigo {
  border-color: rgba(99, 102, 241, 0.28);
}

.kpi.rose {
  border-color: rgba(244, 63, 94, 0.28);
}

.kpi.blue {
  border-color: rgba(59, 130, 246, 0.28);
}

.dash-message {
  padding: 10px 12px;
  color: #fde68a;
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.22);
}

.dash-grid {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  align-content: start;
  gap: 12px;
}

.dash-panel {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dash-panel.wide {
  min-height: 330px;
}

.panel-title {
  font-weight: 900;
  color: #eef2ff;
}

.chart-box {
  position: relative;
  flex: 1;
  min-height: 230px;
}

.rank-list {
  display: grid;
  gap: 9px;
}

.payment-breakdown {
  display: grid;
  gap: 8px;
}

.payment-breakdown div {
  min-height: 34px;
  display: grid;
  grid-template-columns: 12px 1fr auto;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  padding: 7px 9px;
  background: rgba(255, 255, 255, 0.03);
}

.payment-breakdown i {
  width: 11px;
  height: 11px;
  border-radius: 999px;
}

.payment-breakdown span {
  color: #a7b0c3;
}

.rank-row {
  min-height: 38px;
  display: grid;
  grid-template-columns: 14px 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}

.rank-row i {
  width: 12px;
  height: 12px;
  border-radius: 999px;
}

@media (max-width: 1180px) {

  .dash-toolbar,
  .kpi-grid,
  .dash-grid {
    grid-template-columns: 1fr;
  }
}
</style>
