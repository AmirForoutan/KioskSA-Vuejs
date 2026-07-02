<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import ProductToppingModal from "../../../components/ProductToppingModal.vue";
import ToppingItemModal from "../../../components/ToppingItemModal.vue";
import ToppingLevelModal from "../../../components/ToppingLevelModal.vue";
import { can } from "../../../components/acl/can";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import {
  loadDesktopToppingData,
  saveDesktopProductTopping,
  saveDesktopToppingItem,
  saveDesktopToppingLevel,
  type DesktopProduct,
  type DesktopProductTopping,
  type DesktopToppingLevel,
  type DesktopToppingProduct,
} from "../../../services/desktopApi";

type Active = "items" | "levels" | "links";

const active = ref<Active>("items");
const loading = ref(false);
const message = ref("");
const products = ref<DesktopProduct[]>([]);

useDesktopToastMessage(message);
const items = ref<DesktopToppingProduct[]>([]);
const levels = ref<DesktopToppingLevel[]>([]);
const links = ref<DesktopProductTopping[]>([]);
const editorItem = ref<DesktopToppingProduct | null>(null);
const editorLevel = ref<DesktopToppingLevel | null>(null);
const editorLink = ref<DesktopProductTopping | null>(null);

const tabs = [
  { key: "items", title: "اقلام تاپینگ" },
  { key: "levels", title: "مراحل" },
  { key: "links", title: "اتصال به کالا" },
] as const;

const activeCount = computed(() => {
  if (active.value === "items") return items.value.length;
  if (active.value === "levels") return levels.value.length;
  return links.value.length;
});

onMounted(loadRows);

async function loadRows() {
  loading.value = true;
  message.value = "";
  try {
    const result = await loadDesktopToppingData(0);
    items.value = result.items;
    levels.value = result.levels;
    links.value = result.links;
    products.value = result.products;
    if (!items.value.length && !levels.value.length && !links.value.length) message.value = "اطلاعات تاپینگ از سرویس دریافت نشد";
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در دریافت تاپینگ‌ها";
  } finally {
    loading.value = false;
  }
}

function add() {
  if (active.value === "items") {
    editorItem.value = { GoodsId: 0, GoodsCode: "", GoodsName: "", TaxPercent: 0, DutyPercent: 0, PackingPrice: 0 };
  } else if (active.value === "levels") {
    editorLevel.value = { LevelId: 0, LevelTitle: "", Priority: levels.value.length + 1, MinCount: 0, MaxCount: 1 };
  } else {
    editorLink.value = {
      ToppingId: 0,
      GoodsId: Number(products.value[0]?.GoodsId || 0),
      GoodsToppingId: Number(items.value[0]?.GoodsId || 0),
      LevelId: Number(levels.value[0]?.LevelId || 0),
      GoodsCountDefault: 0,
      GoodsCount: 0,
      Price: 0,
      containerPrice: 0,
      MinCount: 0,
      MaxCount: 1,
    };
  }
}

function editItem(id: number) {
  const row = items.value.find((item) => item.GoodsId === id);
  if (row) editorItem.value = { ...row };
}

function editLevel(id: number) {
  const row = levels.value.find((level) => level.LevelId === id);
  if (row) editorLevel.value = { ...row };
}

function editLink(id: number) {
  const row = links.value.find((link) => link.ToppingId === id);
  if (row) editorLink.value = { ...row };
}

async function saveItem(item: DesktopToppingProduct) {
  await saveAndReload(() => saveDesktopToppingItem(item));
  editorItem.value = null;
}

async function saveLevel(level: DesktopToppingLevel) {
  await saveAndReload(() => saveDesktopToppingLevel(level));
  editorLevel.value = null;
}

async function saveLink(link: DesktopProductTopping) {
  await saveAndReload(() => saveDesktopProductTopping(link));
  editorLink.value = null;
}

async function saveAndReload(action: () => Promise<{ message?: string; status?: boolean | string }>) {
  message.value = "";
  try {
    const result = await action();
    message.value = result.message || "ذخیره انجام شد";
    await loadRows();
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در ذخیره";
  }
}

function productName(id: number) {
  return products.value.find((product) => Number(product.GoodsId) === Number(id))?.GoodsName ?? `کالا ${id}`;
}

function itemName(id: number) {
  return items.value.find((item) => Number(item.GoodsId) === Number(id))?.GoodsName ?? `تاپینگ ${id}`;
}

function levelName(id: number) {
  return levels.value.find((level) => Number(level.LevelId) === Number(id))?.LevelTitle ?? `مرحله ${id}`;
}
</script>

<template>
  <div class="m-shell">
    <div class="m-head">
      <div>
        <div class="m-title">مدیریت تاپینگ‌ها</div>
        <div class="m-sub">{{ activeCount }} ردیف</div>
      </div>
      <div class="m-tools">
        <div class="tabs">
          <button v-for="tab in tabs" :key="tab.key" :class="{ active: active === tab.key }" @click="active = tab.key">
            {{ tab.title }}
          </button>
        </div>
        <button class="m-btn" :disabled="loading" @click="loadRows">بازخوانی</button>
        <button v-if="can('manage.toppings')" class="m-btn primary" @click="add">+ افزودن</button>
      </div>
    </div>

    <div v-if="message" class="m-message">{{ message }}</div>

    <div class="m-table">
      <template v-if="active === 'items'">
        <div class="m-tr items m-th">
          <div>#</div>
          <div>کد</div>
          <div>نام قلم</div>
          <div>مالیات</div>
          <div>عوارض</div>
          <div>عملیات</div>
        </div>
        <div v-for="r in items" :key="r.GoodsId" class="m-tr items">
          <div>{{ r.GoodsId }}</div>
          <div>{{ r.GoodsCode }}</div>
          <div class="bold">{{ r.GoodsName }}</div>
          <div>{{ r.TaxPercent }}</div>
          <div>{{ r.DutyPercent }}</div>
          <div><button v-if="can('manage.toppings')" class="m-btn small" @click="editItem(r.GoodsId)">ویرایش</button></div>
        </div>
      </template>

      <template v-else-if="active === 'levels'">
        <div class="m-tr levels m-th">
          <div>#</div>
          <div>عنوان</div>
          <div>اولویت</div>
          <div>حداقل</div>
          <div>حداکثر</div>
          <div>عملیات</div>
        </div>
        <div v-for="r in levels" :key="r.LevelId" class="m-tr levels">
          <div>{{ r.LevelId }}</div>
          <div class="bold">{{ r.LevelTitle }}</div>
          <div>{{ r.Priority }}</div>
          <div>{{ r.MinCount }}</div>
          <div>{{ r.MaxCount }}</div>
          <div><button v-if="can('manage.toppings')" class="m-btn small" @click="editLevel(r.LevelId)">ویرایش</button></div>
        </div>
      </template>

      <template v-else>
        <div class="m-tr links m-th">
          <div>#</div>
          <div>کالا</div>
          <div>قلم تاپینگ</div>
          <div>مرحله</div>
          <div>قیمت</div>
          <div>حداقل/حداکثر</div>
          <div>عملیات</div>
        </div>
        <div v-for="r in links" :key="r.ToppingId" class="m-tr links">
          <div>{{ r.ToppingId }}</div>
          <div>{{ productName(r.GoodsId) }}</div>
          <div class="bold">{{ itemName(r.GoodsToppingId) }}</div>
          <div>{{ levelName(r.LevelId) }}</div>
          <div>{{ Number(r.Price || 0).toLocaleString() }}</div>
          <div>{{ r.MinCount }} / {{ r.MaxCount }}</div>
          <div><button v-if="can('manage.toppings')" class="m-btn small" @click="editLink(r.ToppingId)">ویرایش</button></div>
        </div>
      </template>

      <div v-if="loading" class="m-empty">در حال بارگذاری...</div>
    </div>

    <ToppingItemModal
      v-if="editorItem"
      :item="editorItem"
      :topping-items="items"
      @save="saveItem"
      @close="editorItem = null"
    />
    <ToppingLevelModal v-if="editorLevel" :level="editorLevel" @save="saveLevel" @close="editorLevel = null" />
    <ProductToppingModal
      v-if="editorLink"
      :topping="editorLink"
      :products="products"
      :topping-items="items"
      :topping-levels="levels"
      @save="saveLink"
      @close="editorLink = null"
    />
  </div>
</template>

<style scoped>
.m-shell {
  height: 100%;
  min-height: 0;
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
}

.tabs {
  display: flex;
  gap: 6px;
  padding: 5px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.tabs button,
.m-btn {
  min-height: 42px;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
}

.tabs button.active,
.m-btn.primary {
  font-weight: 900;
  background: rgba(20, 184, 166, 0.18);
  border-color: rgba(20, 184, 166, 0.34);
}

.m-btn.small {
  min-height: 34px;
  padding: 6px 9px;
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
  gap: 10px;
  align-items: center;
  padding: 11px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.m-tr.items,
.m-tr.levels {
  grid-template-columns: 70px 110px 1fr 100px 100px 100px;
}

.m-tr.links {
  grid-template-columns: 70px 1.2fr 1.2fr 1fr 110px 120px 100px;
}

.m-th {
  font-weight: 900;
  color: #a7b0c3;
  background: rgba(16, 19, 26, 0.96);
  position: sticky;
  top: 0;
  z-index: 2;
}

.m-message,
.m-empty {
  border-radius: 8px;
  padding: 10px 12px;
  color: #fde68a;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.22);
}

.bold {
  font-weight: 800;
}
</style>
