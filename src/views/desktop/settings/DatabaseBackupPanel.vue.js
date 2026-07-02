import { onMounted, ref } from "vue";
import { can } from "../../../components/acl/can";
import { createDbBackup, getDbBackupPath, saveDbBackupPath, selectDbBackupPath } from "../../../services/dbBackupApi";
const backupPath = ref("");
const loading = ref(false);
const message = ref("");
onMounted(loadSavedPath);
async function loadSavedPath() {
    if (!can("backup.database"))
        return;
    try {
        const result = await getDbBackupPath();
        backupPath.value = String(result.path || result.backupPath || "");
    }
    catch {
        backupPath.value = "";
    }
}
async function choosePathAndBackup() {
    if (!can("backup.database"))
        return;
    loading.value = true;
    message.value = "";
    try {
        const selected = await selectDbBackupPath();
        backupPath.value = String(selected.path || selected.backupPath || backupPath.value || "");
        if (!backupPath.value.trim()) {
            message.value = selected.message || "انتخاب مسیر لغو شد";
            return;
        }
        const result = await createDbBackup(backupPath.value.trim());
        message.value = `${result.message || "بکاپ ساخته شد"}${result.path ? ` - ${result.path}` : ""}`;
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در انتخاب مسیر یا گرفتن بکاپ";
    }
    finally {
        loading.value = false;
    }
}
async function savePathOnly() {
    if (!can("backup.database"))
        return;
    if (!backupPath.value.trim()) {
        message.value = "مسیر را وارد یا انتخاب کنید";
        return;
    }
    loading.value = true;
    message.value = "";
    try {
        const result = await saveDbBackupPath(backupPath.value.trim());
        backupPath.value = String(result.path || result.backupPath || backupPath.value);
        message.value = result.message || "مسیر ذخیره شد";
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در ذخیره مسیر";
    }
    finally {
        loading.value = false;
    }
}
async function runBackup() {
    if (!can("backup.database"))
        return;
    if (!backupPath.value.trim()) {
        message.value = "مسیر را وارد یا انتخاب کنید";
        return;
    }
    loading.value = true;
    message.value = "";
    try {
        const result = await createDbBackup(backupPath.value.trim());
        backupPath.value = String(result.backupPath || backupPath.value);
        message.value = `${result.message || "بکاپ ساخته شد"}${result.path ? ` - ${result.path}` : ""}`;
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در گرفتن بکاپ";
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
/** @type {__VLS_StyleScopedClasses['path-row']} */ ;
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "path-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    disabled: (!__VLS_ctx.can('backup.database') || __VLS_ctx.loading),
    placeholder: "مسیر پوشه ذخیره‌سازی",
});
(__VLS_ctx.backupPath);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.choosePathAndBackup) },
    ...{ class: "s-btn" },
    type: "button",
    disabled: (!__VLS_ctx.can('backup.database') || __VLS_ctx.loading),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "backup-actions" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.savePathOnly) },
    ...{ class: "s-btn" },
    disabled: (!__VLS_ctx.can('backup.database') || __VLS_ctx.loading || !__VLS_ctx.backupPath.trim()),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.runBackup) },
    ...{ class: "s-btn primary" },
    disabled: (!__VLS_ctx.can('backup.database') || __VLS_ctx.loading || !__VLS_ctx.backupPath.trim()),
});
(__VLS_ctx.loading ? "در حال عملیات" : "بکاپ با مسیر فعلی");
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
/** @type {__VLS_StyleScopedClasses['path-row']} */ ;
/** @type {__VLS_StyleScopedClasses['s-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['s-btn']} */ ;
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
            choosePathAndBackup: choosePathAndBackup,
            savePathOnly: savePathOnly,
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
