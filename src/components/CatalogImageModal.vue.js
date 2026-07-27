import { computed } from "vue";
import ImageUploader from "./ImageUploader.vue";
const props = withDefaults(defineProps(), {
    branchId: 0,
});
const __VLS_emit = defineEmits();
const label = computed(() => (props.itemType === "category" ? "دسته‌بندی" : "کالا"));
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    branchId: 0,
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onMousedown: (...[$event]) => {
            __VLS_ctx.$emit('close');
        } },
    ...{ class: "catalog-image-backdrop" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "catalog-image-modal" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "modal-title" },
});
(__VLS_ctx.label);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "modal-sub" },
});
(__VLS_ctx.title);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.$emit('close');
        } },
    type: "button",
    ...{ class: "close-btn" },
});
/** @type {[typeof ImageUploader, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(ImageUploader, new ImageUploader({
    ...{ 'onUploadSuccess': {} },
    currentImage: (__VLS_ctx.currentImage),
    itemId: (__VLS_ctx.itemId),
    itemType: (__VLS_ctx.itemType),
    branchId: (__VLS_ctx.branchId),
    compact: true,
}));
const __VLS_1 = __VLS_0({
    ...{ 'onUploadSuccess': {} },
    currentImage: (__VLS_ctx.currentImage),
    itemId: (__VLS_ctx.itemId),
    itemType: (__VLS_ctx.itemType),
    branchId: (__VLS_ctx.branchId),
    compact: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
let __VLS_3;
let __VLS_4;
let __VLS_5;
const __VLS_6 = {
    onUploadSuccess: (...[$event]) => {
        __VLS_ctx.$emit('saved', $event);
    }
};
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['catalog-image-backdrop']} */ ;
/** @type {__VLS_StyleScopedClasses['catalog-image-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-title']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['close-btn']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ImageUploader: ImageUploader,
            label: label,
        };
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
; /* PartiallyEnd: #4569/main.vue */
