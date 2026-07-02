import { computed, onMounted, ref } from "vue";
import { can } from "../../../components/acl/can";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import { loadDesktopAccess, saveDesktopRole, saveDesktopUser, } from "../../../services/desktopApi";
const permsCatalog = [
    { key: "view.sales", title: "مشاهده سفارشگیری" },
    { key: "view.baseInfo", title: "مشاهده اطلاعات پایه" },
    { key: "view.reports", title: "مشاهده گزارشات" },
    { key: "view.settings", title: "مشاهده تنظیمات" },
    { key: "manage.products", title: "مدیریت کالا" },
    { key: "manage.categories", title: "مدیریت دسته‌بندی" },
    { key: "manage.toppings", title: "مدیریت تاپینگ" },
    { key: "manage.customers", title: "مدیریت مشتری" },
    { key: "sales.discount.percent", title: "تخفیف درصدی" },
    { key: "sales.discount.amount", title: "تخفیف مبلغی" },
    { key: "reports.export.excel", title: "خروجی اکسل گزارشات" },
    { key: "reports.invoices.edit", title: "ویرایش فاکتور گزارشات" },
    { key: "reports.invoices.delete", title: "حذف فاکتور گزارشات" },
    { key: "users.manage", title: "مدیریت کاربران" },
    { key: "settings.manage", title: "مدیریت تنظیمات" },
];
const roles = ref([]);
const users = ref([]);
const selectedRoleId = ref(0);
const editorUser = ref(null);
const loading = ref(false);
const message = ref("");
useDesktopToastMessage(message);
const selectedRole = computed(() => roles.value.find((role) => role.id === selectedRoleId.value) || roles.value[0]);
onMounted(loadAccess);
async function loadAccess() {
    loading.value = true;
    message.value = "";
    try {
        const data = await loadDesktopAccess();
        roles.value = data.roles;
        users.value = data.users.map(normalizeUser);
        selectedRoleId.value = roles.value[0]?.id ?? 0;
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در دریافت کاربران";
    }
    finally {
        loading.value = false;
    }
}
function togglePerm(p) {
    const role = selectedRole.value;
    if (!role)
        return;
    if (role.perms.includes(p))
        role.perms = role.perms.filter((x) => x !== p);
    else
        role.perms.push(p);
}
function addRole() {
    const nextId = Math.max(0, ...roles.value.map((role) => role.id)) + 1;
    const role = { id: nextId, title: `نقش ${nextId}`, perms: ["view.sales"] };
    roles.value.push(role);
    selectedRoleId.value = role.id;
}
async function saveRole() {
    if (!selectedRole.value)
        return;
    await saveAndReload(() => saveDesktopRole(selectedRole.value));
}
function addUser() {
    editorUser.value = {
        id: 0,
        username: "",
        password: "",
        roleId: selectedRole.value?.id ?? roles.value[0]?.id ?? 0,
        isActive: true,
        discountPercentLimit: 0,
        discountAmountLimit: 0,
    };
}
function editUser(user) {
    editorUser.value = { ...normalizeUser(user), password: "" };
}
async function saveUser() {
    if (!editorUser.value)
        return;
    await saveAndReload(() => saveDesktopUser(buildUserPayload(editorUser.value)));
    editorUser.value = null;
}
async function saveAndReload(action) {
    message.value = "";
    try {
        const result = await action();
        message.value = result.message || "ذخیره انجام شد";
        await loadAccess();
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در ذخیره";
    }
}
function roleTitle(roleId) {
    return roles.value.find((role) => role.id === roleId)?.title ?? "بدون نقش";
}
function normalizeLimit(value, max) {
    const n = Number(value);
    const normalized = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
    return max ? Math.min(normalized, max) : normalized;
}
function normalizeUser(user) {
    return {
        ...user,
        discountPercentLimit: normalizeLimit(user.discountPercentLimit ?? user.DiscountPercentLimit, 100),
        discountAmountLimit: normalizeLimit(user.discountAmountLimit ?? user.DiscountAmountLimit),
    };
}
function buildUserPayload(user) {
    const discountPercentLimit = normalizeLimit(user.discountPercentLimit ?? user.DiscountPercentLimit, 100);
    const discountAmountLimit = normalizeLimit(user.discountAmountLimit ?? user.DiscountAmountLimit);
    return {
        ...user,
        discountPercentLimit,
        discountAmountLimit,
        DiscountPercentLimit: discountPercentLimit,
        DiscountAmountLimit: discountAmountLimit,
    };
}
function formatLimit(value, suffix = "") {
    const n = normalizeLimit(value);
    return n > 0 ? `${n.toLocaleString()}${suffix}` : "بدون سقف";
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['u-input']} */ ;
/** @type {__VLS_StyleScopedClasses['u-select']} */ ;
/** @type {__VLS_StyleScopedClasses['u-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['u-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['u-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['perm']} */ ;
// CSS variable injection 
// CSS variable injection end 
if (__VLS_ctx.can('users.manage')) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "u-shell" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "u-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "u-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "u-sub" },
    });
    (__VLS_ctx.users.length);
    (__VLS_ctx.roles.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "u-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.loadAccess) },
        ...{ class: "u-btn" },
        disabled: (__VLS_ctx.loading),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.addUser) },
        ...{ class: "u-btn primary" },
    });
    if (__VLS_ctx.message) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "u-message" },
        });
        (__VLS_ctx.message);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "u-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "u-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "u-card-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "u-title2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.addRole) },
        ...{ class: "u-btn small" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "u-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ class: "u-select" },
        value: (__VLS_ctx.selectedRoleId),
    });
    for (const [r] of __VLS_getVForSourceType((__VLS_ctx.roles))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (r.id),
            value: (r.id),
        });
        (r.title);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.saveRole) },
        ...{ class: "u-btn" },
        disabled: (!__VLS_ctx.selectedRole),
    });
    if (__VLS_ctx.selectedRole) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ class: "u-input" },
        });
        (__VLS_ctx.selectedRole.title);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "u-perms" },
    });
    for (const [p] of __VLS_getVForSourceType((__VLS_ctx.permsCatalog))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.can('users.manage')))
                        return;
                    __VLS_ctx.togglePerm(p.key);
                } },
            key: (p.key),
            ...{ class: "perm" },
            ...{ class: ({ on: __VLS_ctx.selectedRole?.perms.includes(p.key) }) },
        });
        (p.title);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "u-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "u-title2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "u-table" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "u-tr u-th" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    for (const [u] of __VLS_getVForSourceType((__VLS_ctx.users))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "u-tr" },
            key: (u.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (u.id);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bold" },
        });
        (u.username);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.roleTitle(u.roleId));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.formatLimit(u.discountPercentLimit, "%"));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.formatLimit(u.discountAmountLimit));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (u.isActive ? "فعال" : "غیرفعال");
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.can('users.manage')))
                        return;
                    __VLS_ctx.editUser(u);
                } },
            ...{ class: "u-btn small" },
        });
    }
    if (__VLS_ctx.editorUser) {
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
        (__VLS_ctx.editorUser.id ? "ویرایش کاربر" : "افزودن کاربر");
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.can('users.manage')))
                        return;
                    if (!(__VLS_ctx.editorUser))
                        return;
                    __VLS_ctx.editorUser = null;
                } },
            ...{ class: "close-btn" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ class: "u-input" },
        });
        (__VLS_ctx.editorUser.username);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ class: "u-input" },
            type: "password",
            placeholder: "برای عدم تغییر خالی بماند",
        });
        (__VLS_ctx.editorUser.password);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ class: "u-select" },
            value: (__VLS_ctx.editorUser.roleId),
        });
        for (const [r] of __VLS_getVForSourceType((__VLS_ctx.roles))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (r.id),
                value: (r.id),
            });
            (r.title);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "limit-grid" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ class: "u-input" },
            min: "0",
            max: "100",
            type: "number",
        });
        (__VLS_ctx.editorUser.discountPercentLimit);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ class: "u-input" },
            min: "0",
            type: "number",
        });
        (__VLS_ctx.editorUser.discountAmountLimit);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "check-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "checkbox",
        });
        (__VLS_ctx.editorUser.isActive);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-footer" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.can('users.manage')))
                        return;
                    if (!(__VLS_ctx.editorUser))
                        return;
                    __VLS_ctx.editorUser = null;
                } },
            ...{ class: "u-btn" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.saveUser) },
            ...{ class: "u-btn primary" },
        });
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "nope" },
    });
}
/** @type {__VLS_StyleScopedClasses['u-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['u-head']} */ ;
/** @type {__VLS_StyleScopedClasses['u-title']} */ ;
/** @type {__VLS_StyleScopedClasses['u-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['u-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['u-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['u-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['u-message']} */ ;
/** @type {__VLS_StyleScopedClasses['u-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['u-card']} */ ;
/** @type {__VLS_StyleScopedClasses['u-card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['u-title2']} */ ;
/** @type {__VLS_StyleScopedClasses['u-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['u-row']} */ ;
/** @type {__VLS_StyleScopedClasses['u-select']} */ ;
/** @type {__VLS_StyleScopedClasses['u-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['u-input']} */ ;
/** @type {__VLS_StyleScopedClasses['u-perms']} */ ;
/** @type {__VLS_StyleScopedClasses['perm']} */ ;
/** @type {__VLS_StyleScopedClasses['on']} */ ;
/** @type {__VLS_StyleScopedClasses['u-card']} */ ;
/** @type {__VLS_StyleScopedClasses['u-title2']} */ ;
/** @type {__VLS_StyleScopedClasses['u-table']} */ ;
/** @type {__VLS_StyleScopedClasses['u-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['u-th']} */ ;
/** @type {__VLS_StyleScopedClasses['u-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
/** @type {__VLS_StyleScopedClasses['u-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-content']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-header']} */ ;
/** @type {__VLS_StyleScopedClasses['close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-body']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['u-input']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['u-input']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['u-select']} */ ;
/** @type {__VLS_StyleScopedClasses['limit-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['u-input']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['u-input']} */ ;
/** @type {__VLS_StyleScopedClasses['check-row']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['u-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['u-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['nope']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            can: can,
            permsCatalog: permsCatalog,
            roles: roles,
            users: users,
            selectedRoleId: selectedRoleId,
            editorUser: editorUser,
            loading: loading,
            message: message,
            selectedRole: selectedRole,
            loadAccess: loadAccess,
            togglePerm: togglePerm,
            addRole: addRole,
            saveRole: saveRole,
            addUser: addUser,
            editUser: editUser,
            saveUser: saveUser,
            roleTitle: roleTitle,
            formatLimit: formatLimit,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
