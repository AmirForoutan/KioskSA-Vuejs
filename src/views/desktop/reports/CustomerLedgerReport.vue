<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import "@majidh1/jalalidatepicker";
import "@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css";
import { can } from "../../../components/acl/can";
import {
  loadDesktopInvoiceItems,
  loadDesktopInvoices,
  type DesktopInvoice,
  type DesktopInvoiceItem,
} from "../../../services/desktopApi";
import { exportToExcel } from "../../utils/exportExcel";
import { setupJalaliDateInputs } from "../../../utilities";
import { useDesktopToastMessage } from "../useDesktopToastMessage";

type ViewMode = "summary" | "detail";
type CustomerRow = {
  key: string;
  customerCode: number;
  customer: string;
  phone: string;
  invoiceCount: number;
  totalSales: number;
  totalTax: number;
  totalPacking: number;
  totalCash: number;
  totalPos: number;
  totalCredit: number;
  lastDate: string;
  lastTime: string;
  invoices: DesktopInvoice[];
};

type DetailLine = {
  invoiceNo: number;
  date: string;
  goodsKey: string;
  goodsName: string;
  quantity: number;
  total: number;
};

const from = ref("");
const to = ref("");
const q = ref("");
const loading = ref(false);
const detailLoading = ref(false);
const message = ref("");
const detailMessage = ref("");
const rows = ref<CustomerRow[]>([]);

useDesktopToastMessage(message);
useDesktopToastMessage(detailMessage);
const selectedKey = ref("");
const activeView = ref<ViewMode>("summary");
const detailLines = ref<DetailLine[]>([]);

const filtered = computed(() => {
  const s = q.value.trim();
  if (!s) return rows.value;
  return rows.value.filter((row) => `${row.customer} ${row.phone}`.includes(s));
});

const selectedCustomer = computed(() => rows.value.find((row) => row.key === selectedKey.value) || null);
const totalSales = computed(() => filtered.value.reduce((sum, row) => sum + row.totalSales, 0));
const totalCredit = computed(() => filtered.value.reduce((sum, row) => sum + row.totalCredit, 0));

const itemSummary = computed(() => {
  const map = new Map<string, { goodsName: string; quantity: number; total: number; invoiceCount: number }>();
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
    if (!rows.value.length) message.value = "داده‌ای برای این بازه پیدا نشد";
  } catch (error) {
    rows.value = [];
    message.value = error instanceof Error ? error.message : "خطا در دریافت گزارش مشتریان";
  } finally {
    loading.value = false;
  }
}

function customerKey(invoice: DesktopInvoice) {
  const code = Number(invoice.CustomerCode || 0);
  if (code > 1) return `customer-${code}`;

  const phone = String(invoice.Phone || "").trim();
  if (phone) return `phone-${phone}`;

  const name = String(invoice.CustomerName || "unknown").trim().toLowerCase();
  return `name-${name || "unknown"}`;
}

function paymentPart(row: DesktopInvoice, key: "pos" | "cash" | "credit") {
  const pos = amount(row.PosPrice);
  const cash = amount(row.CashPrice);
  const credit = amount(row.CreditPrice);
  if (pos + cash + credit === 0 && amount(row.Payable) > 0) {
    return key === "pos" ? amount(row.Payable) : 0;
  }
  if (key === "cash") return cash;
  if (key === "credit") return credit;
  return pos;
}

function groupByCustomer(invoices: DesktopInvoice[]) {
  const map = new Map<string, CustomerRow>();

  invoices.forEach((invoice) => {
    const key = customerKey(invoice);
    const current =
      map.get(key) ||
      ({
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
      } satisfies CustomerRow);

    if ((!current.customer || current.customer === "بدون مشتری") && invoice.CustomerName) {
      current.customer = invoice.CustomerName;
    }
    if (!current.phone && invoice.Phone) current.phone = invoice.Phone;

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

async function toggleCustomer(row: CustomerRow) {
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

async function loadCustomerDetail(row: CustomerRow) {
  detailLoading.value = true;
  detailMessage.value = "";
  detailLines.value = [];
  try {
    const results = await Promise.all(
      row.invoices.map(async (invoice) => {
        try {
          const items = await loadDesktopInvoiceItems(invoice.SaleInvoiceId);
          return items.map((item) => normalizeItem(invoice, item));
        } catch {
          return [];
        }
      })
    );
    detailLines.value = results.flat();
    if (!detailLines.value.length) {
      detailMessage.value = "سرویس اقلام فاکتور برای این مشتری داده‌ای برنگرداند؛ فهرست فاکتورها پایین نمایش داده شده است";
    }
  } finally {
    detailLoading.value = false;
  }
}

function normalizeItem(invoice: DesktopInvoice, item: DesktopInvoiceItem): DetailLine {
  const quantity = amount(item.Quantity ?? item.Count ?? item.GoodsCount ?? 1);
  const unitPrice = amount(item.Price ?? item.GoodsPrice ?? item.ProductPrice);
  const total = amount(item.TotalPrice ?? item.Payable ?? item.SumPrice ?? item.SumItem ?? item.GoodsSumItem) || unitPrice * quantity;
  const goodsName = String(
    item.GoodsName || item.ProductTitle || item.ProductName || item.GoodsCode || item.ProductCode || item.GoodsId || "کالای نامشخص"
  );
  return {
    invoiceNo: invoice.SaleInvoiceNumberDay,
    date: invoice.OrderDate,
    goodsKey: String(item.GoodsId || item.ProductId || item.GoodsCode || item.ProductCode || goodsName),
    goodsName,
    quantity,
    total,
  };
}

function amount(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function exportExcel() {
  if (!can("reports.export.excel")) return;

  if (activeView.value === "detail" && selectedCustomer.value) {
    exportToExcel(
      detailLines.value,
      [
        { key: "invoiceNo", title: "شماره فاکتور" },
        { key: "date", title: "تاریخ" },
        { key: "goodsName", title: "کالا" },
        { key: "quantity", title: "تعداد" },
        { key: "total", title: "مبلغ" },
      ],
      `customer-detail-${selectedCustomer.value.customerCode || selectedCustomer.value.phone || "selected"}`
    );
    return;
  }

  exportToExcel(
    filtered.value,
    [
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
    ],
    "customer-ledger"
  );
}
</script>

<template>
  <div class="cl-shell">
    <div class="cl-toolbar">
      <input class="cl-input" v-model="q" placeholder="جستجوی مشتری یا موبایل..." />
      <input class="cl-input" v-model="from" placeholder="از تاریخ" readonly data-jdp />
      <input class="cl-input" v-model="to" placeholder="تا تاریخ" readonly data-jdp />
      <button class="cl-btn primary" :disabled="loading" @click="loadReport">
        {{ loading ? "در حال دریافت" : "اعمال فیلتر" }}
      </button>
      <button v-if="can('reports.export.excel')" class="cl-btn" :disabled="!filtered.length" @click="exportExcel">
        خروجی اکسل
      </button>
    </div>

    <div class="cl-tabs">
      <button :class="{ active: activeView === 'summary' }" @click="activeView = 'summary'">سرجمع مشتریان</button>
      <button v-if="selectedCustomer" :class="{ active: activeView === 'detail' }" @click="activeView = 'detail'">
        تفکیکی {{ selectedCustomer.customer }}
      </button>
    </div>

    <div class="cl-summary">
      <div><span>تعداد مشتری</span><b>{{ filtered.length.toLocaleString() }}</b></div>
      <div><span>جمع فروش</span><b>{{ totalSales.toLocaleString() }}</b></div>
      <div><span>جمع اعتباری</span><b>{{ totalCredit.toLocaleString() }}</b></div>
      <div v-if="selectedCustomer"><span>مشتری انتخابی</span><b>{{ selectedCustomer.customer }}</b></div>
    </div>

    <div v-if="message" class="cl-message">{{ message }}</div>

    <template v-if="activeView === 'summary'">
      <div class="cl-table">
        <div class="cl-tr summary cl-th">
          <div>انتخاب</div>
          <div>مشتری</div>
          <div>موبایل</div>
          <div>فاکتور</div>
          <div>جمع فروش</div>
          <div>نقدی</div>
          <div>کارتخوان</div>
          <div>اعتباری</div>
          <div>آخرین خرید</div>
        </div>

        <div v-if="loading" class="cl-empty">در حال بارگذاری...</div>

        <div class="cl-tr summary" v-for="row in filtered" :key="row.key">
          <div>
            <input type="checkbox" :checked="selectedKey === row.key" @change="toggleCustomer(row)" />
          </div>
          <div class="bold">{{ row.customer }}</div>
          <div>{{ row.phone || "-" }}</div>
          <div>{{ row.invoiceCount.toLocaleString() }}</div>
          <div class="bold">{{ row.totalSales.toLocaleString() }}</div>
          <div class="pay cash">{{ row.totalCash.toLocaleString() }}</div>
          <div class="pay pos">{{ row.totalPos.toLocaleString() }}</div>
          <div class="pay credit">{{ row.totalCredit.toLocaleString() }}</div>
          <div>{{ row.lastDate }} - {{ row.lastTime }}</div>
        </div>
      </div>
    </template>

    <template v-else-if="selectedCustomer">
      <div class="detail-grid">
        <section class="detail-panel">
          <div class="detail-head">
            <div>
              <div class="detail-title">{{ selectedCustomer.customer }}</div>
              <div class="detail-sub">
                {{ selectedCustomer.invoiceCount.toLocaleString() }} فاکتور،
                {{ selectedCustomer.totalSales.toLocaleString() }} فروش
              </div>
            </div>
            <button class="cl-btn" @click="activeView = 'summary'">برگشت به سرجمع</button>
          </div>

          <div v-if="detailMessage" class="cl-message">{{ detailMessage }}</div>

          <div class="item-summary">
            <div v-for="item in itemSummary" :key="item.goodsName">
              <span>{{ item.goodsName }}</span>
              <b>{{ item.quantity.toLocaleString() }} عدد</b>
              <strong>{{ item.total.toLocaleString() }}</strong>
            </div>
          </div>
        </section>

        <section class="detail-panel">
          <div class="detail-title">فاکتورهای مشتری</div>
          <div class="mini-table">
            <div class="mini-tr mini-th">
              <div>#</div><div>تاریخ</div><div>نوع</div><div>نقدی</div><div>کارتخوان</div><div>اعتباری</div><div>مبلغ</div>
            </div>
            <div v-for="invoice in selectedCustomer.invoices" :key="invoice.SaleInvoiceId" class="mini-tr">
              <div class="bold">{{ invoice.SaleInvoiceNumberDay }}</div>
              <div>{{ invoice.OrderDate }}</div>
              <div>{{ invoice.InvoiceTypeName }}</div>
              <div>{{ paymentPart(invoice, "cash").toLocaleString() }}</div>
              <div>{{ paymentPart(invoice, "pos").toLocaleString() }}</div>
              <div>{{ paymentPart(invoice, "credit").toLocaleString() }}</div>
              <div class="bold">{{ amount(invoice.Payable).toLocaleString() }}</div>
            </div>
          </div>
        </section>
      </div>

      <div class="cl-table">
        <div class="cl-tr detail cl-th">
          <div>فاکتور</div>
          <div>تاریخ</div>
          <div>کالا</div>
          <div>تعداد</div>
          <div>مبلغ</div>
        </div>

        <div v-if="detailLoading" class="cl-empty">در حال دریافت اقلام...</div>

        <div class="cl-tr detail" v-for="line in detailLines" :key="`${line.invoiceNo}-${line.goodsName}`">
          <div class="bold">{{ line.invoiceNo }}</div>
          <div>{{ line.date }}</div>
          <div class="bold">{{ line.goodsName }}</div>
          <div>{{ line.quantity.toLocaleString() }}</div>
          <div class="bold">{{ line.total.toLocaleString() }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.cl-shell {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cl-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1.2fr) minmax(150px, 1fr) minmax(150px, 1fr) auto auto;
  gap: 10px;
}

.cl-input,
.cl-btn {
  min-height: 46px;
  border-radius: 8px;
  padding: 9px 11px;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.cl-btn {
  cursor: pointer;
  white-space: nowrap;
}

.cl-btn.primary,
.cl-tabs button.active {
  font-weight: 900;
  background: rgba(20, 184, 166, 0.18);
  border-color: rgba(20, 184, 166, 0.34);
}

.cl-tabs {
  display: flex;
  gap: 8px;
}

.cl-tabs button {
  min-height: 42px;
  border-radius: 8px;
  padding: 8px 12px;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
}

.cl-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 10px;
}

.cl-summary div,
.cl-message,
.cl-empty,
.detail-panel {
  border-radius: 8px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.cl-summary span,
.detail-sub {
  color: #a7b0c3;
  margin-left: 8px;
}

.cl-message {
  color: #fde68a;
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.22);
}

.cl-table {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
}

.cl-tr {
  display: grid;
  gap: 10px;
  align-items: center;
  padding: 11px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.cl-tr.summary {
  grid-template-columns: 70px minmax(170px, 1.3fr) 120px 90px 125px 105px 105px 105px 170px;
  min-width: 1120px;
}

.cl-tr.detail {
  grid-template-columns: 90px 120px minmax(220px, 1.7fr) 110px 140px;
  min-width: 720px;
}

.cl-th,
.mini-th {
  position: sticky;
  top: 0;
  z-index: 2;
  font-weight: 900;
  color: #a7b0c3;
  background: rgba(16, 19, 26, 0.96);
}

.cl-tr input[type="checkbox"] {
  width: 20px;
  height: 20px;
  accent-color: #14b8a6;
}

.bold {
  font-weight: 900;
}

.pay {
  font-weight: 900;
}

.pay.cash { color: #fde68a; }
.pay.pos { color: #bfdbfe; }
.pay.credit { color: #ccfbf1; }

.detail-grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 12px;
}

.detail-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 180px;
}

.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.detail-title {
  font-weight: 900;
}

.item-summary {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
}

.item-summary div {
  min-height: 58px;
  border-radius: 8px;
  padding: 8px 10px;
  display: grid;
  gap: 3px;
  background: rgba(20, 184, 166, 0.08);
  border: 1px solid rgba(20, 184, 166, 0.18);
}

.item-summary span {
  color: #eef2ff;
  font-weight: 900;
}

.item-summary b,
.item-summary strong {
  color: #a7b0c3;
  font-size: 12px;
}

.mini-table {
  min-height: 0;
  overflow: auto;
}

.mini-tr {
  display: grid;
  grid-template-columns: 60px 95px 80px 95px 95px 95px 110px;
  min-width: 680px;
  gap: 8px;
  padding: 9px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

@media (max-width: 1180px) {
  .cl-toolbar,
  .cl-summary,
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
