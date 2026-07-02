<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import CatalogImageModal from "../../../components/CatalogImageModal.vue";
import ProductModal from "../../../components/ProductModal.vue";
import { can } from "../../../components/acl/can";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import {
  loadDesktopCatalog,
  saveDesktopProduct,
  type DesktopCategory,
  type DesktopProduct,
} from "../../../services/desktopApi";

const fallbackCategories: DesktopCategory[] = [
  { GroupId: 1, GroupName: "عمومی" },
  { GroupId: 2, GroupName: "نوشیدنی" },
];

const fallbackRows: DesktopProduct[] = [
  {
    GoodsId: 1,
    GoodsCode: "1001",
    GoodsName: "کالای نمونه",
    GoodsDescription: "در صورت قطع سرویس نمایش داده می‌شود",
    GoodsGroupId: 1,
    GoodsPrice: 120000,
    TaxPercent: 0,
    DutyPercent: 0,
    PackingPrice: 0,
    StockInventory: 10,
    IsActive: true,
  },
];

const q = ref("");
const rows = ref<DesktopProduct[]>([]);
const categories = ref<DesktopCategory[]>([]);
const loading = ref(false);
const saving = ref(false);
const message = ref("");
const editorProduct = ref<DesktopProduct | null>(null);
const imageVersion = ref(Date.now());
const imageEditor = ref<{
  itemId: number | string;
  itemType: "product";
  title: string;
  currentImage: string;
} | null>(null);

useDesktopToastMessage(message);

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase();
  if (!s) return rows.value;
  return rows.value.filter((x) => {
    const haystack = `${x.GoodsName ?? ""} ${x.GoodsCode ?? ""} ${categoryName(x.GoodsGroupId)}`.toLowerCase();
    return haystack.includes(s);
  });
});

onMounted(loadProducts);

async function loadProducts() {
  loading.value = true;
  message.value = "";
  try {
    const result = await loadDesktopCatalog(0);
    rows.value = result.goods.length ? result.goods : fallbackRows;
    categories.value = result.categories.length ? result.categories : fallbackCategories;
    if (!result.goods.length) message.value = "داده کالا از سرویس دریافت نشد؛ نمونه نمایش داده شد";
  } catch (error) {
    rows.value = fallbackRows;
    categories.value = fallbackCategories;
    message.value = error instanceof Error ? `${error.message} - نمونه نمایش داده شد` : "نمونه نمایش داده شد";
  } finally {
    loading.value = false;
  }
}

function categoryName(groupId: unknown) {
  return categories.value.find((category) => String(category.GroupId) === String(groupId))?.GroupName ?? "بدون دسته";
}

function newProduct(): DesktopProduct {
  return {
    GoodsId: 0,
    GoodsCode: "",
    GoodsName: "",
    GoodsDescription: "",
    GoodsGroupId: categories.value[0]?.GroupId ?? 0,
    GoodsPrice: 0,
    TaxPercent: 0,
    DutyPercent: 0,
    PackingPrice: 0,
    StockInventory: 0,
    IsActive: true,
    Saturday: true,
    FromTimeSaturday: "00:00",
    ToTimeSaturday: "23:59",
    Sunday: true,
    FromTimeSunday: "00:00",
    ToTimeSunday: "23:59",
    Monday: true,
    FromTimeMonday: "00:00",
    ToTimeMonday: "23:59",
    Tuesday: true,
    FromTimeTuesday: "00:00",
    ToTimeTuesday: "23:59",
    Wednesday: true,
    FromTimeWednesday: "00:00",
    ToTimeWednesday: "23:59",
    Thursday: true,
    FromTimeThursday: "00:00",
    ToTimeThursday: "23:59",
    Friday: true,
    FromTimeFriday: "00:00",
    ToTimeFriday: "23:59",
  };
}

function add() {
  editorProduct.value = newProduct();
}

function edit(id: number | string) {
  const product = rows.value.find((row) => String(row.GoodsId) === String(id));
  if (product) editorProduct.value = { ...product };
}

function closeEditor() {
  editorProduct.value = null;
}

async function save(product: DesktopProduct) {
  saving.value = true;
  message.value = "";
  try {
    const result = await saveDesktopProduct(product);
    const index = rows.value.findIndex((row) => String(row.GoodsId) === String(product.GoodsId));
    if (index >= 0) rows.value[index] = { ...product };
    else rows.value.unshift({ ...product, GoodsId: product.GoodsId || Date.now() });
    message.value = result.message || "کالا ذخیره شد";
    closeEditor();
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در ذخیره کالا";
  } finally {
    saving.value = false;
  }
}

function getProductImage(goodsCode: number | string) {
  return `/img/goods/${goodsCode}.png?v=${imageVersion.value}`;
}

function setImage(id: number | string) {
  const row = rows.value.find((item) => String(item.GoodsId) === String(id));
  if (!row?.GoodsCode) {
    message.value = "برای آپلود تصویر، کد کالا لازم است";
    return;
  }

  imageEditor.value = {
    itemId: row.GoodsCode,
    itemType: "product",
    title: row.GoodsName || `کالا ${row.GoodsCode}`,
    currentImage: getProductImage(row.GoodsCode),
  };
}

function refreshImage(payload?: { removed?: boolean }) {
  imageVersion.value = Date.now();
  if (imageEditor.value) {
    imageEditor.value = {
      ...imageEditor.value,
      currentImage: getProductImage(imageEditor.value.itemId),
    };
  }
  message.value = payload?.removed ? "تصویر کالا حذف شد" : "تصویر کالا ذخیره شد";
}
</script>

<template>
  <div class="m-shell">
    <div class="m-head">
      <div>
        <div class="m-title">مدیریت کالاها</div>
        <div class="m-sub">{{ filtered.length }} کالا</div>
      </div>

      <div class="m-tools">
        <input class="m-input" v-model="q" placeholder="جستجوی نام، کد یا دسته..." />
        <button class="m-btn" :disabled="loading" @click="loadProducts">بازخوانی</button>
        <button v-if="can('manage.products')" class="m-btn primary" @click="add">+ افزودن کالا</button>
      </div>
    </div>

    <div v-if="message" class="m-message">{{ message }}</div>

    <div class="m-table">
      <div class="m-tr m-th">
        <div>#</div>
        <div>کد</div>
        <div>نام</div>
        <div>دسته</div>
        <div>قیمت</div>
        <div>موجودی</div>
        <div>وضعیت</div>
        <div>عکس</div>
        <div>عملیات</div>
      </div>

      <div v-if="loading" class="m-empty">در حال دریافت کالاها...</div>

      <div v-for="r in filtered" :key="r.GoodsId" class="m-tr">
        <div>{{ r.GoodsId }}</div>
        <div>{{ r.GoodsCode }}</div>
        <div class="bold">{{ r.GoodsName }}</div>
        <div>{{ categoryName(r.GoodsGroupId) }}</div>
        <div>{{ Number(r.GoodsPrice || 0).toLocaleString() }}</div>
        <div>{{ Number(r.StockInventory || 0).toLocaleString() }}</div>
        <div>
          <span class="status" :class="{ off: r.IsActive === false }">{{ r.IsActive === false ? "غیرفعال" : "فعال" }}</span>
        </div>
        <div>
          <button class="m-btn small" @click="setImage(r.GoodsId)">آپلود</button>
        </div>
        <div>
          <button v-if="can('manage.products')" class="m-btn small" @click="edit(r.GoodsId)">ویرایش</button>
        </div>
      </div>
    </div>

    <ProductModal
      v-if="editorProduct"
      :product="editorProduct"
      :categories="categories"
      :products="rows"
      @save="save"
      @close="closeEditor"
    />

    <CatalogImageModal
      v-if="imageEditor"
      :current-image="imageEditor.currentImage"
      :item-id="imageEditor.itemId"
      :item-type="imageEditor.itemType"
      :title="imageEditor.title"
      @saved="refreshImage"
      @close="imageEditor = null"
    />

    <div v-if="saving" class="save-mask">در حال ذخیره...</div>
  </div>
</template>

<style scoped>
.m-shell {
  height: 100%;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.m-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.m-title {
  font-weight: 900;
  font-size: 18px;
}

.m-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #a7b0c3;
}

.m-tools {
  display: flex;
  gap: 10px;
  align-items: center;
  width: min(700px, 100%);
}

.m-input {
  min-height: 46px;
  border-radius: 8px;
  padding: 9px 11px;
  font-size: 15px;
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #eef2ff;
}

.m-btn {
  min-height: 46px;
  border-radius: 8px;
  padding: 9px 11px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #eef2ff;
  cursor: pointer;
  white-space: nowrap;
}

.m-btn.small {
  min-height: 36px;
  font-size: 13px;
  padding: 7px 9px;
}

.m-btn.primary {
  font-weight: 900;
  background: rgba(20, 184, 166, 0.18);
  border-color: rgba(20, 184, 166, 0.34);
}

.m-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.m-message,
.m-empty,
.save-mask {
  border-radius: 8px;
  padding: 10px 12px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.22);
  color: #fde68a;
}

.m-table {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
}

.m-tr {
  display: grid;
  grid-template-columns: 70px 100px 1.5fr 1fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr;
  gap: 10px;
  align-items: center;
  padding: 11px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.m-th {
  font-weight: 900;
  opacity: 0.85;
  background: rgba(16, 19, 26, 0.96);
  position: sticky;
  top: 0;
  z-index: 2;
  backdrop-filter: blur(8px);
}

.bold {
  font-weight: 800;
}

.status {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  border-radius: 8px;
  padding: 5px 9px;
  color: #bbf7d0;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.22);
}

.status.off {
  color: #fecaca;
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.22);
}

.save-mask {
  position: absolute;
  left: 12px;
  bottom: 12px;
  color: #eef2ff;
}
</style>
