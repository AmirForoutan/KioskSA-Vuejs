<script setup lang="ts">
import { computed, ref } from "vue";

type Supplier = {
  SupplierId: number;
  SupplierCode: string;
  SupplierTitle: string;
  Phone?: string;
  Address?: string;
  Description?: string;
  IsActive: boolean;
};

const props = defineProps<{
  suppliers: Supplier[];
  supplierId: number;
  supplierTitle: string;
}>();

const emit = defineEmits<{
  "update:supplierId": [value: number];
  "update:supplierTitle": [value: string];
}>();

const searchText = ref(props.supplierTitle || "");
const isOpen = ref(false);
const isSearching = ref(false);
const hasSearched = ref(false);
const searchKeyword = ref("");
let searchTimer: ReturnType<typeof window.setTimeout> | null = null;

const searchResults = computed(() => {
  const q = searchKeyword.value.trim().toLowerCase();
  if (q.length < 3) return [];
  return props.suppliers
    .filter((supplier) => {
      const text = `${supplier.SupplierCode || ""} ${supplier.SupplierTitle || ""} ${supplier.Phone || ""}`.toLowerCase();
      return text.includes(q);
    })
    .slice(0, 12);
});

function onInput() {
  const value = searchText.value.trim();
  emit("update:supplierId", 0);
  emit("update:supplierTitle", searchText.value);
  hasSearched.value = false;
  isOpen.value = false;

  if (searchTimer) window.clearTimeout(searchTimer);

  if (value.length < 3) {
    searchKeyword.value = "";
    isSearching.value = false;
    return;
  }

  isSearching.value = true;
  searchTimer = window.setTimeout(() => {
    searchKeyword.value = value;
    isSearching.value = false;
    hasSearched.value = true;
    isOpen.value = true;
  }, 3000);
}

function selectSupplier(supplier: Supplier) {
  searchText.value = supplier.SupplierTitle;
  emit("update:supplierId", supplier.SupplierId);
  emit("update:supplierTitle", supplier.SupplierTitle);
  isOpen.value = false;
  hasSearched.value = false;
  searchKeyword.value = "";
}

function clearSupplier() {
  searchText.value = "";
  emit("update:supplierId", 0);
  emit("update:supplierTitle", "");
  isOpen.value = false;
  hasSearched.value = false;
  searchKeyword.value = "";
  isSearching.value = false;
  if (searchTimer) window.clearTimeout(searchTimer);
}

function closeLater() {
  window.setTimeout(() => {
    isOpen.value = false;
  }, 180);
}
</script>

<template>
  <div class="supplier-search" @mouseleave="closeLater">
    <div class="supplier-search-input-wrap">
      <input
        v-model="searchText"
        class="supplier-search-input"
        placeholder="جستجوی تأمین‌کننده؛ حداقل ۳ کاراکتر"
        autocomplete="off"
        @input="onInput"
        @focus="searchResults.length ? (isOpen = true) : undefined"
      />
      <button v-if="searchText" type="button" class="supplier-clear" @click="clearSupplier">×</button>
    </div>

    <div class="supplier-helper">
      <span v-if="isSearching">۳ ثانیه بعد جستجو شروع می‌شود...</span>
      <span v-else-if="searchText.trim().length > 0 && searchText.trim().length < 3">حداقل ۳ کاراکتر وارد کن</span>
      <span v-else-if="supplierId">تأمین‌کننده انتخاب شده است</span>
      <span v-else>نام، کد یا تلفن تأمین‌کننده را بنویس</span>
    </div>

    <div v-if="isOpen" class="supplier-dropdown">
      <button
        v-for="supplier in searchResults"
        :key="supplier.SupplierId"
        type="button"
        class="supplier-result"
        @click="selectSupplier(supplier)"
      >
        <strong>{{ supplier.SupplierTitle }}</strong>
        <small>{{ supplier.SupplierCode || '-' }} <span v-if="supplier.Phone">| {{ supplier.Phone }}</span></small>
      </button>

      <div v-if="hasSearched && !searchResults.length" class="supplier-empty">
        تأمین‌کننده‌ای با این عبارت پیدا نشد.
      </div>
    </div>
  </div>
</template>

<style scoped>
.supplier-search {
  position: relative;
  min-width: 220px;
}

.supplier-search-input-wrap {
  position: relative;
}

.supplier-search-input {
  padding-left: 36px !important;
}

.supplier-clear {
  position: absolute;
  left: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  min-height: 28px !important;
  padding: 0 !important;
  border-radius: 999px !important;
  line-height: 1;
}

.supplier-helper {
  margin-top: 5px;
  font-size: 11px;
  color: #94a3b8;
  min-height: 18px;
}

.supplier-dropdown {
  position: absolute;
  z-index: 60;
  top: calc(100% + 6px);
  right: 0;
  left: 0;
  max-height: 280px;
  overflow: auto;
  padding: 8px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.98);
  border: 1px solid rgba(45, 212, 191, 0.28);
  box-shadow: 0 20px 45px rgba(2, 6, 23, 0.42);
}

.supplier-result {
  width: 100%;
  display: grid;
  gap: 4px;
  text-align: right;
  margin: 0 0 6px !important;
  border-radius: 12px !important;
  background: rgba(255, 255, 255, 0.04) !important;
}

.supplier-result strong {
  color: #f8fafc;
}

.supplier-result small {
  color: #99f6e4;
}

.supplier-empty {
  padding: 10px;
  color: #fde68a;
  text-align: center;
}
</style>
