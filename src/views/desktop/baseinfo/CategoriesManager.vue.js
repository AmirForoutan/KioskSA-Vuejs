import { computed, onMounted, ref } from "vue";
import CatalogImageModal from "../../../components/CatalogImageModal.vue";
import CategoryModal from "../../../components/CategoryModal.vue";
import { can } from "../../../components/acl/can";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import { loadDesktopCatalog, saveDesktopCategory, } from "../../../services/desktopApi";
const q = ref("");
const rows = ref([]);
const loading = ref(false);
const message = ref("");
const editor = ref(null);
const imageVersion = ref(Date.now());
const imageEditor = ref(null);
useDesktopToastMessage(message);
const filtered = computed(() => {
    const s = q.value.trim();
    if (!s)
        return rows.value;
    return rows.value.filter((row) => `${row.GroupCode ?? ""} ${row.GroupName ?? ""}`.includes(s));
});
onMounted(loadRows);
async function loadRows() {
    loading.value = true;
    message.value = "";
    try {
        const result = await loadDesktopCatalog(0);
        rows.value = result.categories;
        if (!rows.value.length)
            message.value = "دسته‌بندی‌ای از سرویس دریافت نشد";
    }
    catch (error) {
        rows.value = [];
        message.value = error instanceof Error ? error.message : "خطا در دریافت دسته‌بندی‌ها";
    }
    finally {
        loading.value = false;
    }
}
function add() {
    editor.value = { GroupId: 0, GroupCode: "", GroupName: "", IsActive: true };
}
function edit(id) {
    const row = rows.value.find((item) => String(item.GroupId) === String(id));
    if (row)
        editor.value = { ...row };
}
async function save(category) {
    message.value = "";
    try {
        const result = await saveDesktopCategory(category);
        message.value = result.message || "دسته‌بندی ذخیره شد";
        editor.value = null;
        await loadRows();
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در ذخیره دسته‌بندی";
    }
}
function getCategoryImage(groupCode) {
    return `/img/groups/${groupCode}.png?v=${imageVersion.value}`;
}
function setImage(id) {
    const row = rows.value.find((item) => String(item.GroupId) === String(id));
    if (!row?.GroupCode) {
        message.value = "برای آپلود تصویر، کد دسته‌بندی لازم است";
        return;
    }
    imageEditor.value = {
        itemId: row.GroupCode,
        itemType: "category",
        title: row.GroupName || `دسته‌بندی ${row.GroupCode}`,
        currentImage: getCategoryImage(row.GroupCode),
    };
}
function refreshImage(payload) {
    imageVersion.value = Date.now();
    if (imageEditor.value) {
        imageEditor.value = {
            ...imageEditor.value,
            currentImage: getCategoryImage(imageEditor.value.itemId),
        };
    }
    message.value = payload?.removed ? "تصویر دسته‌بندی حذف شد" : "تصویر دسته‌بندی ذخیره شد";
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['m-input']} */ ;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['status']} */ ;
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
    ...{ class: "m-input" },
    placeholder: "جستجوی کد یا نام...",
});
(__VLS_ctx.q);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadRows) },
    ...{ class: "m-btn" },
    disabled: (__VLS_ctx.loading),
});
if (__VLS_ctx.can('manage.categories')) {
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
        key: (r.GroupId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (r.GroupId);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (r.GroupCode);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bold" },
    });
    (r.GroupName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "status" },
        ...{ class: ({ off: r.IsActive === false }) },
    });
    (r.IsActive === false ? "غیرفعال" : "فعال");
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.setImage(r.GroupId);
            } },
        ...{ class: "m-btn small" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    if (__VLS_ctx.can('manage.categories')) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.can('manage.categories')))
                        return;
                    __VLS_ctx.edit(r.GroupId);
                } },
            ...{ class: "m-btn small" },
        });
    }
}
if (__VLS_ctx.editor) {
    /** @type {[typeof CategoryModal, ]} */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(CategoryModal, new CategoryModal({
        ...{ 'onSave': {} },
        ...{ 'onClose': {} },
        category: (__VLS_ctx.editor),
        categories: (__VLS_ctx.rows),
    }));
    const __VLS_1 = __VLS_0({
        ...{ 'onSave': {} },
        ...{ 'onClose': {} },
        category: (__VLS_ctx.editor),
        categories: (__VLS_ctx.rows),
    }, ...__VLS_functionalComponentArgsRest(__VLS_0));
    let __VLS_3;
    let __VLS_4;
    let __VLS_5;
    const __VLS_6 = {
        onSave: (__VLS_ctx.save)
    };
    const __VLS_7 = {
        onClose: (...[$event]) => {
            if (!(__VLS_ctx.editor))
                return;
            __VLS_ctx.editor = null;
        }
    };
    var __VLS_2;
}
if (__VLS_ctx.imageEditor) {
    /** @type {[typeof CatalogImageModal, ]} */ ;
    // @ts-ignore
    const __VLS_8 = __VLS_asFunctionalComponent(CatalogImageModal, new CatalogImageModal({
        ...{ 'onSaved': {} },
        ...{ 'onClose': {} },
        currentImage: (__VLS_ctx.imageEditor.currentImage),
        itemId: (__VLS_ctx.imageEditor.itemId),
        itemType: (__VLS_ctx.imageEditor.itemType),
        title: (__VLS_ctx.imageEditor.title),
    }));
    const __VLS_9 = __VLS_8({
        ...{ 'onSaved': {} },
        ...{ 'onClose': {} },
        currentImage: (__VLS_ctx.imageEditor.currentImage),
        itemId: (__VLS_ctx.imageEditor.itemId),
        itemType: (__VLS_ctx.imageEditor.itemType),
        title: (__VLS_ctx.imageEditor.title),
    }, ...__VLS_functionalComponentArgsRest(__VLS_8));
    let __VLS_11;
    let __VLS_12;
    let __VLS_13;
    const __VLS_14 = {
        onSaved: (__VLS_ctx.refreshImage)
    };
    const __VLS_15 = {
        onClose: (...[$event]) => {
            if (!(__VLS_ctx.imageEditor))
                return;
            __VLS_ctx.imageEditor = null;
        }
    };
    var __VLS_10;
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
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            CatalogImageModal: CatalogImageModal,
            CategoryModal: CategoryModal,
            can: can,
            q: q,
            rows: rows,
            loading: loading,
            message: message,
            editor: editor,
            imageEditor: imageEditor,
            filtered: filtered,
            loadRows: loadRows,
            add: add,
            edit: edit,
            save: save,
            setImage: setImage,
            refreshImage: refreshImage,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
