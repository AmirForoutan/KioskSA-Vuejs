<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
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
import { escapeHtml, formatMoney, money, moneyPair, printReceipt, reportRange } from "./receiptPrint";

type GroupRow = { key: string; title: string; count: number; total: number };

const from = ref("");
const to = ref("");
const loading = ref(false);
const message = ref("");
const rows = ref<DesktopInvoice[]>([]);
const creditTransactions = ref<DesktopCreditTransaction[]>([]);

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
const paymentBreakdown = computed<GroupRow[]>(() => [
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
  return creditTransactions.value
    .filter((transaction) => Number(transaction.TransactionType) === 2 && Number(transaction.InvoiceId || 0) === Number(row.SaleInvoiceId))
    .reduce((sum, transaction) => sum + money(transaction.Amount), 0);
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
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function printDashboardReport() {
  const range = reportRange(from.value, to.value);
  const payments = paymentBreakdown.value.map((row) => moneyPair(row.title, row.total)).join("");
  const types = invoiceTypes.value.map((row) => `<tr><td>${escapeHtml(row.title)}</td><td class="num">${row.count.toLocaleString("fa-IR")}</td><td class="num">${formatMoney(row.total)}</td></tr>`).join("");
  const days = dailySales.value.map((row) => `<tr><td>${escapeHtml(row.title)}</td><td class="num">${row.count.toLocaleString("fa-IR")}</td><td class="num">${formatMoney(row.total)}</td></tr>`).join("");

  printReceipt(
    "داشبورد فروش",
    range,
    `<div class="section"><div class="section-title">سرجمع فروش</div>
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
    <div class="section"><div class="section-title">فروش روزانه</div><table><thead><tr><th>تاریخ</th><th class="num">تعداد</th><th class="num">مبلغ</th></tr></thead><tbody>${days}</tbody></table></div>`
  );
}
</script>

<template>
  <div class="dash-shell">
    <div class="dash-toolbar">
      <input class="dash-input" v-model="from" placeholder="از تاریخ" readonly data-jdp />
      <input class="dash-input" v-model="to" placeholder="تا تاریخ" readonly data-jdp />
      <button class="dash-btn primary" :disabled="loading" @click="loadReport">{{ loading ? "در حال دریافت" : "اعمال فیلتر" }}</button>
      <button class="dash-btn" :disabled="!rows.length" @click="printDashboardReport">چاپ گزارش</button>
    </div>

    <div class="kpi-grid">
      <div class="kpi teal"><span>جمع فروش</span><b>{{ totalSales.toLocaleString() }}</b></div>
      <div class="kpi red"><span>جمع تخفیف</span><b>{{ totalDiscount.toLocaleString() }}</b></div>
      <div class="kpi amber"><span>تعداد فاکتور</span><b>{{ rows.length.toLocaleString() }}</b></div>
      <div class="kpi indigo"><span>میانگین فاکتور</span><b>{{ averageInvoice.toLocaleString() }}</b></div>
      <div class="kpi rose"><span>مالیات و بسته‌بندی</span><b>{{ (totalTax + totalPacking).toLocaleString() }}</b></div>
      <div class="kpi blue"><span>فروش اعتباری</span><b>{{ totalCredit.toLocaleString() }}</b></div>
    </div>

    <div v-if="message" class="dash-message">{{ message }}</div>

    <div class="dash-grid">
      <section class="dash-panel">
        <div class="panel-title">نحوه تسویه</div>
        <div class="list-row" v-for="row in paymentBreakdown" :key="row.key"><span>{{ row.title }}</span><b>{{ row.total.toLocaleString() }}</b></div>
      </section>
      <section class="dash-panel">
        <div class="panel-title">سهم نوع سفارش</div>
        <div class="list-row" v-for="row in invoiceTypes" :key="row.key"><span>{{ row.title }} ({{ row.count }})</span><b>{{ row.total.toLocaleString() }}</b></div>
      </section>
      <section class="dash-panel">
        <div class="panel-title">مشتریان برتر</div>
        <div class="list-row" v-for="row in topCustomers" :key="row.key"><span>{{ row.title }}</span><b>{{ row.total.toLocaleString() }}</b></div>
      </section>
      <section class="dash-panel">
        <div class="panel-title">فروش روزانه</div>
        <div class="list-row" v-for="row in dailySales" :key="row.key"><span>{{ row.title }} ({{ row.count }})</span><b>{{ row.total.toLocaleString() }}</b></div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.dash-shell { height: 100%; min-height: 0; display: flex; flex-direction: column; gap: 12px; }
.dash-toolbar { display: grid; grid-template-columns: 180px 180px auto auto; justify-content: start; gap: 10px; }
.dash-input, .dash-btn { min-height: 46px; border-radius: 8px; padding: 9px 11px; color: #eef2ff; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1); }
.dash-btn { cursor: pointer; white-space: nowrap; }
.dash-btn.primary { font-weight: 900; background: rgba(20,184,166,.18); border-color: rgba(20,184,166,.34); }
.dash-btn:disabled { opacity: .55; cursor: not-allowed; }
.kpi-grid { display: grid; grid-template-columns: repeat(6, minmax(130px,1fr)); gap: 10px; }
.kpi, .dash-panel, .dash-message { border-radius: 8px; background: rgba(255,255,255,.035); border: 1px solid rgba(255,255,255,.08); }
.kpi { min-height: 86px; display: grid; align-content: center; gap: 7px; padding: 12px; }
.kpi span, .panel-title, .list-row span { color: #a7b0c3; }
.kpi b { color: #eef2ff; font-size: 21px; }
.kpi.teal { border-color: rgba(20,184,166,.28); } .kpi.red { border-color: rgba(248,113,113,.28); } .kpi.amber { border-color: rgba(245,158,11,.28); } .kpi.indigo { border-color: rgba(99,102,241,.28); } .kpi.rose { border-color: rgba(244,63,94,.28); } .kpi.blue { border-color: rgba(59,130,246,.28); }
.dash-message { padding: 10px 12px; color: #fde68a; background: rgba(245,158,11,.12); border-color: rgba(245,158,11,.22); }
.dash-grid { flex: 1; min-height: 0; overflow: auto; display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); align-content: start; gap: 12px; }
.dash-panel { padding: 14px; display: grid; gap: 8px; align-content: start; }
.panel-title { font-weight: 900; color: #eef2ff; margin-bottom: 4px; }
.list-row { min-height: 38px; display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; padding: 8px 10px; border-radius: 8px; background: rgba(255,255,255,.03); }
.list-row b { color: #eef2ff; }
@media (max-width: 1180px) { .dash-toolbar, .kpi-grid, .dash-grid { grid-template-columns: 1fr; } }
</style>
