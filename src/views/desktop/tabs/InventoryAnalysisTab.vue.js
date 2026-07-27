import { computed, onMounted, ref } from "vue";
import { loadInventoryAnalysisBootstrap, saveGoodsRecipe, saveGoodsUsage, } from "../../../services/inventoryApi";
const loading = ref(false);
const message = ref("");
const goods = ref([]);
const recipes = ref([]);
const selectedProductGoodsId = ref(0);
const recipeItems = ref([]);
const search = ref("");
const filteredGoods = computed(() => {
    const q = search.value.trim().toLowerCase();
    if (!q)
        return goods.value;
    return goods.value.filter((g) => `${g.GoodsCode} ${g.GoodsName}`.toLowerCase().includes(q));
});
const selectedProduct = computed(() => goods.value.find((g) => Number(g.GoodsId) === Number(selectedProductGoodsId.value)) || null);
onMounted(loadData);
function showMessage(text) {
    message.value = text;
    window.setTimeout(() => {
        if (message.value === text)
            message.value = "";
    }, 3500);
}
async function loadData() {
    loading.value = true;
    try {
        const result = await loadInventoryAnalysisBootstrap();
        goods.value = result.goods || [];
        recipes.value = result.recipes || [];
        if (!selectedProductGoodsId.value && goods.value.length) {
            selectedProductGoodsId.value = goods.value[0].GoodsId;
            loadRecipeForSelectedProduct();
        }
    }
    catch (error) {
        showMessage(error instanceof Error ? error.message : "خطا در دریافت آنالیز کالا");
    }
    finally {
        loading.value = false;
    }
}
function loadRecipeForSelectedProduct() {
    recipeItems.value = recipes.value
        .filter((item) => Number(item.ProductGoodsId) === Number(selectedProductGoodsId.value))
        .map((item) => ({ ...item }));
    if (recipeItems.value.length === 0) {
        recipeItems.value.push({ IngredientGoodsId: 0, Quantity: 1, WastePercent: 0 });
    }
}
function addRecipeItem() {
    recipeItems.value.push({ IngredientGoodsId: 0, Quantity: 1, WastePercent: 0 });
}
function removeRecipeItem(index) {
    if (recipeItems.value.length === 1) {
        recipeItems.value = [{ IngredientGoodsId: 0, Quantity: 1, WastePercent: 0 }];
        return;
    }
    recipeItems.value.splice(index, 1);
}
async function submitGoodsUsage() {
    try {
        const result = await saveGoodsUsage(goods.value);
        showMessage(result.message || "کاربرد کالاها ذخیره شد");
        await loadData();
    }
    catch (error) {
        showMessage(error instanceof Error ? error.message : "خطا در ذخیره کاربرد کالاها");
    }
}
async function submitRecipe() {
    if (!selectedProductGoodsId.value) {
        showMessage("ابتدا کالای اصلی را انتخاب کنید");
        return;
    }
    const items = recipeItems.value
        .filter((item) => Number(item.IngredientGoodsId) > 0 && Number(item.Quantity) > 0)
        .map((item) => ({
        IngredientGoodsId: Number(item.IngredientGoodsId),
        Quantity: Number(item.Quantity),
        WastePercent: Number(item.WastePercent || 0),
    }));
    try {
        const result = await saveGoodsRecipe(Number(selectedProductGoodsId.value), items);
        showMessage(result.message || "آنالیز کالا ذخیره شد");
        await loadData();
        loadRecipeForSelectedProduct();
    }
    catch (error) {
        showMessage(error instanceof Error ? error.message : "خطا در ذخیره آنالیز کالا");
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['analysis-header']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-header']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "analysis-tab" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "analysis-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadData) },
    ...{ class: "primary" },
    disabled: (__VLS_ctx.loading),
});
if (__VLS_ctx.message) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "message" },
    });
    (__VLS_ctx.message);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card usage-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "hint" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "جستجوی کالا",
});
(__VLS_ctx.search);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "table-wrap" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.filteredGoods))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
        key: (item.GoodsId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    (item.GoodsCode);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    (item.GoodsName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "checkbox",
    });
    (item.IsPurchasable);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "checkbox",
    });
    (item.IsSellable);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "checkbox",
    });
    (item.IsKioskVisible);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.submitGoodsUsage) },
    ...{ class: "primary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card recipe-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    ...{ onChange: (__VLS_ctx.loadRecipeForSelectedProduct) },
    value: (__VLS_ctx.selectedProductGoodsId),
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.goods.filter(g => g.IsSellable)))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (item.GoodsId),
        value: (item.GoodsId),
    });
    (item.GoodsCode);
    (item.GoodsName);
}
if (__VLS_ctx.selectedProduct) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "selected-box" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.selectedProduct.GoodsName);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "table-wrap recipe-table" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
for (const [item, index] of __VLS_getVForSourceType((__VLS_ctx.recipeItems))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
        key: (index),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (item.IngredientGoodsId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (0),
    });
    for (const [g] of __VLS_getVForSourceType((__VLS_ctx.goods.filter(x => x.IsPurchasable)))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (g.GoodsId),
            value: (g.GoodsId),
        });
        (g.GoodsCode);
        (g.GoodsName);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
        step: "0.001",
    });
    (item.Quantity);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
        step: "0.01",
    });
    (item.WastePercent);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.removeRecipeItem(index);
            } },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.addRecipeItem) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.submitRecipe) },
    ...{ class: "primary" },
});
/** @type {__VLS_StyleScopedClasses['analysis-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-header']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['message']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['usage-card']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['recipe-card']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-box']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['recipe-table']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            message: message,
            goods: goods,
            selectedProductGoodsId: selectedProductGoodsId,
            recipeItems: recipeItems,
            search: search,
            filteredGoods: filteredGoods,
            selectedProduct: selectedProduct,
            loadData: loadData,
            loadRecipeForSelectedProduct: loadRecipeForSelectedProduct,
            addRecipeItem: addRecipeItem,
            removeRecipeItem: removeRecipeItem,
            submitGoodsUsage: submitGoodsUsage,
            submitRecipe: submitRecipe,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
