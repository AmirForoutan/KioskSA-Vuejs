<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { can } from "../../../components/acl/can";
import { requestInvoiceEdit } from "../../../components/stores/invoice-edit.store";
import { deleteDesktopInvoice, loadDesktopInvoices, loadDesktopInvoiceItems, printDesktopInvoice, type ApiEnvelope, type DesktopInvoice, type DesktopInvoiceItem } from "../../../services/desktopApi";
import { exportToExcel } from "../../utils/exportExcel";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import { escapeHtml, formatMoney, money, moneyPair, printReceipt, reportRange } from "./receiptPrint";

const props = defineProps<{ fromDate?: string; toDate?: string; query?: string; refreshKey?: number }>();

const loading = ref(false);
const printLoading = ref(false);
const message = ref("");
const rows = ref<DesktopInvoice[]>([]);

useDesktopToastMessage(message);
const editingInvoiceId = ref<number | null>(null);
const deletingInvoiceId = ref<number | null>(null);
const contextMenu = ref<{ x: number; y: number; row: DesktopInvoice } | null>(null);

const canEditInvoices = computed(() => can("reports.invoices.edit"));
const canDeleteInvoices = computed(() => can("reports.invoices.delete"));
const canManageInvoices = computed(() => canEditInvoices.value || canDeleteInvoices.value);

const filtered = computed(() => {
  const s = String(props.query || "").trim();
  if (!s) return rows.value;
  return rows.value.filter((row) => {
    const haystack = `${row.SaleInvoiceNumberDay} ${row.CustomerCode ?? ""} ${row.CustomerName ?? ""} ${row.Phone ?? ""} ${row.InvoiceTypeName ?? ""} ${row.TableTitle ?? ""} ${row.TableCode ?? ""}`;
    return haystack.includes(s);
  });
});

const totalRaw = computed(() => filtered.value.reduce((sum, row) => sum + money(row.Price), 0));
const totalPayable = computed(() => filtered.value.reduce((sum, row) => sum + money(row.Payable), 0));
const totalDiscount = computed(() => filtered.value.reduce((sum, row) => sum + invoiceDiscount(row), 0));
const totalTax = computed(() => filtered.value.reduce((sum, row) => sum + money(row.Tax), 0));
const totalPacking = computed(() => filtered.value.reduce((sum, row) => sum + money(row.PackingPrice), 0));
const totalPos = computed(() => filtered.value.reduce((sum, row) => sum + paymentPart(row, "pos"), 0));
const totalCash = computed(() => filtered.value.reduce((sum, row) => sum + paymentPart(row, "cash"), 0));
const totalCredit = computed(() => filtered.value.reduce((sum, row) => sum + paymentPart(row, "credit"), 0));
const totalRefund = computed(() => filtered.value.reduce((sum, row) => sum + refundAmount(row), 0));
const totalNetPaid = computed(() => filtered.value.reduce((sum, row) => sum + netPaidAmount(row), 0));

onMounted(() => {
  loadReport();
  window.addEventListener("click", closeContextMenu);
});

onBeforeUnmount(() => {
  window.removeEventListener("click", closeContextMenu);
});

watch(() => props.refreshKey, loadReport);

async function loadReport() {
  loading.value = true;
  message.value = "";
  try {
    rows.value = await loadDesktopInvoices({ FromDate: String(props.fromDate || "").trim(), ToDate: String(props.toDate || "").trim() });
    if (!rows.value.length) message.value = "فاکتوری برای این بازه پیدا نشد";
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در دریافت گزارش فروش";
    rows.value = [];
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
  const hasReceiptData = Boolean(row.HasFinancialReceipts ?? row.hasFinancialReceipts) || optionalAmount(row, "ReceivedAmount", "receivedAmount") !== null || refundAmount(row) > 0;
  if (pos + cash + credit === 0 && money(row.Payable) > 0 && !hasReceiptData) return key === "pos" ? money(row.Payable) : 0;
  if (key === "cash") return cash;
  if (key === "credit") return credit;
  return pos;
}

function refundAmount(row: DesktopInvoice) {
  return optionalAmount(row, "RefundAmount", "refundAmount") ?? 0;
}

function receivedAmount(row: DesktopInvoice) {
  const explicit = optionalAmount(row, "ReceivedAmount", "receivedAmount");
  if (explicit !== null) return explicit;
  return paymentPart(row, "cash") + paymentPart(row, "pos") + paymentPart(row, "credit");
}

function netPaidAmount(row: DesktopInvoice) {
  const explicit = optionalAmount(row, "NetPaidAmount", "netPaidAmount");
  if (explicit !== null) return explicit;
  return Math.max(0, receivedAmount(row) - refundAmount(row));
}

function responseIsOk(response: ApiEnvelope) {
  return response.status === true || response.status === "ok" || response.status === undefined;
}

async function startEdit(row: DesktopInvoice) {
  if (!canEditInvoices.value) return;
  editingInvoiceId.value = row.SaleInvoiceId;
  message.value = "";
  try {
    const items = await loadDesktopInvoiceItems(row.SaleInvoiceId);
    requestInvoiceEdit(row, items);
    message.value = "فاکتور برای ویرایش در سفارشگیری باز شد";
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در آماده‌سازی فاکتور برای ویرایش";
  } finally {
    editingInvoiceId.value = null;
  }
}

async function deleteInvoice(row: DesktopInvoice) {
  if (!canDeleteInvoices.value) return;
  const confirmed = window.confirm(`فاکتور شماره ${row.SaleInvoiceNumberDay} حذف شود؟`);
  if (!confirmed) return;
  deletingInvoiceId.value = row.SaleInvoiceId;
  message.value = "";
  try {
    const result = await deleteDesktopInvoice(row.SaleInvoiceId);
    if (!responseIsOk(result)) {
      message.value = result.message || "حذف فاکتور ناموفق بود";
      return;
    }
    rows.value = rows.value.filter((item) => item.SaleInvoiceId !== row.SaleInvoiceId);
    message.value = result.message || "فاکتور حذف شد";
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در حذف فاکتور";
  } finally {
    deletingInvoiceId.value = null;
  }
}

function openContextMenu(event: MouseEvent, row: DesktopInvoice) {
  event.preventDefault();
  contextMenu.value = { x: event.clientX, y: event.clientY, row };
}

function closeContextMenu() {
  contextMenu.value = null;
}

async function printInvoice(row: DesktopInvoice, usage: "customer" | "kitchen") {
  closeContextMenu();
  message.value = "";
  try {
    const result = await printDesktopInvoice(row.SaleInvoiceId, usage);
    message.value = result.message || "فاکتور چاپ شد";
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در چاپ فاکتور";
  }
}

function exportExcel() {
  if (!can("reports.export.excel")) return;
  exportToExcel(filtered.value.map((row) => ({ ...row, Discount: invoiceDiscount(row), CashPrice: paymentPart(row, "cash"), PosPrice: paymentPart(row, "pos"), CreditPrice: paymentPart(row, "credit"), RefundAmount: refundAmount(row), NetPaidAmount: netPaidAmount(row) })), [{ key: "SaleInvoiceNumberDay", title: "شماره روزانه" }, { key: "OrderDate", title: "تاریخ" }, { key: "OrderTime", title: "ساعت ثبت" }, { key: "CustomerName", title: "مشتری فاکتور" }, { key: "Phone", title: "موبایل" }, { key: "InvoiceTypeName", title: "نوع سفارش" }, { key: "Price", title: "جمع خام" }, { key: "Discount", title: "تخفیف" }, { key: "Tax", title: "مالیات" }, { key: "PackingPrice", title: "بسته‌بندی" }, { key: "CashPrice", title: "نقدی" }, { key: "PosPrice", title: "کارتخوان" }, { key: "CreditPrice", title: "اعتباری" }, { key: "RefundAmount", title: "عودت" }, { key: "NetPaidAmount", title: "خالص تسویه" }, { key: "Payable", title: "قابل پرداخت" }], "sales-review");
}

function printSalesSummaryReport() {
  const payments = [moneyPair("نقدی", totalCash.value), moneyPair("کارتخوان", totalPos.value), moneyPair("اعتباری", totalCredit.value), moneyPair("عودت", totalRefund.value), moneyPair("خالص تسویه", totalNetPaid.value)].join("");
  printReceipt("سرجمع فروش و تسویه", reportRange(props.fromDate || "", props.toDate || ""), `<div class="section"><div class="section-title">سرجمع فروش</div>${moneyPair("تعداد فاکتور", filtered.value.length)}${moneyPair("جمع خام", totalRaw.value)}${moneyPair("جمع تخفیف", totalDiscount.value)}${moneyPair("مالیات", totalTax.value)}${moneyPair("بسته‌بندی", totalPacking.value)}${moneyPair("قابل پرداخت", totalPayable.value)}</div><div class="section"><div class="section-title">نحوه تسویه</div>${payments}</div>`);
}

type ItemPrintRow = { goodsKey: string; goodsName: string; quantity: number; total: number };
function normalizeItemForPrint(item: DesktopInvoiceItem): ItemPrintRow {
  const quantity = money(item.Quantity ?? item.Count ?? item.GoodsCount ?? 1);
  const unitPrice = money(item.Price ?? item.GoodsPrice ?? item.ProductPrice);
  const goodsName = String(item.GoodsName || item.ProductTitle || item.ProductName || item.GoodsCode || item.ProductCode || item.GoodsId || "کالای نامشخص");
  const total = money(item.TotalPrice ?? item.Payable ?? item.SumPrice ?? item.SumItem ?? item.GoodsSumItem) || unitPrice * quantity;
  return { goodsKey: String(item.GoodsId || item.ProductId || item.GoodsCode || item.ProductCode || goodsName), goodsName, quantity, total };
}

async function printSalesItemsReport() {
  if (!filtered.value.length || printLoading.value) return;
  printLoading.value = true;
  message.value = "";
  try {
    const nested = await Promise.all(filtered.value.map(async (invoice) => {
      try {
        const items = await loadDesktopInvoiceItems(invoice.SaleInvoiceId);
        return items.map(normalizeItemForPrint);
      } catch {
        return [] as ItemPrintRow[];
      }
    }));
    const map = new Map<string, ItemPrintRow>();
    nested.flat().forEach((line) => {
      const current = map.get(line.goodsKey) || { goodsKey: line.goodsKey, goodsName: line.goodsName, quantity: 0, total: 0 };
      current.quantity += line.quantity;
      current.total += line.total;
      map.set(line.goodsKey, current);
    });
    const items = Array.from(map.values()).sort((a, b) => b.total - a.total);
    const itemRows = items.map((row) => `<tr><td>${escapeHtml(row.goodsName)}</td><td class="num">${formatMoney(row.quantity)}</td><td class="num">${formatMoney(row.total)}</td></tr>`).join("");
    printReceipt("جمع فروش به همراه اقلام", reportRange(props.fromDate || "", props.toDate || ""), `<div class="section"><div class="section-title">سرجمع</div>${moneyPair("جمع فروش", totalPayable.value)}${moneyPair("جمع تخفیف", totalDiscount.value)}${moneyPair("تعداد فاکتور", filtered.value.length)}</div><div class="section"><div class="section-title">گزارش اقلام</div><table><thead><tr><th>کالا</th><th class="num">تعداد</th><th class="num">مبلغ</th></tr></thead><tbody>${itemRows}</tbody></table></div>`);
  } finally {
    printLoading.value = false;
  }
}
</script>

<template>
  <div class="r-shell">
    <div class="r-actions">
      <button v-if="can('reports.export.excel')" class="r-btn" :disabled="!filtered.length" @click="exportExcel">خروجی اکسل</button>
      <button class="r-btn" :disabled="!filtered.length" @click="printSalesSummaryReport">چاپ سرجمع</button>
      <button class="r-btn" :disabled="!filtered.length || printLoading" @click="printSalesItemsReport">{{ printLoading ? "آماده‌سازی" : "چاپ فروش اقلام" }}</button>
    </div>
    <div class="r-summary"><div><span>تعداد فاکتور</span><b>{{ filtered.length.toLocaleString() }}</b></div><div><span>جمع قابل پرداخت</span><b>{{ totalPayable.toLocaleString() }}</b></div><div><span>جمع تخفیف</span><b>{{ totalDiscount.toLocaleString() }}</b></div><div><span>نقدی</span><b>{{ totalCash.toLocaleString() }}</b></div><div><span>کارتخوان</span><b>{{ totalPos.toLocaleString() }}</b></div><div><span>اعتباری</span><b>{{ totalCredit.toLocaleString() }}</b></div><div><span>عودت</span><b>{{ totalRefund.toLocaleString() }}</b></div><div><span>خالص تسویه</span><b>{{ totalNetPaid.toLocaleString() }}</b></div><div><span>جمع مالیات</span><b>{{ totalTax.toLocaleString() }}</b></div></div>
    <div v-if="message" class="r-message">{{ message }}</div>
    <div class="r-table"><div class="r-tr r-th" :class="{ 'has-actions': canManageInvoices }"><div>شماره</div><div>تاریخ</div><div>ساعت</div><div>مشتری</div><div>نوع سفارش</div><div>جمع خام</div><div>تخفیف</div><div>مالیات</div><div>بسته‌بندی</div><div>نقدی</div><div>کارتخوان</div><div>اعتباری</div><div>عودت</div><div>خالص تسویه</div><div>آخرین ویرایش</div><div>قابل پرداخت</div><div v-if="canManageInvoices">عملیات</div></div><div v-if="loading" class="r-empty">در حال بارگذاری...</div><div class="r-tr" :class="{ 'has-actions': canManageInvoices }" v-for="row in filtered" :key="row.SaleInvoiceId" @contextmenu="openContextMenu($event, row)"><div class="bold">{{ row.SaleInvoiceNumberDay }}</div><div>{{ row.OrderDate }}</div><div>{{ row.OrderTime }}</div><div class="customer-cell"><span class="bold">{{ row.CustomerName || "بدون مشتری" }}</span><small v-if="row.Phone"> - {{ row.Phone }}</small></div><div>{{ row.InvoiceTypeName }}</div><div>{{ money(row.Price).toLocaleString() }}</div><div class="pay discount">{{ invoiceDiscount(row).toLocaleString() }}</div><div>{{ money(row.Tax).toLocaleString() }}</div><div>{{ money(row.PackingPrice).toLocaleString() }}</div><div class="pay cash">{{ paymentPart(row, "cash").toLocaleString() }}</div><div class="pay pos">{{ paymentPart(row, "pos").toLocaleString() }}</div><div class="pay credit">{{ paymentPart(row, "credit").toLocaleString() }}</div><div class="pay refund">{{ refundAmount(row).toLocaleString() }}</div><div class="pay net">{{ netPaidAmount(row).toLocaleString() }}</div><div>{{ row.LastModifyDate }}</div><div class="bold">{{ money(row.Payable).toLocaleString() }}</div><div v-if="canManageInvoices" class="row-actions"><button v-if="canEditInvoices" class="r-mini" :disabled="editingInvoiceId === row.SaleInvoiceId" @click="startEdit(row)">{{ editingInvoiceId === row.SaleInvoiceId ? "..." : "ویرایش" }}</button><button v-if="canDeleteInvoices" class="r-mini danger" :disabled="deletingInvoiceId === row.SaleInvoiceId" @click="deleteInvoice(row)">{{ deletingInvoiceId === row.SaleInvoiceId ? "..." : "حذف" }}</button></div></div></div>
    <div v-if="contextMenu" class="row-context-menu" :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }"><button @click="printInvoice(contextMenu.row, 'kitchen')">چاپ آشپزخانه</button><button @click="printInvoice(contextMenu.row, 'customer')">چاپ مشتری</button></div>
  </div>
</template>

<style scoped>
.r-shell { height: 100%; min-height: 0; display: flex; flex-direction: column; gap: 12px; }
.r-actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.r-btn { min-height: 42px; border-radius: 8px; padding: 8px 11px; font-size: 14px; color: #eef2ff; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1); cursor: pointer; white-space: nowrap; } .r-btn:disabled { cursor: not-allowed; opacity: .55; }
.r-summary { display: grid; grid-template-columns: repeat(9, minmax(130px,1fr)); gap: 10px; } .r-summary div, .r-message, .r-empty { border-radius: 8px; padding: 10px 12px; background: rgba(255,255,255,.035); border: 1px solid rgba(255,255,255,.08); } .r-summary span { color: #a7b0c3; margin-left: 8px; } .r-message { color: #fde68a; background: rgba(245,158,11,.12); border-color: rgba(245,158,11,.22); }
.r-table { flex: 1; min-height: 0; overflow: auto; border-radius: 8px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.02); } .r-tr { display: grid; grid-template-columns: 80px 108px 88px minmax(190px,1.4fr) 110px 110px 100px 100px 100px 100px 110px 100px 100px 120px 120px 130px; min-width: 1880px; gap: 10px; align-items: center; padding: 11px 12px; border-bottom: 1px solid rgba(255,255,255,.06); } .r-tr.has-actions { grid-template-columns: 80px 108px 88px minmax(190px,1.4fr) 110px 110px 100px 100px 100px 100px 110px 100px 100px 120px 120px 130px 130px; min-width: 2020px; } .r-tr>div { min-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .r-tr>.row-actions { overflow: visible; } .r-th { font-weight: 900; color: #a7b0c3; background: rgba(16,19,26,.96); position: sticky; top: 0; z-index: 2; }
.bold { font-weight: 800; } small, .customer-cell small { color: #a7b0c3; } .pay { font-weight: 900; } .pay.cash { color: #fde68a; } .pay.pos { color: #bfdbfe; } .pay.discount { color: #fca5a5; } .pay.credit { color: #ccfbf1; } .pay.refund { color: #fecaca; } .pay.net { color: #bbf7d0; } .row-actions { display: flex; gap: 6px; } .r-mini { min-height: 34px; border-radius: 8px; padding: 6px 9px; color: #eef2ff; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1); cursor: pointer; } .r-mini.danger { color: #fecaca; background: rgba(239,68,68,.1); border-color: rgba(239,68,68,.22); } .r-mini:disabled { cursor: not-allowed; opacity: .55; }
.row-context-menu { position: fixed; z-index: 120; width: 180px; display: grid; padding: 6px; border-radius: 8px; background: #171b24; border: 1px solid rgba(255,255,255,.12); box-shadow: 0 18px 50px rgba(0,0,0,.4); } .row-context-menu button { min-height: 38px; text-align: right; color: #eef2ff; background: transparent; border: 0; border-radius: 8px; padding: 8px; cursor: pointer; } .row-context-menu button:hover { background: rgba(255,255,255,.06); }
@media (max-width:1180px) { .r-summary { grid-template-columns: repeat(3,minmax(0,1fr)); } }
</style>
