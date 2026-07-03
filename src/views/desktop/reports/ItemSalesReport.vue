<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { can } from "../../../components/acl/can";
import { loadDesktopInvoiceItems, loadDesktopInvoices, type DesktopInvoice, type DesktopInvoiceItem } from "../../../services/desktopApi";
import { exportToExcel } from "../../utils/exportExcel";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import { escapeHtml, formatMoney, money, moneyPair, printReceipt, reportRange } from "./receiptPrint";

type Mode = "summary" | "date" | "invoice";
type ItemLine = { invoiceId: number; invoiceNo: number; date: string; customer: string; phone: string; goodsKey: string; goodsName: string; quantity: number; total: number };
type TableRow = Record<string, string | number>;

const props = defineProps<{ fromDate?: string; toDate?: string; query?: string; refreshKey?: number }>();

const modes = [
  { key: "summary", title: "سرجمع اقلام" },
  { key: "date", title: "تفکیک تاریخی" },
  { key: "invoice", title: "تفکیک فاکتور" },
] as const;

const activeMode = ref<Mode>("summary");
const loading = ref(false);
const message = ref("");
const invoices = ref<DesktopInvoice[]>([]);
const lines = ref<ItemLine[]>([]);

useDesktopToastMessage(message);

const filteredLines = computed(() => {
  const s = String(props.query || "").trim();
  if (!s) return lines.value;
  return lines.value.filter((row) => `${row.goodsName} ${row.customer} ${row.phone} ${row.invoiceNo} ${row.date}`.includes(s));
});

const summaryRows = computed<TableRow[]>(() => {
  const map = new Map<string, TableRow>();
  filteredLines.value.forEach((line) => {
    const current = map.get(line.goodsKey) || { goodsName: line.goodsName, quantity: 0, invoiceCount: 0, total: 0 };
    current.quantity = Number(current.quantity) + line.quantity;
    current.total = Number(current.total) + line.total;
    current.invoiceCount = Number(current.invoiceCount) + 1;
    map.set(line.goodsKey, current);
  });
  return Array.from(map.values()).sort((a, b) => Number(b.total) - Number(a.total));
});

const dateRows = computed<TableRow[]>(() => {
  const map = new Map<string, TableRow>();
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

const invoiceRows = computed<TableRow[]>(() => filteredLines.value.map((line) => ({ invoiceNo: line.invoiceNo, date: line.date, customer: line.customer || "بدون مشتری", goodsName: line.goodsName, quantity: line.quantity, total: line.total })));
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
      } catch {
        return [] as ItemLine[];
      }
    }));
    lines.value = allItems.flat();
    if (!lines.value.length) message.value = "سرویس اقلام فاکتور داده‌ای برنگرداند؛ برای این گزارش endpoint /getinvoiceitems باید آیتم‌های هر فاکتور را برگرداند";
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در دریافت گزارش فروش اقلام";
  } finally {
    loading.value = false;
  }
}

function normalizeItem(invoice: DesktopInvoice, item: DesktopInvoiceItem): ItemLine {
  const quantity = money(item.Quantity ?? item.Count ?? item.GoodsCount ?? 1);
  const unitPrice = money(item.Price ?? item.GoodsPrice ?? item.ProductPrice);
  const total = money(item.TotalPrice ?? item.Payable ?? item.SumPrice ?? item.SumItem ?? item.GoodsSumItem) || unitPrice * quantity;
  const goodsName = String(item.GoodsName || item.ProductTitle || item.ProductName || item.GoodsCode || item.ProductCode || item.GoodsId || "کالای نامشخص");
  return { invoiceId: invoice.SaleInvoiceId, invoiceNo: invoice.SaleInvoiceNumberDay, date: invoice.OrderDate, customer: invoice.CustomerName || "", phone: invoice.Phone || "", goodsKey: String(item.GoodsId || item.ProductId || item.GoodsCode || item.ProductCode || goodsName), goodsName, quantity, total };
}

function exportExcel() {
  if (!can("reports.export.excel")) return;
  const columns = activeMode.value === "invoice"
    ? [{ key: "invoiceNo", title: "شماره فاکتور" }, { key: "date", title: "تاریخ" }, { key: "customer", title: "مشتری" }, { key: "goodsName", title: "کالا" }, { key: "quantity", title: "تعداد" }, { key: "total", title: "مبلغ" }]
    : activeMode.value === "date"
      ? [{ key: "date", title: "تاریخ" }, { key: "goodsName", title: "کالا" }, { key: "quantity", title: "تعداد" }, { key: "invoiceCount", title: "تعداد ردیف فاکتور" }, { key: "total", title: "مبلغ" }]
      : [{ key: "goodsName", title: "کالا" }, { key: "quantity", title: "تعداد" }, { key: "invoiceCount", title: "تعداد ردیف فاکتور" }, { key: "total", title: "مبلغ" }];
  exportToExcel(activeRows.value, columns as any, `item-sales-${activeMode.value}`);
}

function printItemReport() {
  const rowsHtml = activeRows.value.map((row) => {
    if (activeMode.value === "invoice") return `<tr><td>${escapeHtml(row.invoiceNo)}</td><td>${escapeHtml(row.goodsName)}</td><td class="num">${formatMoney(row.quantity)}</td><td class="num">${formatMoney(row.total)}</td></tr>`;
    if (activeMode.value === "date") return `<tr><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.goodsName)}</td><td class="num">${formatMoney(row.quantity)}</td><td class="num">${formatMoney(row.total)}</td></tr>`;
    return `<tr><td>${escapeHtml(row.goodsName)}</td><td class="num">${formatMoney(row.quantity)}</td><td class="num">${formatMoney(row.total)}</td></tr>`;
  }).join("");
  const headers = activeMode.value === "invoice" ? "<tr><th>فاکتور</th><th>کالا</th><th class=\"num\">تعداد</th><th class=\"num\">مبلغ</th></tr>" : activeMode.value === "date" ? "<tr><th>تاریخ</th><th>کالا</th><th class=\"num\">تعداد</th><th class=\"num\">مبلغ</th></tr>" : "<tr><th>کالا</th><th class=\"num\">تعداد</th><th class=\"num\">مبلغ</th></tr>";
  printReceipt("گزارش فروش اقلام", reportRange(props.fromDate || "", props.toDate || ""), `<div class="section"><div class="section-title">سرجمع</div>${moneyPair("جمع فروش اقلام", totalItemsSale.value)}${moneyPair("تعداد اقلام", totalQuantity.value)}${moneyPair("ردیف آیتم", filteredLines.value.length)}</div><div class="section"><div class="section-title">${escapeHtml(modes.find((m) => m.key === activeMode.value)?.title || "گزارش")}</div><table><thead>${headers}</thead><tbody>${rowsHtml}</tbody></table></div>`);
}
</script>

<template>
  <div class="ir-shell">
    <div class="ir-actions">
      <button v-if="can('reports.export.excel')" class="ir-btn" :disabled="!activeRows.length" @click="exportExcel">خروجی اکسل</button>
      <button class="ir-btn" :disabled="!activeRows.length" @click="printItemReport">چاپ گزارش</button>
    </div>
    <div class="ir-tabs"><button v-for="mode in modes" :key="mode.key" :class="{ active: activeMode === mode.key }" @click="activeMode = mode.key">{{ mode.title }}</button></div>
    <div class="ir-summary"><div><span>جمع فروش اقلام</span><b>{{ totalItemsSale.toLocaleString() }}</b></div><div><span>تعداد اقلام فروخته شده</span><b>{{ totalQuantity.toLocaleString() }}</b></div><div><span>ردیف آیتم</span><b>{{ filteredLines.length.toLocaleString() }}</b></div></div>
    <div v-if="message" class="ir-message">{{ message }}</div>
    <div v-if="topItems.length" class="item-bars"><div v-for="row in topItems" :key="String(row.goodsName)" class="item-bar"><span>{{ row.goodsName }}</span><div><i :style="{ width: `${Math.max(8, (Number(row.total) / maxItemTotal) * 100)}%` }"></i></div><b>{{ Number(row.total).toLocaleString() }}</b></div></div>
    <div class="ir-table">
      <div v-if="activeMode === 'summary'" class="ir-tr summary ir-th"><div>کالا</div><div>تعداد</div><div>ردیف فاکتور</div><div>مبلغ</div></div>
      <div v-else-if="activeMode === 'date'" class="ir-tr date ir-th"><div>تاریخ</div><div>کالا</div><div>تعداد</div><div>ردیف فاکتور</div><div>مبلغ</div></div>
      <div v-else class="ir-tr invoice ir-th"><div>فاکتور</div><div>تاریخ</div><div>مشتری</div><div>کالا</div><div>تعداد</div><div>مبلغ</div></div>
      <div v-if="loading" class="ir-empty">در حال بارگذاری...</div>
      <template v-if="activeMode === 'summary'"><div v-for="row in summaryRows" :key="String(row.goodsName)" class="ir-tr summary"><div class="bold">{{ row.goodsName }}</div><div>{{ Number(row.quantity).toLocaleString() }}</div><div>{{ Number(row.invoiceCount).toLocaleString() }}</div><div class="bold">{{ Number(row.total).toLocaleString() }}</div></div></template>
      <template v-else-if="activeMode === 'date'"><div v-for="row in dateRows" :key="`${row.date}-${row.goodsName}`" class="ir-tr date"><div>{{ row.date }}</div><div class="bold">{{ row.goodsName }}</div><div>{{ Number(row.quantity).toLocaleString() }}</div><div>{{ Number(row.invoiceCount).toLocaleString() }}</div><div class="bold">{{ Number(row.total).toLocaleString() }}</div></div></template>
      <template v-else><div v-for="row in invoiceRows" :key="`${row.invoiceNo}-${row.goodsName}`" class="ir-tr invoice"><div class="bold">{{ row.invoiceNo }}</div><div>{{ row.date }}</div><div>{{ row.customer }}</div><div class="bold">{{ row.goodsName }}</div><div>{{ Number(row.quantity).toLocaleString() }}</div><div class="bold">{{ Number(row.total).toLocaleString() }}</div></div></template>
    </div>
  </div>
</template>

<style scoped>
.ir-shell { height: 100%; min-height: 0; display: flex; flex-direction: column; gap: 12px; }
.ir-actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.ir-btn { min-height: 42px; border-radius: 8px; padding: 8px 11px; color: #eef2ff; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1); cursor: pointer; white-space: nowrap; } .ir-btn:disabled { cursor: not-allowed; opacity: .55; }
.ir-tabs { display: flex; gap: 8px; } .ir-tabs button { min-height: 42px; border-radius: 8px; color: #eef2ff; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); cursor: pointer; padding: 8px 12px; } .ir-tabs button.active { font-weight: 900; background: rgba(20,184,166,.18); border-color: rgba(20,184,166,.34); }
.ir-summary { display: grid; grid-template-columns: repeat(3,minmax(160px,1fr)); gap: 10px; } .ir-summary div, .ir-message, .ir-empty, .item-bars { border-radius: 8px; padding: 10px 12px; background: rgba(255,255,255,.035); border: 1px solid rgba(255,255,255,.08); } .ir-summary span { color: #a7b0c3; margin-left: 8px; }
.ir-message { color: #fde68a; background: rgba(245,158,11,.12); border-color: rgba(245,158,11,.22); }
.item-bars { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px 14px; } .item-bar { display: grid; grid-template-columns: minmax(130px,1fr) 1.4fr 110px; gap: 10px; align-items: center; } .item-bar span { color: #a7b0c3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .item-bar div { height: 10px; border-radius: 999px; background: rgba(255,255,255,.055); overflow: hidden; } .item-bar i { height: 100%; display: block; border-radius: 999px; background: linear-gradient(90deg,#14b8a6,#f59e0b); }
.ir-table { flex: 1; min-height: 0; overflow: auto; border-radius: 8px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.02); } .ir-tr { display: grid; gap: 10px; align-items: center; padding: 11px 12px; border-bottom: 1px solid rgba(255,255,255,.06); } .ir-tr.summary { grid-template-columns: 1.6fr 120px 120px 140px; } .ir-tr.date { grid-template-columns: 120px 1.6fr 120px 120px 140px; } .ir-tr.invoice { grid-template-columns: 90px 120px 1.2fr 1.6fr 100px 140px; }
.ir-th { position: sticky; top: 0; z-index: 2; font-weight: 900; color: #a7b0c3; background: rgba(16,19,26,.96); } .bold { font-weight: 900; }
</style>
