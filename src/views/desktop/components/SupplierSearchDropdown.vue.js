import { computed, ref } from "vue";
const props = defineProps();
const emit = defineEmits();
const searchText = ref(props.supplierTitle || "");
const isOpen = ref(false);
const isSearching = ref(false);
const hasSearched = ref(false);
const searchKeyword = ref("");
let searchTimer = null;
const searchResults = computed(() => {
    const q = searchKeyword.value.trim().toLowerCase();
    if (q.length < 3)
        return [];
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
    if (searchTimer)
        window.clearTimeout(searchTimer);
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
function selectSupplier(supplier) {
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
    if (searchTimer)
        window.clearTimeout(searchTimer);
}
function closeLater() {
    window.setTimeout(() => {
        isOpen.value = false;
    }, 180);
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['supplier-result']} */ ;
/** @type {__VLS_StyleScopedClasses['supplier-result']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onMouseleave: (__VLS_ctx.closeLater) },
    ...{ class: "supplier-search" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "supplier-search-input-wrap" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onInput: (__VLS_ctx.onInput) },
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.searchResults.length ? (__VLS_ctx.isOpen = true) : undefined;
        } },
    ...{ class: "supplier-search-input" },
    placeholder: "جستجوی تأمین‌کننده؛ حداقل ۳ کاراکتر",
    autocomplete: "off",
});
(__VLS_ctx.searchText);
if (__VLS_ctx.searchText) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.clearSupplier) },
        type: "button",
        ...{ class: "supplier-clear" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "supplier-helper" },
});
if (__VLS_ctx.isSearching) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
else if (__VLS_ctx.searchText.trim().length > 0 && __VLS_ctx.searchText.trim().length < 3) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
else if (__VLS_ctx.supplierId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
if (__VLS_ctx.isOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "supplier-dropdown" },
    });
    for (const [supplier] of __VLS_getVForSourceType((__VLS_ctx.searchResults))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.isOpen))
                        return;
                    __VLS_ctx.selectSupplier(supplier);
                } },
            key: (supplier.SupplierId),
            type: "button",
            ...{ class: "supplier-result" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (supplier.SupplierTitle);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (supplier.SupplierCode || '-');
        if (supplier.Phone) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (supplier.Phone);
        }
    }
    if (__VLS_ctx.hasSearched && !__VLS_ctx.searchResults.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "supplier-empty" },
        });
    }
}
/** @type {__VLS_StyleScopedClasses['supplier-search']} */ ;
/** @type {__VLS_StyleScopedClasses['supplier-search-input-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['supplier-search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['supplier-clear']} */ ;
/** @type {__VLS_StyleScopedClasses['supplier-helper']} */ ;
/** @type {__VLS_StyleScopedClasses['supplier-dropdown']} */ ;
/** @type {__VLS_StyleScopedClasses['supplier-result']} */ ;
/** @type {__VLS_StyleScopedClasses['supplier-empty']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            searchText: searchText,
            isOpen: isOpen,
            isSearching: isSearching,
            hasSearched: hasSearched,
            searchResults: searchResults,
            onInput: onInput,
            selectSupplier: selectSupplier,
            clearSupplier: clearSupplier,
            closeLater: closeLater,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
