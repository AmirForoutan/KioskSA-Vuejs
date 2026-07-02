import { ref } from "vue";
import { can } from "../../../components/acl/can";
import { createDbBackup } from "../../../services/dbBackupApi";
const backupPath = ref("");
const loading = ref(false);
const message = ref("");
async function runBackup() {
    if (!can("backup.database"))
        return;
    if (!backupPath.value.trim()) {
        message.value = "مسیر بکاپ را وارد کنید";
        return;
    }
    loading.value = true;
    message.value = "";
    try {
        const result = await createDbBackup(backupPath.value.trim());
        message.value = result.message || `بکاپ ساخته شد: ${result.path || backupPath.value}`;
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در گرفتن بکاپ دیتابیس";
    }
    finally {
        loading.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['s-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['s-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-message']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "backup-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "panel-note" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    disabled: (!__VLS_ctx.can('backup.database') || __VLS_ctx.loading),
    placeholder: "\u0645\u062b\u0644\u0627\u0020\u0044\u003a\u005c\u005c\u0050\u0061\u0072\u0067\u0061\u0073\u0042\u0061\u0063\u006b\u0075\u0070\u0073\u0020\u06cc\u0627\u0020\u0044\u003a\u005c\u005c\u0050\u0061\u0072\u0067\u0061\u0073\u0042\u0061\u0063\u006b\u0075\u0070\u0073\u005c\u005c\u0062\u0061\u0063\u006b\u0075\u0070\u002e\u0062\u0061\u006b",
});
(__VLS_ctx.backupPath);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "backup-actions" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.runBackup) },
    ...{ class: "s-btn primary" },
    disabled: (!__VLS_ctx.can('backup.database') || __VLS_ctx.loading),
});
(__VLS_ctx.loading ? "در حال گرفتن بکاپ" : "گرفتن بکاپ کامل");
if (!__VLS_ctx.can('backup.database')) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "backup-message warn" },
    });
}
if (__VLS_ctx.message) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "backup-message" },
    });
    (__VLS_ctx.message);
}
/** @type {__VLS_StyleScopedClasses['backup-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-note']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['s-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-message']} */ ;
/** @type {__VLS_StyleScopedClasses['warn']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-message']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            can: can,
            backupPath: backupPath,
            loading: loading,
            message: message,
            runBackup: runBackup,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
