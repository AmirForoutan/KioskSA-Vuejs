import { computed, onMounted, ref, watch } from "vue";
import { can } from "../../../components/acl/can";
import { loadDesktopCreditTransactions } from "../../../services/desktopApi";
import { exportToExcel } from "../../utils/exportExcel";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import { escapeHtml, formatMoney, money, moneyPair, printReceipt, reportRange } from "./receiptPrint";
const props = defineProps();
const loading = ref(false);
const message = ref("");
const rows = ref([]);
useDesktopToastMessage(message);
const filtered = computed(() => {
    const s = String(props.query || "").trim();
    if (!s)
        return rows.value;
    return rows.value.filter((row) => `${row.TransactionId} ${row.CustomerId ?? ""} ${row.CustomerName ?? ""} ${row.Phone ?? ""} ${row.TransactionTypeName ?? ""} ${row.Description ?? ""} ${row.InvoiceNumber ?? ""}`.includes(s));
});
const increaseTotal = computed(() => sumByType([1]));
const creditUseTotal = computed(() => sumByType([2]));
const cashReceiptTotal = computed(() => sumByType([3]));
const refundTotal = computed(() => sumByType([4]));
onMounted(loadReport);
watch(() => props.refreshKey, loadReport);
async function loadReport() {
    loading.value = true;
    message.value = "";
    try {
        rows.value = await loadDesktopCreditTransactions({ FromDate: String(props.fromDate || "").trim(), ToDate: String(props.toDate || "").trim() });
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
function sumByType(types) {
    return filtered.value.filter((row) => types.includes(Number(row.TransactionType))).reduce((sum, row) => sum + money(row.Amount), 0);
}
function exportExcel() {
    if (!can("reports.export.excel"))
        return;
    exportToExcel(filtered.value, [{ key: "TransactionId", title: "شماره رسید" }, { key: "TransactionDate", title: "تاریخ رسید" }, { key: "CustomerName", title: "مشتری" }, { key: "Phone", title: "موبایل" }, { key: "TransactionTypeName", title: "نوع رسید" }, { key: "Amount", title: "مبلغ" }, { key: "InvoiceNumber", title: "فاکتور" }, { key: "InvoiceDate", title: "تاریخ فاکتور" }, { key: "Description", title: "توضیحات" }], "credit-receipts");
}
function printCreditReceiptsReport() {
    const rowsHtml = filtered.value.map((row) => `<tr><td>${escapeHtml(row.TransactionId)}</td><td>${escapeHtml(row.TransactionTypeName)}</td><td>${escapeHtml(row.CustomerName || "-")}</td><td class="num">${formatMoney(row.Amount)}</td></tr>`).join("");
    printReceipt("رسیدهای اعتبار", reportRange(props.fromDate || "", props.toDate || ""), `<div class="section"><div class="section-title">سرجمع رسیدها</div>${moneyPair("افزایش اعتبار", increaseTotal.value)}${moneyPair("مصرف اعتبار", creditUseTotal.value)}${moneyPair("پرداخت نقدی", cashReceiptTotal.value)}${moneyPair("عودت", refundTotal.value)}${moneyPair("تعداد رسید", filtered.value.length)}</div><div class="section"><div class="section-title">رسیدها</div><table><thead><tr><th>#</th><th>نوع</th><th>مشتری</th><th class="num">مبلغ</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>`);
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
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
/** @type {__VLS_StyleScopedClasses['cr-summary']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cr-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cr-actions" },
});
if (__VLS_ctx.can('reports.export.excel')) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.exportExcel) },
        ...{ class: "cr-btn" },
        disabled: (!__VLS_ctx.filtered.length),
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.printCreditReceiptsReport) },
    ...{ class: "cr-btn" },
    disabled: (!__VLS_ctx.filtered.length),
});
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
    (__VLS_ctx.money(row.Amount).toLocaleString());
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (row.InvoiceNumber || "-");
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (row.Description || "-");
}
/** @type {__VLS_StyleScopedClasses['cr-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['cr-btn']} */ ;
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
            money: money,
            loading: loading,
            message: message,
            filtered: filtered,
            increaseTotal: increaseTotal,
            creditUseTotal: creditUseTotal,
            cashReceiptTotal: cashReceiptTotal,
            refundTotal: refundTotal,
            exportExcel: exportExcel,
            printCreditReceiptsReport: printCreditReceiptsReport,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
