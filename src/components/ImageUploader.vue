<template>
  <div class="image-uploader" :class="{ compact }">
    <div v-if="imageExists && currentImage" class="image-preview">
      <img :src="previewUrl" :alt="imageAlt" class="preview-image" @error="imageExists = false" />
      <div class="image-overlay">
        <button type="button" class="delete-btn" title="حذف تصویر" @click="removeImage">
          حذف
        </button>
      </div>
    </div>

    <div v-else class="no-image">
      <span>تصویری ثبت نشده</span>
    </div>

    <div class="upload-controls">
      <input
        :id="inputId"
        ref="fileInput"
        type="file"
        accept="image/*"
        class="file-input"
        @change="handleFileChange"
      />
      <label :for="inputId" class="upload-btn">
        {{ uploading ? "در حال آپلود..." : "انتخاب تصویر" }}
      </label>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { deleteImage, setImage } from "../services/apiService";
import { useToast } from "vue-toastification";

const props = defineProps({
  currentImage: String,
  itemId: [String, Number],
  itemType: {
    type: String,
    required: true,
    validator: (value) => ["category", "product", "branch"].includes(value),
  },
  branchId: {
    type: Number,
    default: 0,
  },
  compact: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["upload-success"]);

const toast = useToast();
const fileInput = ref(null);
const uploading = ref(false);
const error = ref("");
const imageExists = ref(false);
const cacheKey = ref(Date.now());

const inputId = computed(() => `file-input-${props.itemType}-${props.itemId}-${props.branchId}`);
const imageAlt = computed(() => `تصویر ${props.itemType === "category" ? "دسته‌بندی" : "کالا"}`);
const previewUrl = computed(() => addCacheKey(props.currentImage || ""));

watch(
  () => props.currentImage,
  () => {
    cacheKey.value = Date.now();
    void checkImageExists();
  },
  { immediate: true }
);

function addCacheKey(url) {
  if (!url) return "";
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}t=${cacheKey.value}`;
}

function isImageFile(file) {
  if (file.type && file.type.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|bmp|webp|tiff?|svg|ico|avif|heic|heif)$/i.test(file.name || "");
}

async function checkImageExists() {
  if (!props.currentImage) {
    imageExists.value = false;
    return;
  }

  try {
    const response = await fetch(previewUrl.value, { method: "GET", cache: "no-store" });
    imageExists.value = response.ok;
  } catch {
    imageExists.value = false;
  }
}

async function handleFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  error.value = "";

  if (!isImageFile(file)) {
    error.value = "فایل انتخاب‌شده باید تصویر باشد";
    resetInput();
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    error.value = "حجم تصویر نباید بیشتر از ۱۰ مگابایت باشد";
    resetInput();
    return;
  }

  uploading.value = true;

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("itemId", props.itemId);
    formData.append("itemType", props.itemType);
    formData.append("branchId", props.branchId);

    const result = await setImage(formData);
    if (result?.status === true || result?.status === "true") {
      cacheKey.value = Date.now();
      imageExists.value = true;
      emit("upload-success", {
        itemId: props.itemId,
        itemType: props.itemType,
        removed: false,
      });
      await checkImageExists();
    } else {
      error.value = result?.message || "خطا در آپلود تصویر";
      toast.error(error.value);
    }
  } catch (err) {
    console.error("Image upload failed:", err);
    error.value = "خطا در آپلود تصویر";
    toast.error(error.value);
  } finally {
    uploading.value = false;
    resetInput();
  }
}

async function removeImage() {
  error.value = "";
  uploading.value = true;

  try {
    const formData = new FormData();
    formData.append("itemId", props.itemId);
    formData.append("itemType", props.itemType);
    formData.append("branchId", props.branchId);

    const result = await deleteImage(formData);
    if (result?.status === true || result?.status === "true") {
      cacheKey.value = Date.now();
      imageExists.value = false;
      emit("upload-success", {
        itemId: props.itemId,
        itemType: props.itemType,
        removed: true,
      });
    } else {
      error.value = result?.message || "خطا در حذف تصویر";
      toast.error(error.value);
    }
  } catch (err) {
    console.error("Image delete failed:", err);
    error.value = "خطا در حذف تصویر";
    toast.error(error.value);
  } finally {
    uploading.value = false;
  }
}

function resetInput() {
  if (fileInput.value) {
    fileInput.value.value = "";
  }
}
</script>

<style scoped>
.image-uploader {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.image-preview,
.no-image {
  width: 100%;
  height: 150px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(148, 163, 184, 0.08);
}

.compact .image-preview,
.compact .no-image {
  height: 118px;
}

.image-preview {
  position: relative;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: rgba(255, 255, 255, 0.9);
}

.image-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.55);
  opacity: 0;
  transition: opacity 0.18s ease;
}

.image-preview:hover .image-overlay {
  opacity: 1;
}

.no-image {
  display: grid;
  place-items: center;
  color: #94a3b8;
  border-style: dashed;
  font-size: 13px;
}

.upload-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.file-input {
  display: none;
}

.upload-btn,
.delete-btn {
  min-height: 36px;
  border-radius: 8px;
  padding: 7px 12px;
  border: 1px solid rgba(20, 184, 166, 0.34);
  background: rgba(20, 184, 166, 0.16);
  color: #eef2ff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
}

.delete-btn {
  border-color: rgba(239, 68, 68, 0.42);
  background: rgba(239, 68, 68, 0.24);
}

.error-message {
  color: #fecaca;
  font-size: 13px;
}
</style>
