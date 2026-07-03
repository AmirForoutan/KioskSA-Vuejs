<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { can } from "../../../components/acl/can";
import { loadDesktopCreditTransactions, type DesktopCreditTransaction } from "../../../services/desktopApi";
import { exportToExcel } from "../../utils/exportExcel";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import { escapeHtml, formatMoney, money, moneyPair, printReceipt, reportRange } from "./receiptPrint";

const props = defineProps<{ fromDate?: string; toDate?: string; query?: string; refreshKey?: number }>();

const loading = ref(false);
const message = ref("");
const rows = ref<DesktopCreditTransaction[]>([]);

useDesktopToastMessage(message);

const filtered = computed(() => {
  const s = String(props.query || "").trim();
  if (!s) return rows.value;
  return rows.value.filter((row) => `${row.TransactionId} ${row.CustomerId ?? ""} ${row.CustomerName ?? ""} ${row.Phone ?? ""} ${row.TransactionTypeName ?? ""} ${row.Description ?? ""} ${row.InvoiceNumber ?? ""}`.includes(s));
});

const increaseTotal = computed(() => sumByType([1]));
const creditUseTotal = computed(() => sumByType([2]));
const cashReceiptTotal = computed(() => sumByType([3]));
const refundTotal = computed(() => sumByType([4]));

onMounted(loadReport);
watch(() => props.refreshKey, loadReport);

async function loadReport() {
  loading.value = true;
  message.value = "";
  try {
    rows.value = await loadDesktopCreditTransactions({ FromDate: String(props.fromDate || "").trim(), ToDate: String(props.toDate || "").trim() });
    if (!rows.value.length) message.value = "رسید مالی برای این بازه پیدا نشد";
  } catch (error) {
    rows.value = [];
    message.value = error instanceof Error ? error.message : "خطا در دریافت رسیدهای مالی";
  } finally {
    loading.value = false;
  }
}

function sumByType(types: number[]) {
  return filtered.value.filter((row) => types.includes(Number(row.TransactionType))).reduce((sum, row) => sum + money(row.Amount), 0);
}

function exportExcel() {
  if (!can("reports.export.excel")) return;
  exportToExcel(filtered.value, [{ key: "TransactionId", title: "شماره رسید" }, { key: "TransactionDate", title: "تاریخ رسید" }, { key: "CustomerName", title: "مشتری" }, { key: "Phone", title: "موبایل" }, { key: "TransactionTypeName", title: "نوع رسید" }, { key: "Amount", title: "مبلغ" }, { key: "InvoiceNumber", title: "فاکتور" }, { key: "InvoiceDate", title: "تاریخ فاکتور" }, { key: "Description", title: "توضیحات" }], "credit-receipts");
}

function printCreditReceiptsReport() {
  const rowsHtml = filtered.value.map((row) => `<tr><td>${escapeHtml(row.TransactionId)}</td><td>${escapeHtml(row.TransactionTypeName)}</td><td>${escapeHtml(row.CustomerName || "-")}</td><td class="num">${formatMoney(row.Amount)}</td></tr>`).join("");
  printReceipt("رسیدهای اعتبار", reportRange(props.fromDate || "", props.toDate || ""), `<div class="section"><div class="section-title">سرجمع رسیدها</div>${moneyPair("افزایش اعتبار", increaseTotal.value)}${moneyPair("مصرف اعتبار", creditUseTotal.value)}${moneyPair("پرداخت نقدی", cashReceiptTotal.value)}${moneyPair("عودت", refundTotal.value)}${moneyPair("تعداد رسید", filtered.value.length)}</div><div class="section"><div class="section-title">رسیدها</div><table><thead><tr><th>#</th><th>نوع</th><th>مشتری</th><th class="num">مبلغ</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>`);
}
</script>

<template>
  <div class="cr-shell">
    <div class="cr-actions">
      <button v-if="can('reports.export.excel')" class="cr-btn" :disabled="!filtered.length" @click="exportExcel">خروجی اکسل</button>
      <button class="cr-btn" :disabled="!filtered.length" @click="printCreditReceiptsReport">چاپ گزارش</button>
    </div>
    <div class="cr-summary"><div class="green"><span>افزایش اعتبار</span><b>{{ increaseTotal.toLocaleString() }}</b></div><div class="blue"><span>مصرف اعتبار</span><b>{{ creditUseTotal.toLocaleString() }}</b></div><div class="amber"><span>پرداخت نقدی</span><b>{{ cashReceiptTotal.toLocaleString() }}</b></div><div class="rose"><span>عودت</span><b>{{ refundTotal.toLocaleString() }}</b></div></div>
    <div v-if="message" class="cr-message">{{ message }}</div>
    <div class="cr-table"><div class="cr-tr cr-th"><div>رسید</div><div>تاریخ</div><div>مشتری</div><div>موبایل</div><div>نوع</div><div>مبلغ</div><div>فاکتور</div><div>توضیحات</div></div><div v-if="loading" class="cr-empty">در حال بارگذاری...</div><div class="cr-tr" v-for="row in filtered" :key="row.TransactionId"><div class="bold">{{ row.TransactionId }}</div><div>{{ row.TransactionDate }}</div><div class="bold">{{ row.CustomerName || "بدون مشتری" }}</div><div>{{ row.Phone || "-" }}</div><div><span class="type-pill" :class="`t-${row.TransactionType}`">{{ row.TransactionTypeName }}</span></div><div class="bold">{{ money(row.Amount).toLocaleString() }}</div><div>{{ row.InvoiceNumber || "-" }}</div><div>{{ row.Description || "-" }}</div></div></div>
  </div>
</template>

<style scoped>
.cr-shell { height: 100%; min-height: 0; display: flex; flex-direction: column; gap: 12px; }
.cr-actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.cr-btn { min-height: 42px; border-radius: 8px; padding: 8px 11px; color: #eef2ff; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1); cursor: pointer; white-space: nowrap; }
.cr-btn:disabled { cursor: not-allowed; opacity: .55; }
.cr-summary { display: grid; grid-template-columns: repeat(4,minmax(140px,1fr)); gap: 10px; } .cr-summary div, .cr-message, .cr-empty { border-radius: 8px; padding: 10px 12px; background: rgba(255,255,255,.035); border: 1px solid rgba(255,255,255,.08); } .cr-summary span { color: #a7b0c3; margin-left: 8px; } .cr-summary b { color: #eef2ff; } .cr-summary .green { border-color: rgba(34,197,94,.28); } .cr-summary .blue { border-color: rgba(59,130,246,.28); } .cr-summary .amber { border-color: rgba(245,158,11,.28); } .cr-summary .rose { border-color: rgba(244,63,94,.28); }
.cr-message { color: #fde68a; background: rgba(245,158,11,.12); border-color: rgba(245,158,11,.22); }
.cr-table { flex: 1; min-height: 0; overflow: auto; border-radius: 8px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.02); } .cr-tr { display: grid; grid-template-columns: 80px 150px minmax(160px,1fr) 130px 120px 130px 90px minmax(180px,1.2fr); min-width: 1120px; gap: 10px; align-items: center; padding: 11px 12px; border-bottom: 1px solid rgba(255,255,255,.06); } .cr-tr>div { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .cr-th { position: sticky; top: 0; z-index: 2; font-weight: 900; color: #a7b0c3; background: rgba(16,19,26,.96); } .bold { font-weight: 900; }
.type-pill { display: inline-flex; min-height: 28px; align-items: center; border-radius: 999px; padding: 3px 9px; color: #eef2ff; background: rgba(148,163,184,.16); } .type-pill.t-1 { background: rgba(34,197,94,.22); color: #bbf7d0; } .type-pill.t-2 { background: rgba(59,130,246,.22); color: #bfdbfe; } .type-pill.t-3 { background: rgba(245,158,11,.22); color: #fde68a; } .type-pill.t-4 { background: rgba(244,63,94,.22); color: #fecdd3; }
@media (max-width:1180px) { .cr-summary { grid-template-columns: repeat(2,minmax(0,1fr)); } }
</style>
