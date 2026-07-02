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

type Mode = "summary" | "date" | "invoice";
type ItemLine = {
  invoiceId: number;
  invoiceNo: number;
  date: string;
  customer: string;
  phone: string;
  goodsKey: string;
  goodsName: string;
  quantity: number;
  total: number;
};

type TableRow = Record<string, string | number>;

const modes = [
  { key: "summary", title: "سرجمع اقلام" },
  { key: "date", title: "تفکیک تاریخی" },
  { key: "invoice", title: "تفکیک فاکتور" },
] as const;

const activeMode = ref<Mode>("summary");
const from = ref("");
const to = ref("");
const q = ref("");
const loading = ref(false);
const message = ref("");
const invoices = ref<DesktopInvoice[]>([]);

useDesktopToastMessage(message);
const lines = ref<ItemLine[]>([]);

const filteredLines = computed(() => {
  const s = q.value.trim();
  if (!s) return lines.value;
  return lines.value.filter((row) =>
    `${row.goodsName} ${row.customer} ${row.phone} ${row.invoiceNo} ${row.date}`.includes(s)
  );
});

const summaryRows = computed<TableRow[]>(() => {
  const map = new Map<string, TableRow>();
  filteredLines.value.forEach((line) => {
    const current = map.get(line.goodsKey) || {
      goodsName: line.goodsName,
      quantity: 0,
      invoiceCount: 0,
      total: 0,
    };
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
    const current = map.get(key) || {
      date: line.date,
      goodsName: line.goodsName,
      quantity: 0,
      invoiceCount: 0,
      total: 0,
    };
    current.quantity = Number(current.quantity) + line.quantity;
    current.total = Number(current.total) + line.total;
    current.invoiceCount = Number(current.invoiceCount) + 1;
    map.set(key, current);
  });
  return Array.from(map.values()).sort((a, b) => String(b.date).localeCompare(String(a.date)));
});

const invoiceRows = computed<TableRow[]>(() =>
  filteredLines.value.map((line) => ({
    invoiceNo: line.invoiceNo,
    date: line.date,
    customer: line.customer || "بدون مشتری",
    goodsName: line.goodsName,
    quantity: line.quantity,
    total: line.total,
  }))
);

const activeRows = computed(() => {
  if (activeMode.value === "date") return dateRows.value;
  if (activeMode.value === "invoice") return invoiceRows.value;
  return summaryRows.value;
});

const topItems = computed(() => summaryRows.value.slice(0, 8));
const maxItemTotal = computed(() => Math.max(1, ...topItems.value.map((row) => Number(row.total))));
const totalItemsSale = computed(() => filteredLines.value.reduce((sum, row) => sum + row.total, 0));
const totalQuantity = computed(() => filteredLines.value.reduce((sum, row) => sum + row.quantity, 0));

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
  lines.value = [];
  try {
    invoices.value = await loadDesktopInvoices({ FromDate: from.value.trim(), ToDate: to.value.trim() });
    const allItems = await Promise.all(
      invoices.value.map(async (invoice) => {
        try {
          const items = await loadDesktopInvoiceItems(invoice.SaleInvoiceId);
          return items.map((item) => normalizeItem(invoice, item));
        } catch {
          return [];
        }
      })
    );

    lines.value = allItems.flat();
    if (!lines.value.length) {
      message.value = "سرویس اقلام فاکتور داده‌ای برنگرداند؛ برای این گزارش endpoint /getinvoiceitems باید آیتم‌های هر فاکتور را برگرداند";
    }
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در دریافت گزارش فروش اقلام";
  } finally {
    loading.value = false;
  }
}

function normalizeItem(invoice: DesktopInvoice, item: DesktopInvoiceItem): ItemLine {
  const quantity = amount(item.Quantity ?? item.Count ?? item.GoodsCount ?? 1);
  const unitPrice = amount(item.Price ?? item.GoodsPrice ?? item.ProductPrice);
  const total = amount(item.TotalPrice ?? item.Payable ?? item.SumPrice ?? item.SumItem ?? item.GoodsSumItem) || unitPrice * quantity;
  const goodsName = String(
    item.GoodsName || item.ProductTitle || item.ProductName || item.GoodsCode || item.ProductCode || item.GoodsId || "کالای نامشخص"
  );
  return {
    invoiceId: invoice.SaleInvoiceId,
    invoiceNo: invoice.SaleInvoiceNumberDay,
    date: invoice.OrderDate,
    customer: invoice.CustomerName || "",
    phone: invoice.Phone || "",
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
  const columns =
    activeMode.value === "invoice"
      ? [
          { key: "invoiceNo", title: "شماره فاکتور" },
          { key: "date", title: "تاریخ" },
          { key: "customer", title: "مشتری" },
          { key: "goodsName", title: "کالا" },
          { key: "quantity", title: "تعداد" },
          { key: "total", title: "مبلغ" },
        ]
      : activeMode.value === "date"
        ? [
            { key: "date", title: "تاریخ" },
            { key: "goodsName", title: "کالا" },
            { key: "quantity", title: "تعداد" },
            { key: "invoiceCount", title: "تعداد ردیف فاکتور" },
            { key: "total", title: "مبلغ" },
          ]
        : [
            { key: "goodsName", title: "کالا" },
            { key: "quantity", title: "تعداد" },
            { key: "invoiceCount", title: "تعداد ردیف فاکتور" },
            { key: "total", title: "مبلغ" },
          ];
  exportToExcel(activeRows.value, columns as any, `item-sales-${activeMode.value}`);
}
</script>

<template>
  <div class="ir-shell">
    <div class="ir-toolbar">
      <input class="ir-input" v-model="q" placeholder="جستجوی کالا، مشتری، فاکتور..." />
      <input class="ir-input" v-model="from" placeholder="از تاریخ" readonly data-jdp />
      <input class="ir-input" v-model="to" placeholder="تا تاریخ" readonly data-jdp />
      <button class="ir-btn primary" :disabled="loading" @click="loadReport">{{ loading ? "در حال دریافت" : "اعمال فیلتر" }}</button>
      <button v-if="can('reports.export.excel')" class="ir-btn" :disabled="!activeRows.length" @click="exportExcel">خروجی اکسل</button>
    </div>

    <div class="ir-tabs">
      <button v-for="mode in modes" :key="mode.key" :class="{ active: activeMode === mode.key }" @click="activeMode = mode.key">
        {{ mode.title }}
      </button>
    </div>

    <div class="ir-summary">
      <div><span>جمع فروش اقلام</span><b>{{ totalItemsSale.toLocaleString() }}</b></div>
      <div><span>تعداد اقلام فروخته شده</span><b>{{ totalQuantity.toLocaleString() }}</b></div>
      <div><span>ردیف آیتم</span><b>{{ filteredLines.length.toLocaleString() }}</b></div>
    </div>

    <div v-if="message" class="ir-message">{{ message }}</div>

    <div v-if="topItems.length" class="item-bars">
      <div v-for="row in topItems" :key="String(row.goodsName)" class="item-bar">
        <span>{{ row.goodsName }}</span>
        <div><i :style="{ width: `${Math.max(8, (Number(row.total) / maxItemTotal) * 100)}%` }"></i></div>
        <b>{{ Number(row.total).toLocaleString() }}</b>
      </div>
    </div>

    <div class="ir-table">
      <div v-if="activeMode === 'summary'" class="ir-tr summary ir-th">
        <div>کالا</div><div>تعداد</div><div>ردیف فاکتور</div><div>مبلغ</div>
      </div>
      <div v-else-if="activeMode === 'date'" class="ir-tr date ir-th">
        <div>تاریخ</div><div>کالا</div><div>تعداد</div><div>ردیف فاکتور</div><div>مبلغ</div>
      </div>
      <div v-else class="ir-tr invoice ir-th">
        <div>فاکتور</div><div>تاریخ</div><div>مشتری</div><div>کالا</div><div>تعداد</div><div>مبلغ</div>
      </div>

      <div v-if="loading" class="ir-empty">در حال بارگذاری...</div>

      <template v-if="activeMode === 'summary'">
        <div v-for="row in summaryRows" :key="String(row.goodsName)" class="ir-tr summary">
          <div class="bold">{{ row.goodsName }}</div>
          <div>{{ Number(row.quantity).toLocaleString() }}</div>
          <div>{{ Number(row.invoiceCount).toLocaleString() }}</div>
          <div class="bold">{{ Number(row.total).toLocaleString() }}</div>
        </div>
      </template>

      <template v-else-if="activeMode === 'date'">
        <div v-for="row in dateRows" :key="`${row.date}-${row.goodsName}`" class="ir-tr date">
          <div>{{ row.date }}</div>
          <div class="bold">{{ row.goodsName }}</div>
          <div>{{ Number(row.quantity).toLocaleString() }}</div>
          <div>{{ Number(row.invoiceCount).toLocaleString() }}</div>
          <div class="bold">{{ Number(row.total).toLocaleString() }}</div>
        </div>
      </template>

      <template v-else>
        <div v-for="row in invoiceRows" :key="`${row.invoiceNo}-${row.goodsName}`" class="ir-tr invoice">
          <div class="bold">{{ row.invoiceNo }}</div>
          <div>{{ row.date }}</div>
          <div>{{ row.customer }}</div>
          <div class="bold">{{ row.goodsName }}</div>
          <div>{{ Number(row.quantity).toLocaleString() }}</div>
          <div class="bold">{{ Number(row.total).toLocaleString() }}</div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.ir-shell {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ir-toolbar {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr auto auto;
  gap: 10px;
}

.ir-input,
.ir-btn {
  min-height: 46px;
  border-radius: 8px;
  padding: 9px 11px;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.ir-btn {
  cursor: pointer;
  white-space: nowrap;
}

.ir-btn.primary,
.ir-tabs button.active {
  font-weight: 900;
  background: rgba(20, 184, 166, 0.18);
  border-color: rgba(20, 184, 166, 0.34);
}

.ir-tabs {
  display: flex;
  gap: 8px;
}

.ir-tabs button {
  min-height: 42px;
  border-radius: 8px;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
}

.ir-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, 1fr));
  gap: 10px;
}

.ir-summary div,
.ir-message,
.ir-empty,
.item-bars {
  border-radius: 8px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.ir-summary span {
  color: #a7b0c3;
  margin-left: 8px;
}

.ir-message {
  color: #fde68a;
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.22);
}

.item-bars {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 14px;
}

.item-bar {
  display: grid;
  grid-template-columns: minmax(130px, 1fr) 1.4fr 110px;
  gap: 10px;
  align-items: center;
}

.item-bar span {
  color: #a7b0c3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-bar div {
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.055);
  overflow: hidden;
}

.item-bar i {
  height: 100%;
  display: block;
  border-radius: 999px;
  background: linear-gradient(90deg, #14b8a6, #f59e0b);
}

.ir-table {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
}

.ir-tr {
  display: grid;
  gap: 10px;
  align-items: center;
  padding: 11px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.ir-tr.summary {
  grid-template-columns: 1.6fr 120px 120px 140px;
}

.ir-tr.date {
  grid-template-columns: 120px 1.6fr 120px 120px 140px;
}

.ir-tr.invoice {
  grid-template-columns: 90px 120px 1.2fr 1.6fr 100px 140px;
}

.ir-th {
  position: sticky;
  top: 0;
  z-index: 2;
  font-weight: 900;
  color: #a7b0c3;
  background: rgba(16, 19, 26, 0.96);
}

.bold {
  font-weight: 900;
}
</style>
