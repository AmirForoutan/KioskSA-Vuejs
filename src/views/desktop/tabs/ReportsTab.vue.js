import { computed, nextTick, onMounted, ref } from "vue";
import "@majidh1/jalalidatepicker";
import "@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css";
import { setupJalaliDateInputs } from "../../../utilities";
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
const from = ref("");
const to = ref("");
const q = ref("");
const refreshKey = ref(0);
const activeTitle = computed(() => items.find((item) => item.key === active.value)?.title || "گزارشات");
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
onMounted(() => setupJalaliDateInputs());
async function applyFilters() {
    refreshKey.value += 1;
    await nextTick();
    setupJalaliDateInputs();
}
function clearFilters() {
    q.value = "";
    from.value = "";
    to.value = "";
    applyFilters();
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['rp-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-filter-title']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-filter-title']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-input']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-action']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-action']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-head']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-filter-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-head']} */ ;
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
    ...{ class: "rp-filter-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rp-filter-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.activeTitle);
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onKeyup: (__VLS_ctx.applyFilters) },
    ...{ class: "rp-input search" },
    placeholder: "جستجوی مشترک: مشتری، موبایل، شماره فاکتور، کالا، رسید...",
});
(__VLS_ctx.q);
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "rp-input" },
    placeholder: "از تاریخ",
    readonly: true,
    'data-jdp': true,
});
(__VLS_ctx.from);
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "rp-input" },
    placeholder: "تا تاریخ",
    readonly: true,
    'data-jdp': true,
});
(__VLS_ctx.to);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.applyFilters) },
    ...{ class: "rp-action primary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.clearFilters) },
    ...{ class: "rp-action" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rp-body" },
});
const __VLS_0 = ((__VLS_ctx.ActiveCmp));
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    fromDate: (__VLS_ctx.from),
    toDate: (__VLS_ctx.to),
    query: (__VLS_ctx.q),
    refreshKey: (__VLS_ctx.refreshKey),
}));
const __VLS_2 = __VLS_1({
    fromDate: (__VLS_ctx.from),
    toDate: (__VLS_ctx.to),
    query: (__VLS_ctx.q),
    refreshKey: (__VLS_ctx.refreshKey),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['rp-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-head']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-title']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-filter-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-filter-title']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-input']} */ ;
/** @type {__VLS_StyleScopedClasses['search']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-input']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-input']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-action']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-action']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-body']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            items: items,
            active: active,
            from: from,
            to: to,
            q: q,
            refreshKey: refreshKey,
            activeTitle: activeTitle,
            ActiveCmp: ActiveCmp,
            applyFilters: applyFilters,
            clearFilters: clearFilters,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
