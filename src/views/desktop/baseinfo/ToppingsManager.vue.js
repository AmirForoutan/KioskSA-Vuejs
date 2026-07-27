import { computed, onMounted, ref } from "vue";
import ProductToppingModal from "../../../components/ProductToppingModal.vue";
import ToppingItemModal from "../../../components/ToppingItemModal.vue";
import ToppingLevelModal from "../../../components/ToppingLevelModal.vue";
import { can } from "../../../components/acl/can";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import { loadDesktopToppingData, saveDesktopProductTopping, saveDesktopToppingItem, saveDesktopToppingLevel, } from "../../../services/desktopApi";
const active = ref("items");
const loading = ref(false);
const message = ref("");
const products = ref([]);
useDesktopToastMessage(message);
const items = ref([]);
const levels = ref([]);
const links = ref([]);
const editorItem = ref(null);
const editorLevel = ref(null);
const editorLink = ref(null);
const tabs = [
    { key: "items", title: "اقلام تاپینگ" },
    { key: "levels", title: "مراحل" },
    { key: "links", title: "اتصال به کالا" },
];
const activeCount = computed(() => {
    if (active.value === "items")
        return items.value.length;
    if (active.value === "levels")
        return levels.value.length;
    return links.value.length;
});
onMounted(loadRows);
async function loadRows() {
    loading.value = true;
    message.value = "";
    try {
        const result = await loadDesktopToppingData(0);
        items.value = result.items;
        levels.value = result.levels;
        links.value = result.links;
        products.value = result.products;
        if (!items.value.length && !levels.value.length && !links.value.length)
            message.value = "اطلاعات تاپینگ از سرویس دریافت نشد";
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در دریافت تاپینگ‌ها";
    }
    finally {
        loading.value = false;
    }
}
function add() {
    if (active.value === "items") {
        editorItem.value = { GoodsId: 0, GoodsCode: "", GoodsName: "", TaxPercent: 0, DutyPercent: 0, PackingPrice: 0 };
    }
    else if (active.value === "levels") {
        editorLevel.value = { LevelId: 0, LevelTitle: "", Priority: levels.value.length + 1, MinCount: 0, MaxCount: 1 };
    }
    else {
        editorLink.value = {
            ToppingId: 0,
            GoodsId: Number(products.value[0]?.GoodsId || 0),
            GoodsToppingId: Number(items.value[0]?.GoodsId || 0),
            LevelId: Number(levels.value[0]?.LevelId || 0),
            GoodsCountDefault: 0,
            GoodsCount: 0,
            Price: 0,
            containerPrice: 0,
            MinCount: 0,
            MaxCount: 1,
        };
    }
}
function editItem(id) {
    const row = items.value.find((item) => item.GoodsId === id);
    if (row)
        editorItem.value = { ...row };
}
function editLevel(id) {
    const row = levels.value.find((level) => level.LevelId === id);
    if (row)
        editorLevel.value = { ...row };
}
function editLink(id) {
    const row = links.value.find((link) => link.ToppingId === id);
    if (row)
        editorLink.value = { ...row };
}
async function saveItem(item) {
    await saveAndReload(() => saveDesktopToppingItem(item));
    editorItem.value = null;
}
async function saveLevel(level) {
    await saveAndReload(() => saveDesktopToppingLevel(level));
    editorLevel.value = null;
}
async function saveLink(link) {
    await saveAndReload(() => saveDesktopProductTopping(link));
    editorLink.value = null;
}
async function saveAndReload(action) {
    message.value = "";
    try {
        const result = await action();
        message.value = result.message || "ذخیره انجام شد";
        await loadRows();
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در ذخیره";
    }
}
function productName(id) {
    return products.value.find((product) => Number(product.GoodsId) === Number(id))?.GoodsName ?? `کالا ${id}`;
}
function itemName(id) {
    return items.value.find((item) => Number(item.GoodsId) === Number(id))?.GoodsName ?? `تاپینگ ${id}`;
}
function levelName(id) {
    return levels.value.find((level) => Number(level.LevelId) === Number(id))?.LevelTitle ?? `مرحله ${id}`;
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['m-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['m-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['m-tr']} */ ;
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
(__VLS_ctx.activeCount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "m-tools" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tabs" },
});
for (const [tab] of __VLS_getVForSourceType((__VLS_ctx.tabs))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.active = tab.key;
            } },
        key: (tab.key),
        ...{ class: ({ active: __VLS_ctx.active === tab.key }) },
    });
    (tab.title);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadRows) },
    ...{ class: "m-btn" },
    disabled: (__VLS_ctx.loading),
});
if (__VLS_ctx.can('manage.toppings')) {
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
if (__VLS_ctx.active === 'items') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "m-tr items m-th" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    for (const [r] of __VLS_getVForSourceType((__VLS_ctx.items))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (r.GoodsId),
            ...{ class: "m-tr items" },
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
        (r.TaxPercent);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (r.DutyPercent);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        if (__VLS_ctx.can('manage.toppings')) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.active === 'items'))
                            return;
                        if (!(__VLS_ctx.can('manage.toppings')))
                            return;
                        __VLS_ctx.editItem(r.GoodsId);
                    } },
                ...{ class: "m-btn small" },
            });
        }
    }
}
else if (__VLS_ctx.active === 'levels') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "m-tr levels m-th" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    for (const [r] of __VLS_getVForSourceType((__VLS_ctx.levels))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (r.LevelId),
            ...{ class: "m-tr levels" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (r.LevelId);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bold" },
        });
        (r.LevelTitle);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (r.Priority);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (r.MinCount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (r.MaxCount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        if (__VLS_ctx.can('manage.toppings')) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.active === 'items'))
                            return;
                        if (!(__VLS_ctx.active === 'levels'))
                            return;
                        if (!(__VLS_ctx.can('manage.toppings')))
                            return;
                        __VLS_ctx.editLevel(r.LevelId);
                    } },
                ...{ class: "m-btn small" },
            });
        }
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "m-tr links m-th" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    for (const [r] of __VLS_getVForSourceType((__VLS_ctx.links))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (r.ToppingId),
            ...{ class: "m-tr links" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (r.ToppingId);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.productName(r.GoodsId));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bold" },
        });
        (__VLS_ctx.itemName(r.GoodsToppingId));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.levelName(r.LevelId));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (Number(r.Price || 0).toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (r.MinCount);
        (r.MaxCount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        if (__VLS_ctx.can('manage.toppings')) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.active === 'items'))
                            return;
                        if (!!(__VLS_ctx.active === 'levels'))
                            return;
                        if (!(__VLS_ctx.can('manage.toppings')))
                            return;
                        __VLS_ctx.editLink(r.ToppingId);
                    } },
                ...{ class: "m-btn small" },
            });
        }
    }
}
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "m-empty" },
    });
}
if (__VLS_ctx.editorItem) {
    /** @type {[typeof ToppingItemModal, ]} */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(ToppingItemModal, new ToppingItemModal({
        ...{ 'onSave': {} },
        ...{ 'onClose': {} },
        item: (__VLS_ctx.editorItem),
        toppingItems: (__VLS_ctx.items),
    }));
    const __VLS_1 = __VLS_0({
        ...{ 'onSave': {} },
        ...{ 'onClose': {} },
        item: (__VLS_ctx.editorItem),
        toppingItems: (__VLS_ctx.items),
    }, ...__VLS_functionalComponentArgsRest(__VLS_0));
    let __VLS_3;
    let __VLS_4;
    let __VLS_5;
    const __VLS_6 = {
        onSave: (__VLS_ctx.saveItem)
    };
    const __VLS_7 = {
        onClose: (...[$event]) => {
            if (!(__VLS_ctx.editorItem))
                return;
            __VLS_ctx.editorItem = null;
        }
    };
    var __VLS_2;
}
if (__VLS_ctx.editorLevel) {
    /** @type {[typeof ToppingLevelModal, ]} */ ;
    // @ts-ignore
    const __VLS_8 = __VLS_asFunctionalComponent(ToppingLevelModal, new ToppingLevelModal({
        ...{ 'onSave': {} },
        ...{ 'onClose': {} },
        level: (__VLS_ctx.editorLevel),
    }));
    const __VLS_9 = __VLS_8({
        ...{ 'onSave': {} },
        ...{ 'onClose': {} },
        level: (__VLS_ctx.editorLevel),
    }, ...__VLS_functionalComponentArgsRest(__VLS_8));
    let __VLS_11;
    let __VLS_12;
    let __VLS_13;
    const __VLS_14 = {
        onSave: (__VLS_ctx.saveLevel)
    };
    const __VLS_15 = {
        onClose: (...[$event]) => {
            if (!(__VLS_ctx.editorLevel))
                return;
            __VLS_ctx.editorLevel = null;
        }
    };
    var __VLS_10;
}
if (__VLS_ctx.editorLink) {
    /** @type {[typeof ProductToppingModal, ]} */ ;
    // @ts-ignore
    const __VLS_16 = __VLS_asFunctionalComponent(ProductToppingModal, new ProductToppingModal({
        ...{ 'onSave': {} },
        ...{ 'onClose': {} },
        topping: (__VLS_ctx.editorLink),
        products: (__VLS_ctx.products),
        toppingItems: (__VLS_ctx.items),
        toppingLevels: (__VLS_ctx.levels),
    }));
    const __VLS_17 = __VLS_16({
        ...{ 'onSave': {} },
        ...{ 'onClose': {} },
        topping: (__VLS_ctx.editorLink),
        products: (__VLS_ctx.products),
        toppingItems: (__VLS_ctx.items),
        toppingLevels: (__VLS_ctx.levels),
    }, ...__VLS_functionalComponentArgsRest(__VLS_16));
    let __VLS_19;
    let __VLS_20;
    let __VLS_21;
    const __VLS_22 = {
        onSave: (__VLS_ctx.saveLink)
    };
    const __VLS_23 = {
        onClose: (...[$event]) => {
            if (!(__VLS_ctx.editorLink))
                return;
            __VLS_ctx.editorLink = null;
        }
    };
    var __VLS_18;
}
/** @type {__VLS_StyleScopedClasses['m-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['m-head']} */ ;
/** @type {__VLS_StyleScopedClasses['m-title']} */ ;
/** @type {__VLS_StyleScopedClasses['m-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['m-tools']} */ ;
/** @type {__VLS_StyleScopedClasses['tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['m-message']} */ ;
/** @type {__VLS_StyleScopedClasses['m-table']} */ ;
/** @type {__VLS_StyleScopedClasses['m-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['items']} */ ;
/** @type {__VLS_StyleScopedClasses['m-th']} */ ;
/** @type {__VLS_StyleScopedClasses['m-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['items']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['m-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['levels']} */ ;
/** @type {__VLS_StyleScopedClasses['m-th']} */ ;
/** @type {__VLS_StyleScopedClasses['m-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['levels']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['m-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['links']} */ ;
/** @type {__VLS_StyleScopedClasses['m-th']} */ ;
/** @type {__VLS_StyleScopedClasses['m-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['links']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
/** @type {__VLS_StyleScopedClasses['m-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['m-empty']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ProductToppingModal: ProductToppingModal,
            ToppingItemModal: ToppingItemModal,
            ToppingLevelModal: ToppingLevelModal,
            can: can,
            active: active,
            loading: loading,
            message: message,
            products: products,
            items: items,
            levels: levels,
            links: links,
            editorItem: editorItem,
            editorLevel: editorLevel,
            editorLink: editorLink,
            tabs: tabs,
            activeCount: activeCount,
            loadRows: loadRows,
            add: add,
            editItem: editItem,
            editLevel: editLevel,
            editLink: editLink,
            saveItem: saveItem,
            saveLevel: saveLevel,
            saveLink: saveLink,
            productName: productName,
            itemName: itemName,
            levelName: levelName,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
