import { computed, onMounted, ref } from "vue";
import { can } from "../../../components/acl/can";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import { deleteDesktopCustomer, loadDesktopCustomers, manageDesktopCredit, saveDesktopCustomer, } from "../../../services/desktopApi";
const q = ref("");
const rows = ref([]);
const loading = ref(false);
const saving = ref(false);
const deletingCustomerId = ref(null);
const message = ref("");
const editor = ref(null);
const originalCredit = ref(0);
useDesktopToastMessage(message);
const filtered = computed(() => {
    const s = q.value.trim();
    if (!s)
        return rows.value;
    return rows.value.filter((row) => `${row.FullName ?? ""} ${row.PhoneNumber ?? ""}`.includes(s));
});
onMounted(loadRows);
function amount(value) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? Math.round(numberValue) : 0;
}
function responseIsOk(response) {
    return response.status === true || response.status === "true" || response.status === "ok" || response.status === undefined;
}
function responseMessage(response, fallback) {
    return response.message || response.Message || fallback;
}
function customerIdOf(customer) {
    return customer.CustomerId ?? customer.UserId ?? 0;
}
function hasInvoices(customer) {
    return amount(customer.TotalOrders) > 0;
}
async function loadRows() {
    loading.value = true;
    message.value = "";
    try {
        rows.value = await loadDesktopCustomers(q.value.trim());
        if (!rows.value.length)
            message.value = "مشتری‌ای برای نمایش پیدا نشد";
    }
    catch (error) {
        rows.value = [];
        message.value = error instanceof Error ? error.message : "خطا در دریافت مشتری‌ها";
    }
    finally {
        loading.value = false;
    }
}
function add() {
    originalCredit.value = 0;
    editor.value = {
        CustomerId: 0,
        FullName: "",
        PhoneNumber: "",
        CreditBalance: 0,
        Notes: "",
        IsActive: true,
    };
}
function edit(id) {
    const row = rows.value.find((item) => String(item.CustomerId) === String(id));
    if (row) {
        originalCredit.value = amount(row.CreditBalance);
        editor.value = { ...row };
    }
}
async function save() {
    if (!editor.value)
        return;
    saving.value = true;
    message.value = "";
    try {
        const customer = { ...editor.value, CreditBalance: amount(editor.value.CreditBalance) };
        const customerId = customer.CustomerId ?? customer.UserId ?? 0;
        const isExistingCustomer = Number(customerId) > 0;
        const nextCredit = amount(customer.CreditBalance);
        const creditDecrease = originalCredit.value - nextCredit;
        if (isExistingCustomer && creditDecrease > 0) {
            const detailResult = await saveDesktopCustomer({ ...customer, CreditBalance: originalCredit.value });
            if (!responseIsOk(detailResult)) {
                throw new Error(responseMessage(detailResult, "خطا در ذخیره مشتری"));
            }
            const creditResult = await manageDesktopCredit({
                CustomerId: customerId,
                TransactionType: 2,
                Amount: creditDecrease,
                Description: "کاهش اعتبار در هنگام ویرایش مشتری",
            });
            if (!responseIsOk(creditResult)) {
                throw new Error(responseMessage(creditResult, "خطا در کاهش اعتبار مشتری"));
            }
        }
        else {
            const result = await saveDesktopCustomer(customer);
            if (!responseIsOk(result)) {
                throw new Error(responseMessage(result, "خطا در ذخیره مشتری"));
            }
        }
        message.value = "مشتری ذخیره شد";
        editor.value = null;
        await loadRows();
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در ذخیره مشتری";
    }
    finally {
        saving.value = false;
    }
}
async function remove(customer) {
    const customerId = customerIdOf(customer);
    if (!customerId)
        return;
    if (hasInvoices(customer)) {
        message.value = "این مشتری فاکتور دارد و قابل حذف نیست";
        return;
    }
    const confirmed = window.confirm(`مشتری "${customer.FullName || customer.PhoneNumber || customerId}" حذف شود؟`);
    if (!confirmed)
        return;
    deletingCustomerId.value = customerId;
    message.value = "";
    try {
        const result = await deleteDesktopCustomer(customerId);
        if (!responseIsOk(result)) {
            throw new Error(responseMessage(result, "خطا در حذف مشتری"));
        }
        message.value = responseMessage(result, "مشتری حذف شد");
        await loadRows();
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در حذف مشتری";
    }
    finally {
        deletingCustomerId.value = null;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['m-input']} */ ;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['status']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "m-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "m-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "m-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "m-sub" },
});
(__VLS_ctx.filtered.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "m-tools" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onKeyup: (__VLS_ctx.loadRows) },
    ...{ class: "m-input" },
    placeholder: "جستجوی نام یا موبایل...",
});
(__VLS_ctx.q);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadRows) },
    ...{ class: "m-btn" },
    disabled: (__VLS_ctx.loading),
});
if (__VLS_ctx.can('manage.customers')) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.add) },
        ...{ class: "m-btn primary" },
    });
}
if (__VLS_ctx.message) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "m-message" },
    });
    (__VLS_ctx.message);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "m-table" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "m-tr m-th" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "m-empty" },
    });
}
for (const [r] of __VLS_getVForSourceType((__VLS_ctx.filtered))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "m-tr" },
        key: (r.CustomerId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (r.CustomerId);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bold" },
    });
    (r.FullName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (r.PhoneNumber);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ style: ({ color: Number(r.CreditBalance || 0) >= 0 ? '#86efac' : '#fca5a5' }) },
    });
    (Number(r.CreditBalance || 0).toLocaleString());
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "status" },
        ...{ class: ({ off: r.IsActive === false }) },
    });
    (r.IsActive === false ? "غیرفعال" : "فعال");
    if (__VLS_ctx.can('manage.customers')) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row-actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.can('manage.customers')))
                        return;
                    __VLS_ctx.edit(r.CustomerId);
                } },
            ...{ class: "m-btn small" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.can('manage.customers')))
                        return;
                    __VLS_ctx.remove(r);
                } },
            ...{ class: "m-btn small danger" },
            disabled: (__VLS_ctx.deletingCustomerId === (r.CustomerId ?? r.UserId) || __VLS_ctx.hasInvoices(r)),
            title: (__VLS_ctx.hasInvoices(r) ? 'این مشتری فاکتور دارد و قابل حذف نیست' : 'حذف مشتری'),
        });
        (__VLS_ctx.deletingCustomerId === (r.CustomerId ?? r.UserId) ? "..." : "حذف");
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    }
}
if (__VLS_ctx.editor) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-overlay" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (Number(__VLS_ctx.editor.CustomerId || 0) > 0 ? "ویرایش مشتری" : "افزودن مشتری");
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.editor))
                    return;
                __VLS_ctx.editor = null;
            } },
        ...{ class: "close-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({});
    (__VLS_ctx.editor.FullName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        maxlength: "11",
    });
    (__VLS_ctx.editor.PhoneNumber);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
    });
    (__VLS_ctx.editor.CreditBalance);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
        value: (__VLS_ctx.editor.Notes),
        rows: "3",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "check-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "checkbox",
    });
    (__VLS_ctx.editor.IsActive);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-footer" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.editor))
                    return;
                __VLS_ctx.editor = null;
            } },
        ...{ class: "m-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.save) },
        ...{ class: "m-btn primary" },
        disabled: (__VLS_ctx.saving),
    });
    (__VLS_ctx.saving ? "در حال ذخیره" : "ذخیره");
}
/** @type {__VLS_StyleScopedClasses['m-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['m-head']} */ ;
/** @type {__VLS_StyleScopedClasses['m-title']} */ ;
/** @type {__VLS_StyleScopedClasses['m-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['m-tools']} */ ;
/** @type {__VLS_StyleScopedClasses['m-input']} */ ;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['m-message']} */ ;
/** @type {__VLS_StyleScopedClasses['m-table']} */ ;
/** @type {__VLS_StyleScopedClasses['m-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['m-th']} */ ;
/** @type {__VLS_StyleScopedClasses['m-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['m-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
/** @type {__VLS_StyleScopedClasses['status']} */ ;
/** @type {__VLS_StyleScopedClasses['off']} */ ;
/** @type {__VLS_StyleScopedClasses['row-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-content']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-header']} */ ;
/** @type {__VLS_StyleScopedClasses['close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-body']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['check-row']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            can: can,
            q: q,
            loading: loading,
            saving: saving,
            deletingCustomerId: deletingCustomerId,
            message: message,
            editor: editor,
            filtered: filtered,
            hasInvoices: hasInvoices,
            loadRows: loadRows,
            add: add,
            edit: edit,
            save: save,
            remove: remove,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
