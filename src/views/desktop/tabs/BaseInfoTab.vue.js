import { computed, ref } from "vue";
import { can } from "../../../components/acl/can";
import ProductsManager from "../baseinfo/ProductsManager.vue";
import CategoriesManager from "../baseinfo/CategoriesManager.vue";
import ToppingsManager from "../baseinfo/ToppingsManager.vue";
import CustomersManager from "../baseinfo/CustomersManager.vue";
import UsersManager from "../baseinfo/UsersManager.vue";
const items = computed(() => {
    const x = [
        { key: "products", title: "کالاها" },
        { key: "categories", title: "دسته‌بندی‌ها" },
        { key: "toppings", title: "تاپینگ‌ها" },
        { key: "customers", title: "مشتری‌ها" },
    ];
    if (can("users.manage"))
        x.push({ key: "users", title: "کاربران و دسترسی" });
    return x;
});
const active = ref(items.value[0]?.key ?? "products");
const ActiveCmp = computed(() => {
    switch (active.value) {
        case "categories":
            return CategoriesManager;
        case "toppings":
            return ToppingsManager;
        case "customers":
            return CustomersManager;
        case "users":
            return UsersManager;
        case "products":
        default:
            return ProductsManager;
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['bi-side-btn']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "bi-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "bi-side" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "bi-side-title" },
});
for (const [i] of __VLS_getVForSourceType((__VLS_ctx.items))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.active = i.key;
            } },
        key: (i.key),
        ...{ class: "bi-side-btn" },
        ...{ class: ({ active: i.key === __VLS_ctx.active }) },
    });
    (i.title);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "bi-main" },
});
const __VLS_0 = ((__VLS_ctx.ActiveCmp));
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['bi-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-side']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-side-title']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-side-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-main']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            items: items,
            active: active,
            ActiveCmp: ActiveCmp,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
