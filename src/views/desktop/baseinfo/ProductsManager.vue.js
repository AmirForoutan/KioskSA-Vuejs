import { computed, onMounted, ref } from "vue";
import CatalogImageModal from "../../../components/CatalogImageModal.vue";
import ProductModal from "../../../components/ProductModal.vue";
import { can } from "../../../components/acl/can";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import { loadDesktopCatalog, saveDesktopProduct, } from "../../../services/desktopApi";
const fallbackCategories = [
    { GroupId: 1, GroupName: "عمومی" },
    { GroupId: 2, GroupName: "نوشیدنی" },
];
const fallbackRows = [
    {
        GoodsId: 1,
        GoodsCode: "1001",
        GoodsName: "کالای نمونه",
        GoodsDescription: "در صورت قطع سرویس نمایش داده می‌شود",
        GoodsGroupId: 1,
        GoodsPrice: 120000,
        TaxPercent: 0,
        DutyPercent: 0,
        PackingPrice: 0,
        StockInventory: 10,
        IsActive: true,
    },
];
const q = ref("");
const rows = ref([]);
const categories = ref([]);
const loading = ref(false);
const saving = ref(false);
const message = ref("");
const editorProduct = ref(null);
const imageVersion = ref(Date.now());
const imageEditor = ref(null);
useDesktopToastMessage(message);
const filtered = computed(() => {
    const s = q.value.trim().toLowerCase();
    if (!s)
        return rows.value;
    return rows.value.filter((x) => {
        const haystack = `${x.GoodsName ?? ""} ${x.GoodsCode ?? ""} ${categoryName(x.GoodsGroupId)}`.toLowerCase();
        return haystack.includes(s);
    });
});
onMounted(loadProducts);
async function loadProducts() {
    loading.value = true;
    message.value = "";
    try {
        const result = await loadDesktopCatalog(0);
        rows.value = result.goods.length ? result.goods : fallbackRows;
        categories.value = result.categories.length ? result.categories : fallbackCategories;
        if (!result.goods.length)
            message.value = "داده کالا از سرویس دریافت نشد؛ نمونه نمایش داده شد";
    }
    catch (error) {
        rows.value = fallbackRows;
        categories.value = fallbackCategories;
        message.value = error instanceof Error ? `${error.message} - نمونه نمایش داده شد` : "نمونه نمایش داده شد";
    }
    finally {
        loading.value = false;
    }
}
function categoryName(groupId) {
    return categories.value.find((category) => String(category.GroupId) === String(groupId))?.GroupName ?? "بدون دسته";
}
function newProduct() {
    return {
        GoodsId: 0,
        GoodsCode: "",
        GoodsName: "",
        GoodsDescription: "",
        GoodsGroupId: categories.value[0]?.GroupId ?? 0,
        GoodsPrice: 0,
        TaxPercent: 0,
        DutyPercent: 0,
        PackingPrice: 0,
        StockInventory: 0,
        IsActive: true,
        Saturday: true,
        FromTimeSaturday: "00:00",
        ToTimeSaturday: "23:59",
        Sunday: true,
        FromTimeSunday: "00:00",
        ToTimeSunday: "23:59",
        Monday: true,
        FromTimeMonday: "00:00",
        ToTimeMonday: "23:59",
        Tuesday: true,
        FromTimeTuesday: "00:00",
        ToTimeTuesday: "23:59",
        Wednesday: true,
        FromTimeWednesday: "00:00",
        ToTimeWednesday: "23:59",
        Thursday: true,
        FromTimeThursday: "00:00",
        ToTimeThursday: "23:59",
        Friday: true,
        FromTimeFriday: "00:00",
        ToTimeFriday: "23:59",
    };
}
function add() {
    editorProduct.value = newProduct();
}
function edit(id) {
    const product = rows.value.find((row) => String(row.GoodsId) === String(id));
    if (product)
        editorProduct.value = { ...product };
}
function closeEditor() {
    editorProduct.value = null;
}
async function save(product) {
    saving.value = true;
    message.value = "";
    try {
        const result = await saveDesktopProduct(product);
        const index = rows.value.findIndex((row) => String(row.GoodsId) === String(product.GoodsId));
        if (index >= 0)
            rows.value[index] = { ...product };
        else
            rows.value.unshift({ ...product, GoodsId: product.GoodsId || Date.now() });
        message.value = result.message || "کالا ذخیره شد";
        closeEditor();
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در ذخیره کالا";
    }
    finally {
        saving.value = false;
    }
}
function getProductImage(goodsCode) {
    return `/img/goods/${goodsCode}.png?v=${imageVersion.value}`;
}
function setImage(id) {
    const row = rows.value.find((item) => String(item.GoodsId) === String(id));
    if (!row?.GoodsCode) {
        message.value = "برای آپلود تصویر، کد کالا لازم است";
        return;
    }
    imageEditor.value = {
        itemId: row.GoodsCode,
        itemType: "product",
        title: row.GoodsName || `کالا ${row.GoodsCode}`,
        currentImage: getProductImage(row.GoodsCode),
    };
}
function refreshImage(payload) {
    imageVersion.value = Date.now();
    if (imageEditor.value) {
        imageEditor.value = {
            ...imageEditor.value,
            currentImage: getProductImage(imageEditor.value.itemId),
        };
    }
    message.value = payload?.removed ? "تصویر کالا حذف شد" : "تصویر کالا ذخیره شد";
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['status']} */ ;
/** @type {__VLS_StyleScopedClasses['save-mask']} */ ;
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
    placeholder: "جستجوی نام، کد یا دسته...",
});
(__VLS_ctx.q);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadProducts) },
    ...{ class: "m-btn" },
    disabled: (__VLS_ctx.loading),
});
if (__VLS_ctx.can('manage.products')) {
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
        key: (r.GoodsId),
        ...{ class: "m-tr" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (r.GoodsId);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (r.GoodsCode);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bold" },
    });
    (r.GoodsName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (__VLS_ctx.categoryName(r.GoodsGroupId));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (Number(r.GoodsPrice || 0).toLocaleString());
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (Number(r.StockInventory || 0).toLocaleString());
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "status" },
        ...{ class: ({ off: r.IsActive === false }) },
    });
    (r.IsActive === false ? "غیرفعال" : "فعال");
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.setImage(r.GoodsId);
            } },
        ...{ class: "m-btn small" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    if (__VLS_ctx.can('manage.products')) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.can('manage.products')))
                        return;
                    __VLS_ctx.edit(r.GoodsId);
                } },
            ...{ class: "m-btn small" },
        });
    }
}
if (__VLS_ctx.editorProduct) {
    /** @type {[typeof ProductModal, ]} */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(ProductModal, new ProductModal({
        ...{ 'onSave': {} },
        ...{ 'onClose': {} },
        product: (__VLS_ctx.editorProduct),
        categories: (__VLS_ctx.categories),
        products: (__VLS_ctx.rows),
    }));
    const __VLS_1 = __VLS_0({
        ...{ 'onSave': {} },
        ...{ 'onClose': {} },
        product: (__VLS_ctx.editorProduct),
        categories: (__VLS_ctx.categories),
        products: (__VLS_ctx.rows),
    }, ...__VLS_functionalComponentArgsRest(__VLS_0));
    let __VLS_3;
    let __VLS_4;
    let __VLS_5;
    const __VLS_6 = {
        onSave: (__VLS_ctx.save)
    };
    const __VLS_7 = {
        onClose: (__VLS_ctx.closeEditor)
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
if (__VLS_ctx.saving) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "save-mask" },
    });
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
/** @type {__VLS_StyleScopedClasses['save-mask']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            CatalogImageModal: CatalogImageModal,
            ProductModal: ProductModal,
            can: can,
            q: q,
            rows: rows,
            categories: categories,
            loading: loading,
            saving: saving,
            message: message,
            editorProduct: editorProduct,
            imageEditor: imageEditor,
            filtered: filtered,
            loadProducts: loadProducts,
            categoryName: categoryName,
            add: add,
            edit: edit,
            closeEditor: closeEditor,
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
