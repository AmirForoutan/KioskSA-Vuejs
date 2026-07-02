<template>
  <div class="catalog-image-backdrop" @mousedown.self="$emit('close')">
    <section class="catalog-image-modal">
      <header>
        <div>
          <div class="modal-title">تصویر {{ label }}</div>
          <div class="modal-sub">{{ title }}</div>
        </div>
        <button type="button" class="close-btn" @click="$emit('close')">بستن</button>
      </header>

      <ImageUploader
        :current-image="currentImage"
        :item-id="itemId"
        :item-type="itemType"
        :branch-id="branchId"
        compact
        @upload-success="$emit('saved', $event)"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import ImageUploader from "./ImageUploader.vue";

const props = withDefaults(
  defineProps<{
    currentImage: string;
    itemId: string | number;
    itemType: "category" | "product";
    title: string;
    branchId?: number;
  }>(),
  {
    branchId: 0,
  }
);

defineEmits<{
  close: [];
  saved: [payload: { itemId: string | number; itemType: string; removed?: boolean }];
}>();

const label = computed(() => (props.itemType === "category" ? "دسته‌بندی" : "کالا"));
</script>

<style scoped>
.catalog-image-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(2, 6, 23, 0.62);
  backdrop-filter: blur(8px);
}

.catalog-image-modal {
  width: min(430px, 100%);
  border-radius: 8px;
  padding: 14px;
  color: #eef2ff;
  background: #151a24;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.38);
}

header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.modal-title {
  font-size: 16px;
  font-weight: 900;
}

.modal-sub {
  margin-top: 4px;
  color: #a7b0c3;
  font-size: 13px;
}

.close-btn {
  min-height: 34px;
  border-radius: 8px;
  padding: 6px 10px;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
}
</style>
