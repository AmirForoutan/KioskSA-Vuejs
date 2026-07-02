<script setup lang="ts">
import { computed, ref } from "vue";
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

const ActiveCmp = computed(() => {
  if (active.value === "sales") return SalesReviewReport;
  if (active.value === "items") return ItemSalesReport;
  if (active.value === "ledger") return CustomerLedgerReport;
  if (active.value === "credits") return CreditReceiptsReport;
  return SalesDashboardReport;
});
</script>

<template>
  <div class="rp-shell">
    <div class="rp-head">
      <div class="rp-title">گزارشات</div>
      <div class="rp-tabs">
        <button
          v-for="i in items"
          :key="i.key"
          class="rp-tab"
          :class="{ active: i.key === active }"
          @click="active = i.key"
        >
          {{ i.title }}
        </button>
      </div>
    </div>

    <div class="rp-body">
      <component :is="ActiveCmp" />
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
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow-x: auto;
}

.rp-tab {
  min-height: 46px;
  padding: 10px 13px;
  border-radius: 8px;
  font-size: 15px;
  color: #e5e7eb;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
}

.rp-tab.active {
  background: rgba(20, 184, 166, 0.16);
  border-color: rgba(20, 184, 166, 0.34);
  font-weight: 800;
}

.rp-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
