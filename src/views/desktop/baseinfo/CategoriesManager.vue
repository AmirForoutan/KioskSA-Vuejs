<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import CatalogImageModal from "../../../components/CatalogImageModal.vue";
import CategoryModal from "../../../components/CategoryModal.vue";
import { can } from "../../../components/acl/can";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import {
  loadDesktopCatalog,
  saveDesktopCategory,
  type DesktopCategory,
} from "../../../services/desktopApi";

const q = ref("");
const rows = ref<DesktopCategory[]>([]);
const loading = ref(false);
const message = ref("");
const editor = ref<DesktopCategory | null>(null);
const imageVersion = ref(Date.now());
const imageEditor = ref<{
  itemId: number | string;
  itemType: "category";
  title: string;
  currentImage: string;
} | null>(null);

useDesktopToastMessage(message);

const filtered = computed(() => {
  const s = q.value.trim();
  if (!s) return rows.value;
  return rows.value.filter((row) => `${row.GroupCode ?? ""} ${row.GroupName ?? ""}`.includes(s));
});

onMounted(loadRows);

async function loadRows() {
  loading.value = true;
  message.value = "";
  try {
    const result = await loadDesktopCatalog(0);
    rows.value = result.categories;
    if (!rows.value.length) message.value = "دسته‌بندی‌ای از سرویس دریافت نشد";
  } catch (error) {
    rows.value = [];
    message.value = error instanceof Error ? error.message : "خطا در دریافت دسته‌بندی‌ها";
  } finally {
    loading.value = false;
  }
}

function add() {
  editor.value = { GroupId: 0, GroupCode: "", GroupName: "", IsActive: true };
}

function edit(id: number | string) {
  const row = rows.value.find((item) => String(item.GroupId) === String(id));
  if (row) editor.value = { ...row };
}

async function save(category: DesktopCategory) {
  message.value = "";
  try {
    const result = await saveDesktopCategory(category);
    message.value = result.message || "دسته‌بندی ذخیره شد";
    editor.value = null;
    await loadRows();
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در ذخیره دسته‌بندی";
  }
}

function getCategoryImage(groupCode: number | string) {
  return `/img/groups/${groupCode}.png?v=${imageVersion.value}`;
}

function setImage(id: number | string) {
  const row = rows.value.find((item) => String(item.GroupId) === String(id));
  if (!row?.GroupCode) {
    message.value = "برای آپلود تصویر، کد دسته‌بندی لازم است";
    return;
  }

  imageEditor.value = {
    itemId: row.GroupCode,
    itemType: "category",
    title: row.GroupName || `دسته‌بندی ${row.GroupCode}`,
    currentImage: getCategoryImage(row.GroupCode),
  };
}

function refreshImage(payload?: { removed?: boolean }) {
  imageVersion.value = Date.now();
  if (imageEditor.value) {
    imageEditor.value = {
      ...imageEditor.value,
      currentImage: getCategoryImage(imageEditor.value.itemId),
    };
  }
  message.value = payload?.removed ? "تصویر دسته‌بندی حذف شد" : "تصویر دسته‌بندی ذخیره شد";
}
</script>

<template>
  <div class="m-shell">
    <div class="m-head">
      <div>
        <div class="m-title">مدیریت دسته‌بندی‌ها</div>
        <div class="m-sub">{{ filtered.length }} دسته</div>
      </div>
      <div class="m-tools">
        <input class="m-input" v-model="q" placeholder="جستجوی کد یا نام..." />
        <button class="m-btn" :disabled="loading" @click="loadRows">بازخوانی</button>
        <button v-if="can('manage.categories')" class="m-btn primary" @click="add">+ افزودن دسته</button>
      </div>
    </div>

    <div v-if="message" class="m-message">{{ message }}</div>

    <div class="m-table">
      <div class="m-tr m-th">
        <div>#</div>
        <div>کد</div>
        <div>نام</div>
        <div>وضعیت</div>
        <div>عکس</div>
        <div>عملیات</div>
      </div>

      <div v-if="loading" class="m-empty">در حال بارگذاری...</div>

      <div class="m-tr" v-for="r in filtered" :key="r.GroupId">
        <div>{{ r.GroupId }}</div>
        <div>{{ r.GroupCode }}</div>
        <div class="bold">{{ r.GroupName }}</div>
        <div>
          <span class="status" :class="{ off: r.IsActive === false }">{{ r.IsActive === false ? "غیرفعال" : "فعال" }}</span>
        </div>
        <div><button class="m-btn small" @click="setImage(r.GroupId)">آپلود</button></div>
        <div><button v-if="can('manage.categories')" class="m-btn small" @click="edit(r.GroupId)">ویرایش</button></div>
      </div>
    </div>

    <CategoryModal v-if="editor" :category="editor" :categories="rows" @save="save" @close="editor = null" />
    <CatalogImageModal
      v-if="imageEditor"
      :current-image="imageEditor.currentImage"
      :item-id="imageEditor.itemId"
      :item-type="imageEditor.itemType"
      :title="imageEditor.title"
      @saved="refreshImage"
      @close="imageEditor = null"
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
  width: min(640px, 100%);
}

.m-input,
.m-btn {
  min-height: 46px;
  border-radius: 8px;
  padding: 9px 11px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #eef2ff;
}

.m-input {
  width: 100%;
}

.m-btn {
  cursor: pointer;
  white-space: nowrap;
}

.m-btn.small {
  min-height: 36px;
  padding: 7px 9px;
}

.m-btn.primary {
  font-weight: 900;
  background: rgba(20, 184, 166, 0.18);
  border-color: rgba(20, 184, 166, 0.34);
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
  grid-template-columns: 70px 110px 1fr 120px 100px 100px;
  gap: 10px;
  align-items: center;
  padding: 11px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
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

.status {
  display: inline-flex;
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
</style>
