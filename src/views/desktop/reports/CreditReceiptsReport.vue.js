import { computed, onMounted, ref } from "vue";
import "@majidh1/jalalidatepicker";
import "@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css";
import { can } from "../../../components/acl/can";
import { loadDesktopCreditTransactions, } from "../../../services/desktopApi";
import { exportToExcel } from "../../utils/exportExcel";
import { setupJalaliDateInputs } from "../../../utilities";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
const from = ref("");
const to = ref("");
const q = ref("");
const loading = ref(false);
const message = ref("");
const rows = ref([]);
useDesktopToastMessage(message);
const filtered = computed(() => {
    const s = q.value.trim();
    if (!s)
        return rows.value;
    return rows.value.filter((row) => `${row.TransactionId} ${row.CustomerName ?? ""} ${row.Phone ?? ""} ${row.TransactionTypeName ?? ""} ${row.Description ?? ""} ${row.InvoiceNumber ?? ""}`.includes(s));
});
const increaseTotal = computed(() => sumByType([1]));
const creditUseTotal = computed(() => sumByType([2]));
const cashReceiptTotal = computed(() => sumByType([3]));
const refundTotal = computed(() => sumByType([4]));
onMounted(() => {
    setupDatePicker();
    loadReport();
});
function setupDatePicker() {
    setupJalaliDateInputs();
}
async function loadReport() {
    loading.value = true;
    message.value = "";
    try {
        rows.value = await loadDesktopCreditTransactions({
            FromDate: from.value.trim(),
            ToDate: to.value.trim(),
        });
        if (!rows.value.length)
            message.value = "رسید مالی برای این بازه پیدا نشد";
    }
    catch (error) {
        rows.value = [];
        message.value = error instanceof Error ? error.message : "خطا در دریافت رسیدهای مالی";
    }
    finally {
        loading.value = false;
    }
}
function amount(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}
function sumByType(types) {
    return filtered.value
        .filter((row) => types.includes(Number(row.TransactionType)))
        .reduce((sum, row) => sum + amount(row.Amount), 0);
}
function exportExcel() {
    if (!can("reports.export.excel"))
        return;
    exportToExcel(filtered.value, [
        { key: "TransactionId", title: "شماره رسید" },
        { key: "TransactionDate", title: "تاریخ رسید" },
        { key: "CustomerName", title: "مشتری" },
        { key: "Phone", title: "موبایل" },
        { key: "TransactionTypeName", title: "نوع رسید" },
        { key: "Amount", title: "مبلغ" },
        { key: "InvoiceNumber", title: "فاکتور" },
        { key: "InvoiceDate", title: "تاریخ فاکتور" },
        { key: "Description", title: "توضیحات" },
    ], "credit-receipts");
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['cr-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-message']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['type-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['type-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['type-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['type-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-summary']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cr-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cr-toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "cr-input" },
    placeholder: "جستجوی مشتری، موبایل، شماره رسید یا فاکتور...",
});
(__VLS_ctx.q);
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "cr-input" },
    placeholder: "از تاریخ",
    readonly: true,
    'data-jdp': true,
});
(__VLS_ctx.from);
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "cr-input" },
    placeholder: "تا تاریخ",
    readonly: true,
    'data-jdp': true,
});
(__VLS_ctx.to);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadReport) },
    ...{ class: "cr-btn primary" },
    disabled: (__VLS_ctx.loading),
});
(__VLS_ctx.loading ? "در حال دریافت" : "اعمال فیلتر");
if (__VLS_ctx.can('reports.export.excel')) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.exportExcel) },
        ...{ class: "cr-btn" },
        disabled: (!__VLS_ctx.filtered.length),
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cr-summary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "green" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.increaseTotal.toLocaleString());
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "blue" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.creditUseTotal.toLocaleString());
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "amber" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.cashReceiptTotal.toLocaleString());
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rose" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.refundTotal.toLocaleString());
if (__VLS_ctx.message) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cr-message" },
    });
    (__VLS_ctx.message);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cr-table" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cr-tr cr-th" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cr-empty" },
    });
}
for (const [row] of __VLS_getVForSourceType((__VLS_ctx.filtered))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cr-tr" },
        key: (row.TransactionId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bold" },
    });
    (row.TransactionId);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (row.TransactionDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bold" },
    });
    (row.CustomerName || "بدون مشتری");
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (row.Phone || "-");
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "type-pill" },
        ...{ class: (`t-${row.TransactionType}`) },
    });
    (row.TransactionTypeName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bold" },
    });
    (__VLS_ctx.amount(row.Amount).toLocaleString());
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (row.InvoiceNumber || "-");
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (row.Description || "-");
}
/** @type {__VLS_StyleScopedClasses['cr-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-input']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-input']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-input']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['green']} */ ;
/** @type {__VLS_StyleScopedClasses['blue']} */ ;
/** @type {__VLS_StyleScopedClasses['amber']} */ ;
/** @type {__VLS_StyleScopedClasses['rose']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-message']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-table']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-th']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
/** @type {__VLS_StyleScopedClasses['type-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            can: can,
            from: from,
            to: to,
            q: q,
            loading: loading,
            message: message,
            filtered: filtered,
            increaseTotal: increaseTotal,
            creditUseTotal: creditUseTotal,
            cashReceiptTotal: cashReceiptTotal,
            refundTotal: refundTotal,
            loadReport: loadReport,
            amount: amount,
            exportExcel: exportExcel,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
