<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  loadInventoryAnalysisBootstrap,
  saveGoodsRecipe,
  saveGoodsUsage,
  type GoodsUsage,
  type RecipeItem,
} from "../../../services/inventoryApi";

const loading = ref(false);
const message = ref("");
const goods = ref<GoodsUsage[]>([]);
const recipes = ref<RecipeItem[]>([]);
const selectedProductGoodsId = ref<number>(0);
const recipeItems = ref<RecipeItem[]>([]);
const search = ref("");

const filteredGoods = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return goods.value;
  return goods.value.filter((g) => `${g.GoodsCode} ${g.GoodsName}`.toLowerCase().includes(q));
});

const selectedProduct = computed(() => goods.value.find((g) => Number(g.GoodsId) === Number(selectedProductGoodsId.value)) || null);

onMounted(loadData);

function showMessage(text: string) {
  message.value = text;
  window.setTimeout(() => {
    if (message.value === text) message.value = "";
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
  } catch (error) {
    showMessage(error instanceof Error ? error.message : "خطا در دریافت آنالیز کالا");
  } finally {
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

function removeRecipeItem(index: number) {
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
  } catch (error) {
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
  } catch (error) {
    showMessage(error instanceof Error ? error.message : "خطا در ذخیره آنالیز کالا");
  }
}
</script>

<template>
  <section class="analysis-tab">
    <header class="analysis-header">
      <div>
        <h2>آنالیز کالا و کاربرد کالاها</h2>
        <p>برای کالاهای دارای رسپی، هنگام فروش مواد اولیه از انبار کسر می‌شود؛ اگر رسپی نداشته باشد خود کالا کسر می‌شود.</p>
      </div>
      <button class="primary" @click="loadData" :disabled="loading">بروزرسانی</button>
    </header>

    <div v-if="message" class="message">{{ message }}</div>

    <div class="grid">
      <div class="card usage-card">
        <h3>کاربرد کالاها</h3>
        <p class="hint">با این تیک‌ها مشخص می‌شود کالا در فاکتور خرید، فروش و کیوسک نمایش داده شود یا نه.</p>
        <input v-model="search" placeholder="جستجوی کالا" />
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>کد</th>
                <th>نام کالا</th>
                <th>خرید</th>
                <th>فروش</th>
                <th>کیوسک</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredGoods" :key="item.GoodsId">
                <td>{{ item.GoodsCode }}</td>
                <td>{{ item.GoodsName }}</td>
                <td><input type="checkbox" v-model="item.IsPurchasable" /></td>
                <td><input type="checkbox" v-model="item.IsSellable" /></td>
                <td><input type="checkbox" v-model="item.IsKioskVisible" /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <button class="primary" @click="submitGoodsUsage">ذخیره کاربرد کالاها</button>
      </div>

      <div class="card recipe-card">
        <h3>رسپی / آنالیز کالا</h3>
        <label>کالای قابل فروش</label>
        <select v-model.number="selectedProductGoodsId" @change="loadRecipeForSelectedProduct">
          <option v-for="item in goods.filter(g => g.IsSellable)" :key="item.GoodsId" :value="item.GoodsId">
            {{ item.GoodsCode }} - {{ item.GoodsName }}
          </option>
        </select>

        <div v-if="selectedProduct" class="selected-box">
          کالای انتخاب‌شده: <strong>{{ selectedProduct.GoodsName }}</strong>
        </div>

        <div class="table-wrap recipe-table">
          <table>
            <thead>
              <tr>
                <th>ماده اولیه / کالای انباری</th>
                <th>مقدار مصرف برای یک عدد</th>
                <th>درصد پرت</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in recipeItems" :key="index">
                <td>
                  <select v-model.number="item.IngredientGoodsId">
                    <option :value="0">انتخاب کالا</option>
                    <option v-for="g in goods.filter(x => x.IsPurchasable)" :key="g.GoodsId" :value="g.GoodsId">
                      {{ g.GoodsCode }} - {{ g.GoodsName }}
                    </option>
                  </select>
                </td>
                <td><input type="number" min="0" step="0.001" v-model.number="item.Quantity" /></td>
                <td><input type="number" min="0" step="0.01" v-model.number="item.WastePercent" /></td>
                <td><button @click="removeRecipeItem(index)">حذف</button></td>
              </tr>
            </tbody>
          </table>
        </div>

        <button @click="addRecipeItem">افزودن ماده</button>
        <button class="primary" @click="submitRecipe">ذخیره آنالیز کالا</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.analysis-tab { direction: rtl; color: #e5e7eb; height: 100%; overflow: auto; }
.analysis-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.analysis-header h2 { margin: 0; font-size: 24px; }
.analysis-header p, .hint { margin: 4px 0 0; color: #94a3b8; }
.grid { display: grid; grid-template-columns: 1.2fr .8fr; gap: 12px; }
.card { background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.08); border-radius: 16px; padding: 14px; }
.card h3 { margin: 0 0 10px; }
.message { padding: 10px 12px; border-radius: 12px; margin-bottom: 10px; background: rgba(59,130,246,.14); border: 1px solid rgba(59,130,246,.28); }
.primary, button { border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.05); color: #e5e7eb; border-radius: 10px; padding: 9px 12px; cursor: pointer; margin: 4px; }
.primary { background: rgba(20,184,166,.18) !important; border-color: rgba(20,184,166,.45) !important; color: #ccfbf1 !important; }
input, select { width: 100%; min-height: 38px; border-radius: 10px; border: 1px solid rgba(255,255,255,.1); background: #111827; color: #e5e7eb; padding: 7px 9px; box-sizing: border-box; }
input[type="checkbox"] { width: 22px; height: 22px; min-height: 22px; }
label { display: block; margin: 8px 0; color: #d1d5db; }
.table-wrap { max-height: 520px; overflow: auto; border-radius: 12px; border: 1px solid rgba(255,255,255,.08); margin: 10px 0; }
table { width: 100%; border-collapse: collapse; min-width: 680px; }
th, td { padding: 9px 10px; border-bottom: 1px solid rgba(255,255,255,.07); text-align: right; }
th { position: sticky; top: 0; background: #151b27; z-index: 1; color: #cbd5e1; }
.selected-box { margin: 10px 0; padding: 10px; border-radius: 12px; background: rgba(20,184,166,.1); border: 1px solid rgba(20,184,166,.22); }
@media (max-width: 1000px) { .grid { grid-template-columns: 1fr; } }
</style>
