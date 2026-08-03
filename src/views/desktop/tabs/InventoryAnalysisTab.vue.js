import { computed, onMounted, reactive, ref } from "vue";
import { loadInventoryAnalysisBootstrap, loadInventoryBootstrap, loadStockReport, saveGoodsRecipe, } from "../../../services/inventoryApi";
import { fetchGoodsApi } from "../../../services/apiService";
const loading = ref(false);
const message = ref("");
const goods = ref([]);
const recipes = ref([]);
const stockRows = ref([]);
const goodsPrices = ref([]);
const selectedProductGoodsId = ref(0);
const recipeItems = ref([]);
const productSearch = ref("");
const ingredientSearch = ref("");
const reportFilter = reactive({ FiscalYearId: 0, WarehouseId: 0, FromDate: "", ToDate: "", GoodsId: 0 });
const goodsPriceMap = computed(() => {
    const map = new Map();
    goodsPrices.value.forEach((item) => map.set(Number(item.GoodsId), item));
    return map;
});
const stockCostMap = computed(() => {
    const map = new Map();
    stockRows.value.forEach((item) => map.set(Number(item.GoodsId), item));
    return map;
});
const sellableGoods = computed(() => goods.value.filter((g) => g.IsSellable !== false));
const filteredProducts = computed(() => {
    const q = productSearch.value.trim().toLowerCase();
    if (!q)
        return sellableGoods.value;
    return sellableGoods.value.filter((g) => `${g.GoodsCode} ${g.GoodsName}`.toLowerCase().includes(q));
});
const ingredientGoods = computed(() => goods.value.filter((g) => Number(g.GoodsId) !== Number(selectedProductGoodsId.value) && g.IsPurchasable !== false));
const filteredIngredientGoods = computed(() => {
    const q = ingredientSearch.value.trim().toLowerCase();
    if (!q)
        return ingredientGoods.value;
    return ingredientGoods.value.filter((g) => `${g.GoodsCode} ${g.GoodsName}`.toLowerCase().includes(q));
});
const selectedProduct = computed(() => goods.value.find((g) => Number(g.GoodsId) === Number(selectedProductGoodsId.value)) || null);
const selectedProductSalePrice = computed(() => Number(goodsPriceMap.value.get(Number(selectedProductGoodsId.value || 0))?.GoodsPrice || 0));
const recipeCost = computed(() => recipeItems.value.reduce((sum, item) => sum + getRecipeItemCost(item), 0));
const recipeProfit = computed(() => selectedProductSalePrice.value - recipeCost.value);
const recipeProfitPercent = computed(() => selectedProductSalePrice.value > 0 ? (recipeProfit.value / selectedProductSalePrice.value) * 100 : 0);
onMounted(loadData);
function showMessage(text) {
    message.value = text;
    window.setTimeout(() => { if (message.value === text)
        message.value = ""; }, 3500);
}
function normalizeGoodsPriceRows(data) {
    const source = data;
    const list = Array.isArray(source) ? source : Array.isArray(source?.Goods) ? source.Goods : Array.isArray(source?.goods) ? source.goods : [];
    return list.filter((item) => Number(item?.GoodsId || item?.goodsId || 0) > 0).map((item) => ({
        GoodsId: Number(item.GoodsId || item.goodsId || 0),
        GoodsCode: Number(item.GoodsCode || item.goodsCode || 0),
        GoodsName: String(item.GoodsName || item.goodsName || ""),
        GoodsPrice: Number(item.GoodsPrice || item.goodsPrice || 0),
    }));
}
async function loadData() {
    loading.value = true;
    try {
        const [analysis, bootstrap, rawGoodsPrices] = await Promise.all([
            loadInventoryAnalysisBootstrap(),
            loadInventoryBootstrap(),
            fetchGoodsApi(0),
        ]);
        goods.value = analysis.goods || [];
        recipes.value = analysis.recipes || [];
        goodsPrices.value = normalizeGoodsPriceRows(rawGoodsPrices);
        reportFilter.FiscalYearId = bootstrap.fiscalYears?.[0]?.FiscalYearId || 0;
        reportFilter.WarehouseId = bootstrap.warehouses?.find((w) => w.IsDefault)?.WarehouseId || bootstrap.warehouses?.[0]?.WarehouseId || 0;
        const stock = await loadStockReport(reportFilter);
        stockRows.value = stock.rows || [];
        if (!selectedProductGoodsId.value && sellableGoods.value.length)
            selectProduct(sellableGoods.value[0].GoodsId);
        else
            loadRecipeForSelectedProduct();
    }
    catch (error) {
        showMessage(error instanceof Error ? error.message : "خطا در دریافت آنالیز کالا");
    }
    finally {
        loading.value = false;
    }
}
function selectProduct(goodsId) { selectedProductGoodsId.value = Number(goodsId || 0); loadRecipeForSelectedProduct(); }
function loadRecipeForSelectedProduct() {
    recipeItems.value = recipes.value.filter((item) => Number(item.ProductGoodsId) === Number(selectedProductGoodsId.value)).map((item) => ({ ...item }));
    if (recipeItems.value.length === 0)
        recipeItems.value.push({ IngredientGoodsId: 0, Quantity: 1, WastePercent: 0 });
}
function addRecipeItem() { recipeItems.value.push({ IngredientGoodsId: 0, Quantity: 1, WastePercent: 0 }); }
function removeRecipeItem(index) { recipeItems.value.length === 1 ? recipeItems.value = [{ IngredientGoodsId: 0, Quantity: 1, WastePercent: 0 }] : recipeItems.value.splice(index, 1); }
function getGoodsTitle(goodsId) { const item = goods.value.find((g) => Number(g.GoodsId) === Number(goodsId)); return item ? `${item.GoodsCode} - ${item.GoodsName}` : "انتخاب نشده"; }
function getIngredientUnitCost(goodsId) { const row = stockCostMap.value.get(Number(goodsId)); return Number(row?.AveragePrice || row?.LastPurchasePrice || 0); }
function getEffectiveQuantity(item) { const quantity = Number(item.Quantity || 0); const waste = Number(item.WastePercent || 0); return waste > 0 ? quantity + (quantity * waste / 100) : quantity; }
function getRecipeItemCost(item) { return getEffectiveQuantity(item) * getIngredientUnitCost(Number(item.IngredientGoodsId || 0)); }
function formatMoney(value) { return Math.round(Number(value || 0)).toLocaleString(); }
function formatNumber(value) { const num = Number(value || 0); return Number.isInteger(num) ? num.toLocaleString() : num.toLocaleString(undefined, { maximumFractionDigits: 3 }); }
async function submitRecipe() {
    if (!selectedProductGoodsId.value) {
        showMessage("ابتدا کالای قابل فروش را انتخاب کنید");
        return;
    }
    const items = recipeItems.value.filter((item) => Number(item.IngredientGoodsId) > 0 && Number(item.Quantity) > 0).map((item) => ({ IngredientGoodsId: Number(item.IngredientGoodsId), Quantity: Number(item.Quantity), WastePercent: Number(item.WastePercent || 0) }));
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
/** @type {__VLS_StyleScopedClasses['product-row']} */ ;
/** @type {__VLS_StyleScopedClasses['product-row']} */ ;
/** @type {__VLS_StyleScopedClasses['recipe-title-row']} */ ;
/** @type {__VLS_StyleScopedClasses['profit-cards']} */ ;
/** @type {__VLS_StyleScopedClasses['profit-cards']} */ ;
/** @type {__VLS_StyleScopedClasses['profit-cards']} */ ;
/** @type {__VLS_StyleScopedClasses['profit-cards']} */ ;
/** @type {__VLS_StyleScopedClasses['ingredient-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['profit-cards']} */ ;
/** @type {__VLS_StyleScopedClasses['recipe-title-row']} */ ;
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
    ...{ class: "analysis-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "card product-picker" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "جستجوی نام یا کد کالا",
});
(__VLS_ctx.productSearch);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "product-list" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.filteredProducts))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectProduct(item.GoodsId);
            } },
        key: (item.GoodsId),
        type: "button",
        ...{ class: "product-row" },
        ...{ class: ({ selected: Number(item.GoodsId) === Number(__VLS_ctx.selectedProductGoodsId) }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (item.GoodsCode);
    (item.GoodsName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.formatMoney(__VLS_ctx.goodsPriceMap.get(Number(item.GoodsId))?.GoodsPrice || 0));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "card recipe-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "recipe-title-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
(__VLS_ctx.selectedProduct ? __VLS_ctx.selectedProduct.GoodsName : 'کالایی انتخاب نشده');
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profit-cards" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.formatMoney(__VLS_ctx.selectedProductSalePrice));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.formatMoney(__VLS_ctx.recipeCost));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: (__VLS_ctx.recipeProfit >= 0 ? 'positive' : 'negative') },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.formatMoney(__VLS_ctx.recipeProfit));
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
(__VLS_ctx.formatNumber(__VLS_ctx.recipeProfitPercent));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ingredient-toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "جستجوی ماده اولیه برای انتخاب سریع‌تر",
});
(__VLS_ctx.ingredientSearch);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.addRecipeItem) },
});
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
    for (const [g] of __VLS_getVForSourceType((__VLS_ctx.filteredIngredientGoods))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (g.GoodsId),
            value: (g.GoodsId),
        });
        (g.GoodsCode);
        (g.GoodsName);
    }
    if (item.IngredientGoodsId) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "selected-ingredient" },
        });
        (__VLS_ctx.getGoodsTitle(Number(item.IngredientGoodsId)));
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
    (__VLS_ctx.formatNumber(__VLS_ctx.getEffectiveQuantity(item)));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    (__VLS_ctx.formatMoney(__VLS_ctx.getIngredientUnitCost(Number(item.IngredientGoodsId || 0))));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    (__VLS_ctx.formatMoney(__VLS_ctx.getRecipeItemCost(item)));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.removeRecipeItem(index);
            } },
        ...{ class: "danger" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
    ...{ class: "recipe-actions" },
});
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
/** @type {__VLS_StyleScopedClasses['analysis-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['product-picker']} */ ;
/** @type {__VLS_StyleScopedClasses['product-list']} */ ;
/** @type {__VLS_StyleScopedClasses['product-row']} */ ;
/** @type {__VLS_StyleScopedClasses['selected']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['recipe-card']} */ ;
/** @type {__VLS_StyleScopedClasses['recipe-title-row']} */ ;
/** @type {__VLS_StyleScopedClasses['profit-cards']} */ ;
/** @type {__VLS_StyleScopedClasses['ingredient-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['recipe-table']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-ingredient']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['recipe-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            message: message,
            selectedProductGoodsId: selectedProductGoodsId,
            recipeItems: recipeItems,
            productSearch: productSearch,
            ingredientSearch: ingredientSearch,
            goodsPriceMap: goodsPriceMap,
            filteredProducts: filteredProducts,
            filteredIngredientGoods: filteredIngredientGoods,
            selectedProduct: selectedProduct,
            selectedProductSalePrice: selectedProductSalePrice,
            recipeCost: recipeCost,
            recipeProfit: recipeProfit,
            recipeProfitPercent: recipeProfitPercent,
            loadData: loadData,
            selectProduct: selectProduct,
            addRecipeItem: addRecipeItem,
            removeRecipeItem: removeRecipeItem,
            getGoodsTitle: getGoodsTitle,
            getIngredientUnitCost: getIngredientUnitCost,
            getEffectiveQuantity: getEffectiveQuantity,
            getRecipeItemCost: getRecipeItemCost,
            formatMoney: formatMoney,
            formatNumber: formatNumber,
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
