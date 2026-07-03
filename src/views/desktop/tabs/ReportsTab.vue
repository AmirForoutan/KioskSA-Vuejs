<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import "@majidh1/jalalidatepicker";
import "@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css";
import { setupJalaliDateInputs } from "../../../utilities";
import CreditReceiptsReport from "../reports/CreditReceiptsReport.vue";
import CustomerLedgerReport from "../reports/CustomerLedgerReport.vue";
import ItemSalesReport from "../reports/ItemSalesReport.vue";
import SalesDashboardReport from "../reports/SalesDashboardReport.vue";
import SalesReviewReport from "../reports/SalesReviewReport.vue";

type ReportTabKey = "dashboard" | "sales" | "items" | "ledger" | "credits";
type ReportTab = { key: ReportTabKey; title: string };

const items: ReportTab[] = [
  { key: "dashboard", title: "داشبورد فروش" },
  { key: "sales", title: "مرور فروش" },
  { key: "items", title: "فروش اقلام" },
  { key: "ledger", title: "گزارش مشتریان" },
  { key: "credits", title: "رسیدهای اعتبار" },
];

const active = ref<ReportTabKey>("dashboard");
const from = ref("");
const to = ref("");
const q = ref("");
const refreshKey = ref(0);

const activeTitle = computed(() => items.find((item) => item.key === active.value)?.title || "گزارشات");

const ActiveCmp = computed(() => {
  if (active.value === "sales") return SalesReviewReport;
  if (active.value === "items") return ItemSalesReport;
  if (active.value === "ledger") return CustomerLedgerReport;
  if (active.value === "credits") return CreditReceiptsReport;
  return SalesDashboardReport;
});

onMounted(() => setupJalaliDateInputs());

async function applyFilters() {
  refreshKey.value += 1;
  await nextTick();
  setupJalaliDateInputs();
}

function clearFilters() {
  q.value = "";
  from.value = "";
  to.value = "";
  applyFilters();
}
</script>

<template>
  <div class="rp-shell">
    <div class="rp-head">
      <div class="rp-title">گزارشات</div>
      <div class="rp-tabs">
        <button v-for="i in items" :key="i.key" class="rp-tab" :class="{ active: i.key === active }"
          @click="active = i.key">
          {{ i.title }}
        </button>
      </div>
    </div>

    <div class="rp-filter-panel">
      <div class="rp-filter-title">
        <b>{{ activeTitle }}</b>
        <small>این بازه زمانی و جستجو برای همه تب‌های گزارشات مشترک است.</small>
      </div>
      <input class="rp-input search" v-model="q" placeholder="جستجوی مشترک: مشتری، موبایل، شماره فاکتور، کالا، رسید..."
        @keyup.enter="applyFilters" />
      <input class="rp-input" v-model="from" placeholder="از تاریخ" readonly data-jdp data-jdp-only-date />
      <input class="rp-input" v-model="to" placeholder="تا تاریخ" readonly data-jdp data-jdp-only-date />
      <button class="rp-action primary" @click="applyFilters">اعمال فیلتر</button>
      <button class="rp-action" @click="clearFilters">پاک کردن</button>
    </div>

    <div class="rp-body">
      <component :is="ActiveCmp" :from-date="from" :to-date="to" :query="q" :refresh-key="refreshKey" />
    </div>
  </div>
</template>

<style scoped>
.rp-shell {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.rp-title {
  font-weight: 900;
  font-size: 18px;
}

.rp-tabs {
  display: flex;
  gap: 8px;
  padding: 6px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow-x: auto;
}

.rp-tab {
  min-height: 46px;
  padding: 10px 13px;
  border-radius: 9px;
  font-size: 15px;
  color: #e5e7eb;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
}

.rp-tab.active {
  background: linear-gradient(135deg, rgba(20, 184, 166, 0.22), rgba(59, 130, 246, 0.13));
  border-color: rgba(20, 184, 166, 0.34);
  font-weight: 800;
}

.rp-filter-panel {
  display: grid;
  grid-template-columns: minmax(220px, 0.9fr) minmax(260px, 1.3fr) 160px 160px auto auto;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.rp-filter-title {
  display: grid;
  gap: 4px;
}

.rp-filter-title b {
  color: #eef2ff;
  font-size: 15px;
}

.rp-filter-title small {
  color: #a7b0c3;
  font-size: 12px;
}

.rp-input,
.rp-action {
  min-height: 46px;
  border-radius: 9px;
  padding: 9px 11px;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.rp-input.search {
  min-width: 0;
}

.rp-action {
  cursor: pointer;
  white-space: nowrap;
}

.rp-action.primary {
  font-weight: 900;
  background: rgba(20, 184, 166, 0.18);
  border-color: rgba(20, 184, 166, 0.34);
}

.rp-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

@media (max-width: 1180px) {

  .rp-head,
  .rp-filter-panel {
    grid-template-columns: 1fr;
  }

  .rp-head {
    align-items: stretch;
  }
}
</style>
