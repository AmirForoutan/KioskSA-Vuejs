import { computed, ref } from "vue";
import CreditReceiptsReport from "../reports/CreditReceiptsReport.vue";
import CustomerLedgerReport from "../reports/CustomerLedgerReport.vue";
import ItemSalesReport from "../reports/ItemSalesReport.vue";
import SalesDashboardReport from "../reports/SalesDashboardReport.vue";
import SalesReviewReport from "../reports/SalesReviewReport.vue";
const items = [
    { key: "dashboard", title: "داشبورد فروش" },
    { key: "sales", title: "مرور فروش" },
    { key: "items", title: "فروش اقلام" },
    { key: "ledger", title: "گزارش مشتریان" },
    { key: "credits", title: "رسیدهای اعتبار" },
];
const active = ref("dashboard");
const ActiveCmp = computed(() => {
    if (active.value === "sales")
        return SalesReviewReport;
    if (active.value === "items")
        return ItemSalesReport;
    if (active.value === "ledger")
        return CustomerLedgerReport;
    if (active.value === "credits")
        return CreditReceiptsReport;
    return SalesDashboardReport;
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['rp-tab']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rp-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rp-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rp-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rp-tabs" },
});
for (const [i] of __VLS_getVForSourceType((__VLS_ctx.items))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.active = i.key;
            } },
        key: (i.key),
        ...{ class: "rp-tab" },
        ...{ class: ({ active: i.key === __VLS_ctx.active }) },
    });
    (i.title);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rp-body" },
});
const __VLS_0 = ((__VLS_ctx.ActiveCmp));
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['rp-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-head']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-title']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-body']} */ ;
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
