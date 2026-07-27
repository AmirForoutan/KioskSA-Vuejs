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
watch(() => props.currentImage, () => {
    cacheKey.value = Date.now();
    void checkImageExists();
}, { immediate: true });
function addCacheKey(url) {
    if (!url)
        return "";
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}t=${cacheKey.value}`;
}
function isImageFile(file) {
    if (file.type && file.type.startsWith("image/"))
        return true;
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
    }
    catch {
        imageExists.value = false;
    }
}
async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file)
        return;
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
        }
        else {
            error.value = result?.message || "خطا در آپلود تصویر";
            toast.error(error.value);
        }
    }
    catch (err) {
        console.error("Image upload failed:", err);
        error.value = "خطا در آپلود تصویر";
        toast.error(error.value);
    }
    finally {
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
        }
        else {
            error.value = result?.message || "خطا در حذف تصویر";
            toast.error(error.value);
        }
    }
    catch (err) {
        console.error("Image delete failed:", err);
        error.value = "خطا در حذف تصویر";
        toast.error(error.value);
    }
    finally {
        uploading.value = false;
    }
}
function resetInput() {
    if (fileInput.value) {
        fileInput.value.value = "";
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['image-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['compact']} */ ;
/** @type {__VLS_StyleScopedClasses['no-image']} */ ;
/** @type {__VLS_StyleScopedClasses['image-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['image-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['image-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['no-image']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-btn']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "image-uploader" },
    ...{ class: ({ compact: __VLS_ctx.compact }) },
});
if (__VLS_ctx.imageExists && __VLS_ctx.currentImage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "image-preview" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        ...{ onError: (...[$event]) => {
                if (!(__VLS_ctx.imageExists && __VLS_ctx.currentImage))
                    return;
                __VLS_ctx.imageExists = false;
            } },
        src: (__VLS_ctx.previewUrl),
        alt: (__VLS_ctx.imageAlt),
        ...{ class: "preview-image" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "image-overlay" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.removeImage) },
        type: "button",
        ...{ class: "delete-btn" },
        title: "حذف تصویر",
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "no-image" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "upload-controls" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onChange: (__VLS_ctx.handleFileChange) },
    id: (__VLS_ctx.inputId),
    ref: "fileInput",
    type: "file",
    accept: "image/*",
    ...{ class: "file-input" },
});
/** @type {typeof __VLS_ctx.fileInput} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: (__VLS_ctx.inputId),
    ...{ class: "upload-btn" },
});
(__VLS_ctx.uploading ? "در حال آپلود..." : "انتخاب تصویر");
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "error-message" },
    });
    (__VLS_ctx.error);
}
/** @type {__VLS_StyleScopedClasses['image-uploader']} */ ;
/** @type {__VLS_StyleScopedClasses['compact']} */ ;
/** @type {__VLS_StyleScopedClasses['image-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-image']} */ ;
/** @type {__VLS_StyleScopedClasses['image-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['no-image']} */ ;
/** @type {__VLS_StyleScopedClasses['upload-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['file-input']} */ ;
/** @type {__VLS_StyleScopedClasses['upload-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['error-message']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            $props: __VLS_makeOptional(props),
            ...props,
            $emit: emit,
            fileInput: fileInput,
            uploading: uploading,
            error: error,
            imageExists: imageExists,
            inputId: inputId,
            imageAlt: imageAlt,
            previewUrl: previewUrl,
            handleFileChange: handleFileChange,
            removeImage: removeImage,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {
            $props: __VLS_makeOptional(props),
            ...props,
            $emit: emit,
        };
    },
});
; /* PartiallyEnd: #4569/main.vue */
