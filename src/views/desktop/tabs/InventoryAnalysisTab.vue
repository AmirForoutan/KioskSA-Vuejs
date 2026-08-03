<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  loadInventoryAnalysisBootstrap,
  loadInventoryBootstrap,
  loadStockReport,
  saveGoodsRecipe,
  type GoodsUsage,
  type InventoryStockReportRow,
  type RecipeItem,
} from "../../../services/inventoryApi";
import { fetchGoodsApi } from "../../../services/apiService";

type GoodsPriceRow = {
  GoodsId: number;
  GoodsCode: number;
  GoodsName: string;
  GoodsPrice: number;
};

const loading = ref(false);
const message = ref("");
const goods = ref<GoodsUsage[]>([]);
const recipes = ref<RecipeItem[]>([]);
const stockRows = ref<InventoryStockReportRow[]>([]);
const goodsPrices = ref<GoodsPriceRow[]>([]);
const selectedProductGoodsId = ref<number>(0);
const recipeItems = ref<RecipeItem[]>([]);
const productSearch = ref("");
const ingredientSearch = ref("");

const reportFilter = reactive({ FiscalYearId: 0, WarehouseId: 0, FromDate: "", ToDate: "", GoodsId: 0 });

const goodsPriceMap = computed(() => {
  const map = new Map<number, GoodsPriceRow>();
  goodsPrices.value.forEach((item) => map.set(Number(item.GoodsId), item));
  return map;
});

const stockCostMap = computed(() => {
  const map = new Map<number, InventoryStockReportRow>();
  stockRows.value.forEach((item) => map.set(Number(item.GoodsId), item));
  return map;
});

const sellableGoods = computed(() => goods.value.filter((g) => g.IsSellable !== false));
const filteredProducts = computed(() => {
  const q = productSearch.value.trim().toLowerCase();
  if (!q) return sellableGoods.value;
  return sellableGoods.value.filter((g) => `${g.GoodsCode} ${g.GoodsName}`.toLowerCase().includes(q));
});

const ingredientGoods = computed(() => goods.value.filter((g) => Number(g.GoodsId) !== Number(selectedProductGoodsId.value) && g.IsPurchasable !== false));
const filteredIngredientGoods = computed(() => {
  const q = ingredientSearch.value.trim().toLowerCase();
  if (!q) return ingredientGoods.value;
  return ingredientGoods.value.filter((g) => `${g.GoodsCode} ${g.GoodsName}`.toLowerCase().includes(q));
});

const selectedProduct = computed(() => goods.value.find((g) => Number(g.GoodsId) === Number(selectedProductGoodsId.value)) || null);
const selectedProductSalePrice = computed(() => Number(goodsPriceMap.value.get(Number(selectedProductGoodsId.value || 0))?.GoodsPrice || 0));
const recipeCost = computed(() => recipeItems.value.reduce((sum, item) => sum + getRecipeItemCost(item), 0));
const recipeProfit = computed(() => selectedProductSalePrice.value - recipeCost.value);
const recipeProfitPercent = computed(() => selectedProductSalePrice.value > 0 ? (recipeProfit.value / selectedProductSalePrice.value) * 100 : 0);

onMounted(loadData);

function showMessage(text: string) {
  message.value = text;
  window.setTimeout(() => { if (message.value === text) message.value = ""; }, 3500);
}

function normalizeGoodsPriceRows(data: unknown): GoodsPriceRow[] {
  const source = data as any;
  const list = Array.isArray(source) ? source : Array.isArray(source?.Goods) ? source.Goods : Array.isArray(source?.goods) ? source.goods : [];
  return list.filter((item: any) => Number(item?.GoodsId || item?.goodsId || 0) > 0).map((item: any) => ({
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

    if (!selectedProductGoodsId.value && sellableGoods.value.length) selectProduct(sellableGoods.value[0].GoodsId);
    else loadRecipeForSelectedProduct();
  } catch (error) {
    showMessage(error instanceof Error ? error.message : "خطا در دریافت آنالیز کالا");
  } finally {
    loading.value = false;
  }
}

function selectProduct(goodsId: number) { selectedProductGoodsId.value = Number(goodsId || 0); loadRecipeForSelectedProduct(); }

function loadRecipeForSelectedProduct() {
  recipeItems.value = recipes.value.filter((item) => Number(item.ProductGoodsId) === Number(selectedProductGoodsId.value)).map((item) => ({ ...item }));
  if (recipeItems.value.length === 0) recipeItems.value.push({ IngredientGoodsId: 0, Quantity: 1, WastePercent: 0 });
}

function addRecipeItem() { recipeItems.value.push({ IngredientGoodsId: 0, Quantity: 1, WastePercent: 0 }); }
function removeRecipeItem(index: number) { recipeItems.value.length === 1 ? recipeItems.value = [{ IngredientGoodsId: 0, Quantity: 1, WastePercent: 0 }] : recipeItems.value.splice(index, 1); }
function getGoodsTitle(goodsId: number) { const item = goods.value.find((g) => Number(g.GoodsId) === Number(goodsId)); return item ? `${item.GoodsCode} - ${item.GoodsName}` : "انتخاب نشده"; }
function getIngredientUnitCost(goodsId: number) { const row = stockCostMap.value.get(Number(goodsId)); return Number(row?.AveragePrice || row?.LastPurchasePrice || 0); }
function getEffectiveQuantity(item: RecipeItem) { const quantity = Number(item.Quantity || 0); const waste = Number(item.WastePercent || 0); return waste > 0 ? quantity + (quantity * waste / 100) : quantity; }
function getRecipeItemCost(item: RecipeItem) { return getEffectiveQuantity(item) * getIngredientUnitCost(Number(item.IngredientGoodsId || 0)); }
function formatMoney(value: number) { return Math.round(Number(value || 0)).toLocaleString(); }
function formatNumber(value: number) { const num = Number(value || 0); return Number.isInteger(num) ? num.toLocaleString() : num.toLocaleString(undefined, { maximumFractionDigits: 3 }); }

async function submitRecipe() {
  if (!selectedProductGoodsId.value) { showMessage("ابتدا کالای قابل فروش را انتخاب کنید"); return; }
  const items = recipeItems.value.filter((item) => Number(item.IngredientGoodsId) > 0 && Number(item.Quantity) > 0).map((item) => ({ IngredientGoodsId: Number(item.IngredientGoodsId), Quantity: Number(item.Quantity), WastePercent: Number(item.WastePercent || 0) }));
  try {
    const result = await saveGoodsRecipe(Number(selectedProductGoodsId.value), items);
    showMessage(result.message || "آنالیز کالا ذخیره شد");
    await loadData();
    loadRecipeForSelectedProduct();
  } catch (error) {
    showMessage(error instanceof Error ? error.message : "خطا در ذخیره آنالیز کالا");
  }
}
</script>

<template>
  <section class="analysis-tab">
    <header class="analysis-header">
      <div>
        <h2>آنالیز کالا</h2>
        <p>کاربرد کالا از این صفحه حذف شد و داخل فرم تعریف کالا منتقل شد. اینجا فقط رسپی، Cost و سود کالا مدیریت می‌شود.</p>
      </div>
      <button class="primary" @click="loadData" :disabled="loading">بروزرسانی</button>
    </header>

    <div v-if="message" class="message">{{ message }}</div>

    <div class="analysis-layout">
      <aside class="card product-picker">
        <h3>انتخاب کالای قابل فروش</h3>
        <input v-model="productSearch" placeholder="جستجوی نام یا کد کالا" />
        <div class="product-list">
          <button v-for="item in filteredProducts" :key="item.GoodsId" type="button" class="product-row" :class="{ selected: Number(item.GoodsId) === Number(selectedProductGoodsId) }" @click="selectProduct(item.GoodsId)">
            <span>{{ item.GoodsCode }} - {{ item.GoodsName }}</span>
            <small>{{ formatMoney(goodsPriceMap.get(Number(item.GoodsId))?.GoodsPrice || 0) }} فروش</small>
          </button>
        </div>
      </aside>

      <main class="card recipe-card">
        <div class="recipe-title-row">
          <div>
            <h3>{{ selectedProduct ? selectedProduct.GoodsName : 'کالایی انتخاب نشده' }}</h3>
            <p>اگر کالا رسپی داشته باشد، فروش آن مواد اولیه را از انبار کم می‌کند.</p>
          </div>
          <div class="profit-cards">
            <div><span>قیمت فروش</span><strong>{{ formatMoney(selectedProductSalePrice) }}</strong></div>
            <div><span>Cost</span><strong>{{ formatMoney(recipeCost) }}</strong></div>
            <div :class="recipeProfit >= 0 ? 'positive' : 'negative'"><span>سود</span><strong>{{ formatMoney(recipeProfit) }}</strong><small>{{ formatNumber(recipeProfitPercent) }}%</small></div>
          </div>
        </div>

        <div class="ingredient-toolbar">
          <input v-model="ingredientSearch" placeholder="جستجوی ماده اولیه برای انتخاب سریع‌تر" />
          <button @click="addRecipeItem">افزودن ماده اولیه</button>
        </div>

        <div class="table-wrap recipe-table">
          <table>
            <thead><tr><th>ماده اولیه</th><th>مقدار مصرف</th><th>درصد پرت</th><th>مقدار نهایی</th><th>قیمت واحد</th><th>Cost خط</th><th></th></tr></thead>
            <tbody>
              <tr v-for="(item, index) in recipeItems" :key="index">
                <td>
                  <select v-model.number="item.IngredientGoodsId">
                    <option :value="0">انتخاب کالا</option>
                    <option v-for="g in filteredIngredientGoods" :key="g.GoodsId" :value="g.GoodsId">{{ g.GoodsCode }} - {{ g.GoodsName }}</option>
                  </select>
                  <small v-if="item.IngredientGoodsId" class="selected-ingredient">{{ getGoodsTitle(Number(item.IngredientGoodsId)) }}</small>
                </td>
                <td><input type="number" min="0" step="0.001" v-model.number="item.Quantity" /></td>
                <td><input type="number" min="0" step="0.01" v-model.number="item.WastePercent" /></td>
                <td>{{ formatNumber(getEffectiveQuantity(item)) }}</td>
                <td>{{ formatMoney(getIngredientUnitCost(Number(item.IngredientGoodsId || 0))) }}</td>
                <td>{{ formatMoney(getRecipeItemCost(item)) }}</td>
                <td><button class="danger" @click="removeRecipeItem(index)">حذف</button></td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="recipe-actions">
          <button @click="addRecipeItem">افزودن ردیف</button>
          <button class="primary" @click="submitRecipe">ذخیره آنالیز کالا</button>
        </footer>
      </main>
    </div>
  </section>
</template>

<style scoped>
.analysis-tab { direction: rtl; color: #e5e7eb; height: 100%; overflow: auto; padding: 4px; }
.analysis-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.analysis-header h2 { margin: 0; font-size: 24px; }
.analysis-header p, .recipe-title-row p { margin: 4px 0 0; color: #94a3b8; }
.analysis-layout { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 12px; align-items: start; }
.card { background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.08); border-radius: 18px; padding: 14px; box-shadow: 0 16px 36px rgba(2,6,23,.18); }
.card h3 { margin: 0 0 10px; }
.message { padding: 10px 12px; border-radius: 12px; margin-bottom: 10px; background: rgba(59,130,246,.14); border: 1px solid rgba(59,130,246,.28); }
button { border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.05); color: #e5e7eb; border-radius: 12px; padding: 9px 12px; cursor: pointer; }
.primary { background: rgba(20,184,166,.18) !important; border-color: rgba(20,184,166,.45) !important; color: #ccfbf1 !important; }
button.danger { background: rgba(239,68,68,.12); border-color: rgba(239,68,68,.35); color: #fecaca; }
input, select { width: 100%; min-height: 38px; border-radius: 12px; border: 1px solid rgba(255,255,255,.1); background: #111827; color: #e5e7eb; padding: 7px 9px; box-sizing: border-box; }
.product-list { margin-top: 10px; max-height: 620px; overflow: auto; display: flex; flex-direction: column; gap: 8px; }
.product-row { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px; text-align: right; }
.product-row.selected { border-color: rgba(20,184,166,.55); background: rgba(20,184,166,.14); }
.product-row small { color: #94a3b8; white-space: nowrap; }
.recipe-title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; margin-bottom: 12px; }
.profit-cards { display: grid; grid-template-columns: repeat(3, minmax(110px, 1fr)); gap: 8px; min-width: 360px; }
.profit-cards div { border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 10px; background: rgba(15,23,42,.55); }
.profit-cards span { display: block; color: #94a3b8; font-size: 12px; margin-bottom: 6px; }
.profit-cards strong { display: block; font-size: 18px; }
.profit-cards small { color: #94a3b8; }
.positive strong { color: #86efac; }
.negative strong { color: #fca5a5; }
.ingredient-toolbar, .recipe-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.ingredient-toolbar input { max-width: 420px; }
.table-wrap { max-height: 620px; overflow: auto; border-radius: 14px; border: 1px solid rgba(255,255,255,.08); margin: 10px 0; }
table { width: 100%; border-collapse: collapse; min-width: 850px; }
th, td { padding: 9px 10px; border-bottom: 1px solid rgba(255,255,255,.07); text-align: right; vertical-align: middle; }
th { position: sticky; top: 0; background: #151b27; z-index: 1; color: #cbd5e1; }
.selected-ingredient { display: block; margin-top: 5px; color: #94a3b8; }
@media (max-width: 1150px) { .analysis-layout { grid-template-columns: 1fr; } .profit-cards { min-width: 0; width: 100%; } .recipe-title-row { flex-direction: column; } }
</style>
