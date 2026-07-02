<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { loadDesktopCatalog, type DesktopProduct } from "../../../services/desktopApi";
import {
  disableLocalDiscount,
  disableLocalDiscountCard,
  listLocalDiscountCardTransactions,
  listLocalDiscountCards,
  listLocalDiscounts,
  saveLocalDiscount,
  saveLocalDiscountCard,
  type LocalDiscount,
  type LocalDiscountCard,
  type LocalDiscountCardTransaction,
} from "../../../services/localDiscountApi";

const loading = ref(false);
const productLoading = ref(false);
const productPickerOpen = ref(false);
const productSearch = ref("");
const message = ref("");
const discounts = ref<LocalDiscount[]>([]);
const cards = ref<LocalDiscountCard[]>([]);
const transactions = ref<LocalDiscountCardTransaction[]>([]);
const products = ref<DesktopProduct[]>([]);
const selectedProductIds = ref<number[]>([]);
const activeTab = ref<"discounts" | "cards" | "transactions">("discounts");

const discountForm = reactive({
  DiscountId: 0,
  DiscountCode: "",
  Title: "",
  Description: "",
  DiscountType: 1,
  DiscountPercent: 0,
  DiscountAmount: 0,
  MaxDiscountAmount: 0,
  MinInvoiceAmount: 0,
  StartDate: "",
  EndDate: "",
  FromTime: "",
  ToTime: "",
  ApplyToAllGoods: true,
  IsActive: true,
  GoodsIdsText: "",
});

const cardForm = reactive({
  DiscountCardId: 0,
  CardNumber: "",
  CustomerId: 0,
  CustomerPhone: "",
  CustomerName: "",
  DiscountPercent: 0,
  DiscountAmount: 0,
  Balance: 0,
  StartDate: "",
  EndDate: "",
  IsActive: true,
});

const hasMessage = computed(() => message.value.trim().length > 0);
const selectedProductIdSet = computed(() => new Set(selectedProductIds.value));
const selectedGoodsCount = computed(() => parseGoodsIds(discountForm.GoodsIdsText).length);
const selectedGoodsSummary = computed(() => {
  const ids = parseGoodsIds(discountForm.GoodsIdsText);
  if (!ids.length) return "کالایی انتخاب نشده";
  if (ids.length <= 4) return ids.join(", ");
  return `${ids.slice(0, 4).join(", ")} و ${ids.length - 4} مورد دیگر`;
});

const filteredProducts = computed(() => {
  const q = productSearch.value.trim().toLowerCase();
  const rows = products.value.filter((item) => item && item.IsActive !== false);
  if (!q) return rows;
  return rows.filter((item) => {
    const haystack = `${item.GoodsId ?? ""} ${item.GoodsCode ?? ""} ${item.GoodsName ?? ""}`.toLowerCase();
    return haystack.includes(q);
  });
});

onMounted(() => {
  void refreshAll();
});

async function refreshAll() {
  loading.value = true;
  message.value = "";
  try {
    const [discountRows, cardRows, transactionRows] = await Promise.all([
      listLocalDiscounts(),
      listLocalDiscountCards(),
      listLocalDiscountCardTransactions({ Take: 200 }),
    ]);
    discounts.value = discountRows;
    cards.value = cardRows;
    transactions.value = transactionRows;
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در دریافت اطلاعات تخفیف";
  } finally {
    loading.value = false;
  }
}

async function loadProducts() {
  if (products.value.length) return;
  productLoading.value = true;
  try {
    const catalog = await loadDesktopCatalog(0);
    products.value = catalog.goods || [];
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در دریافت لیست کالاها";
  } finally {
    productLoading.value = false;
  }
}

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function nullableText(value: string) {
  const normalized = String(value ?? "").trim();
  return normalized.length ? normalized : null;
}

function parseGoodsIds(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0)
      .filter((item, index, array) => array.indexOf(item) === index);
  }

  return String(value || "")
    .split(/[,،\n\s]+/)
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)
    .filter((item, index, array) => array.indexOf(item) === index);
}

function rowGoodsIds(row: LocalDiscount) {
  const record = row as Record<string, unknown>;
  if (Array.isArray(row.GoodsIds)) return parseGoodsIds(row.GoodsIds);
  if (Array.isArray(record.goodsIds)) return parseGoodsIds(record.goodsIds);
  if (typeof row.GoodsIds === "string") return parseGoodsIds(row.GoodsIds);
  if (typeof record.GoodsIdsText === "string") return parseGoodsIds(record.GoodsIdsText);
  return [];
}

function productId(product: DesktopProduct) {
  return Number(product.GoodsId ?? product.ProductId ?? 0);
}

function productTitle(product: DesktopProduct) {
  const code = product.GoodsCode ? `کد ${product.GoodsCode} - ` : "";
  return `${code}${product.GoodsName ?? "کالا"}`;
}

function resetDiscountForm() {
  Object.assign(discountForm, {
    DiscountId: 0,
    DiscountCode: "",
    Title: "",
    Description: "",
    DiscountType: 1,
    DiscountPercent: 0,
    DiscountAmount: 0,
    MaxDiscountAmount: 0,
    MinInvoiceAmount: 0,
    StartDate: "",
    EndDate: "",
    FromTime: "",
    ToTime: "",
    ApplyToAllGoods: true,
    IsActive: true,
    GoodsIdsText: "",
  });
  selectedProductIds.value = [];
}

function editDiscount(row: LocalDiscount) {
  const goodsIds = rowGoodsIds(row);
  Object.assign(discountForm, {
    DiscountId: toNumber(row.DiscountId),
    DiscountCode: String(row.DiscountCode ?? ""),
    Title: String(row.Title ?? ""),
    Description: String(row.Description ?? ""),
    DiscountType: toNumber(row.DiscountType) || 1,
    DiscountPercent: toNumber(row.DiscountPercent),
    DiscountAmount: toNumber(row.DiscountAmount),
    MaxDiscountAmount: toNumber(row.MaxDiscountAmount),
    MinInvoiceAmount: toNumber(row.MinInvoiceAmount),
    StartDate: String(row.StartDate ?? ""),
    EndDate: String(row.EndDate ?? ""),
    FromTime: String(row.FromTime ?? ""),
    ToTime: String(row.ToTime ?? ""),
    ApplyToAllGoods: row.ApplyToAllGoods !== false,
    IsActive: row.IsActive !== false,
    GoodsIdsText: goodsIds.join(","),
  });
  selectedProductIds.value = goodsIds;
  activeTab.value = "discounts";
}

async function openProductPicker() {
  selectedProductIds.value = parseGoodsIds(discountForm.GoodsIdsText);
  productSearch.value = "";
  productPickerOpen.value = true;
  await loadProducts();
}

function closeProductPicker() {
  productPickerOpen.value = false;
}

function isProductSelected(product: DesktopProduct) {
  const id = productId(product);
  return id > 0 && selectedProductIdSet.value.has(id);
}

function toggleProduct(product: DesktopProduct) {
  const id = productId(product);
  if (id <= 0) return;
  const current = new Set(selectedProductIds.value);
  if (current.has(id)) current.delete(id);
  else current.add(id);
  selectedProductIds.value = Array.from(current).sort((a, b) => a - b);
}

function selectFilteredProducts() {
  const current = new Set(selectedProductIds.value);
  for (const product of filteredProducts.value) {
    const id = productId(product);
    if (id > 0) current.add(id);
  }
  selectedProductIds.value = Array.from(current).sort((a, b) => a - b);
}

function clearProductSelection() {
  selectedProductIds.value = [];
}

function confirmProductSelection() {
  discountForm.GoodsIdsText = selectedProductIds.value.join(",");
  discountForm.ApplyToAllGoods = selectedProductIds.value.length === 0 ? discountForm.ApplyToAllGoods : false;
  productPickerOpen.value = false;
}

async function submitDiscount() {
  if (!discountForm.Title.trim()) {
    message.value = "عنوان تخفیف الزامی است";
    return;
  }
  if (discountForm.DiscountType === 1 && toNumber(discountForm.DiscountPercent) <= 0) {
    message.value = "درصد تخفیف باید بیشتر از صفر باشد";
    return;
  }
  if (discountForm.DiscountType === 2 && toNumber(discountForm.DiscountAmount) <= 0) {
    message.value = "مبلغ تخفیف باید بیشتر از صفر باشد";
    return;
  }

  loading.value = true;
  try {
    const goodsIds = discountForm.ApplyToAllGoods ? [] : parseGoodsIds(discountForm.GoodsIdsText);
    await saveLocalDiscount({
      DiscountId: discountForm.DiscountId,
      DiscountCode: nullableText(discountForm.DiscountCode) ?? undefined,
      Title: discountForm.Title.trim(),
      Description: nullableText(discountForm.Description) ?? undefined,
      DiscountType: discountForm.DiscountType,
      DiscountPercent: toNumber(discountForm.DiscountPercent),
      DiscountAmount: toNumber(discountForm.DiscountAmount),
      MaxDiscountAmount: toNumber(discountForm.MaxDiscountAmount),
      MinInvoiceAmount: toNumber(discountForm.MinInvoiceAmount),
      StartDate: nullableText(discountForm.StartDate),
      EndDate: nullableText(discountForm.EndDate),
      FromTime: nullableText(discountForm.FromTime),
      ToTime: nullableText(discountForm.ToTime),
      ApplyToAllGoods: discountForm.ApplyToAllGoods,
      IsActive: discountForm.IsActive,
      GoodsIds: goodsIds,
    });
    message.value = "تخفیف ذخیره شد";
    resetDiscountForm();
    discounts.value = await listLocalDiscounts();
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در ذخیره تخفیف";
  } finally {
    loading.value = false;
  }
}

async function removeDiscount(row: LocalDiscount) {
  if (!window.confirm(`تخفیف «${row.Title}» غیرفعال شود؟`)) return;
  loading.value = true;
  try {
    await disableLocalDiscount(toNumber(row.DiscountId));
    message.value = "تخفیف غیرفعال شد";
    discounts.value = await listLocalDiscounts();
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در غیرفعال کردن تخفیف";
  } finally {
    loading.value = false;
  }
}

function resetCardForm() {
  Object.assign(cardForm, {
    DiscountCardId: 0,
    CardNumber: "",
    CustomerId: 0,
    CustomerPhone: "",
    CustomerName: "",
    DiscountPercent: 0,
    DiscountAmount: 0,
    Balance: 0,
    StartDate: "",
    EndDate: "",
    IsActive: true,
  });
}

function editCard(row: LocalDiscountCard) {
  Object.assign(cardForm, {
    DiscountCardId: toNumber(row.DiscountCardId),
    CardNumber: String(row.CardNumber ?? ""),
    CustomerId: toNumber(row.CustomerId),
    CustomerPhone: String(row.CustomerPhone ?? ""),
    CustomerName: String(row.CustomerName ?? ""),
    DiscountPercent: toNumber(row.DiscountPercent),
    DiscountAmount: toNumber(row.DiscountAmount),
    Balance: toNumber(row.Balance),
    StartDate: String(row.StartDate ?? ""),
    EndDate: String(row.EndDate ?? ""),
    IsActive: row.IsActive !== false,
  });
  activeTab.value = "cards";
}

async function submitCard() {
  if (!cardForm.CardNumber.trim()) {
    message.value = "شماره کارت الزامی است";
    return;
  }
  loading.value = true;
  try {
    await saveLocalDiscountCard({
      DiscountCardId: cardForm.DiscountCardId,
      CardNumber: cardForm.CardNumber.trim(),
      CustomerId: cardForm.CustomerId > 0 ? cardForm.CustomerId : null,
      CustomerPhone: nullableText(cardForm.CustomerPhone) ?? undefined,
      CustomerName: nullableText(cardForm.CustomerName) ?? undefined,
      DiscountPercent: toNumber(cardForm.DiscountPercent),
      DiscountAmount: toNumber(cardForm.DiscountAmount),
      Balance: toNumber(cardForm.Balance),
      StartDate: nullableText(cardForm.StartDate),
      EndDate: nullableText(cardForm.EndDate),
      IsActive: cardForm.IsActive,
    });
    message.value = "کارت تخفیف ذخیره شد";
    resetCardForm();
    cards.value = await listLocalDiscountCards();
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در ذخیره کارت تخفیف";
  } finally {
    loading.value = false;
  }
}

async function removeCard(row: LocalDiscountCard) {
  if (!window.confirm(`کارت «${row.CardNumber}» غیرفعال شود؟`)) return;
  loading.value = true;
  try {
    await disableLocalDiscountCard(toNumber(row.DiscountCardId));
    message.value = "کارت تخفیف غیرفعال شد";
    cards.value = await listLocalDiscountCards();
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در غیرفعال کردن کارت";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="discounts-tab">
    <header class="page-head">
      <div>
        <h2>مدیریت تخفیف‌ها</h2>
        <p>تعریف، ویرایش و غیرفعال‌سازی تخفیف‌های داخلی و کارت‌های تخفیف</p>
      </div>
      <button class="btn ghost" :disabled="loading" @click="refreshAll">بروزرسانی</button>
    </header>

    <div v-if="hasMessage" class="message">{{ message }}</div>

    <nav class="tabs">
      <button :class="{ active: activeTab === 'discounts' }" @click="activeTab = 'discounts'">تخفیف‌ها</button>
      <button :class="{ active: activeTab === 'cards' }" @click="activeTab = 'cards'">کارت تخفیف</button>
      <button :class="{ active: activeTab === 'transactions' }" @click="activeTab = 'transactions'">تراکنش‌ها</button>
    </nav>

    <div v-if="activeTab === 'discounts'" class="grid-layout">
      <form class="card form" @submit.prevent="submitDiscount">
        <h3>{{ discountForm.DiscountId ? 'ویرایش تخفیف' : 'تعریف تخفیف جدید' }}</h3>
        <div class="form-grid">
          <label>کد تخفیف<input v-model="discountForm.DiscountCode" /></label>
          <label>عنوان<input v-model="discountForm.Title" required /></label>
          <label class="wide">توضیحات<input v-model="discountForm.Description" /></label>
          <label>نوع تخفیف
            <select v-model.number="discountForm.DiscountType">
              <option :value="1">درصدی</option>
              <option :value="2">مبلغی</option>
            </select>
          </label>
          <label>درصد<input v-model.number="discountForm.DiscountPercent" type="number" min="0" max="100" /></label>
          <label>مبلغ<input v-model.number="discountForm.DiscountAmount" type="number" min="0" /></label>
          <label>سقف تخفیف<input v-model.number="discountForm.MaxDiscountAmount" type="number" min="0" /></label>
          <label>حداقل فاکتور<input v-model.number="discountForm.MinInvoiceAmount" type="number" min="0" /></label>
          <label>از تاریخ<input v-model="discountForm.StartDate" placeholder="1405/01/01" /></label>
          <label>تا تاریخ<input v-model="discountForm.EndDate" placeholder="1405/12/29" /></label>
          <label>از ساعت<input v-model="discountForm.FromTime" placeholder="09:00" /></label>
          <label>تا ساعت<input v-model="discountForm.ToTime" placeholder="23:59" /></label>

          <div class="product-select-box wide" :class="{ disabled: discountForm.ApplyToAllGoods }">
            <div>
              <strong>کالاهای شامل تخفیف</strong>
              <span>{{ discountForm.ApplyToAllGoods ? 'همه کالاها' : `${selectedGoodsCount} کالا انتخاب شده` }}</span>
              <small v-if="!discountForm.ApplyToAllGoods">{{ selectedGoodsSummary }}</small>
            </div>
            <button class="btn" type="button" :disabled="discountForm.ApplyToAllGoods" @click="openProductPicker">
              انتخاب از لیست کالاها
            </button>
          </div>
        </div>
        <div class="checks">
          <label><input v-model="discountForm.ApplyToAllGoods" type="checkbox" /> برای همه کالاها</label>
          <label><input v-model="discountForm.IsActive" type="checkbox" /> فعال</label>
        </div>
        <div class="actions">
          <button class="btn primary" :disabled="loading">ذخیره</button>
          <button class="btn" type="button" @click="resetDiscountForm">جدید</button>
        </div>
      </form>

      <div class="card table-card">
        <table>
          <thead>
            <tr>
              <th>شناسه</th><th>عنوان</th><th>نوع</th><th>مقدار</th><th>کالاها</th><th>فعال</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in discounts" :key="row.DiscountId">
              <td>{{ row.DiscountId }}</td>
              <td>{{ row.Title }}</td>
              <td>{{ Number(row.DiscountType) === 1 ? 'درصدی' : 'مبلغی' }}</td>
              <td>{{ Number(row.DiscountType) === 1 ? row.DiscountPercent + '%' : Number(row.DiscountAmount).toLocaleString() }}</td>
              <td>{{ row.ApplyToAllGoods ? 'همه' : rowGoodsIds(row).join(',') }}</td>
              <td>{{ row.IsActive ? 'بله' : 'خیر' }}</td>
              <td class="row-actions"><button @click="editDiscount(row)">ویرایش</button><button @click="removeDiscount(row)">غیرفعال</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="activeTab === 'cards'" class="grid-layout">
      <form class="card form" @submit.prevent="submitCard">
        <h3>{{ cardForm.DiscountCardId ? 'ویرایش کارت' : 'تعریف کارت جدید' }}</h3>
        <div class="form-grid">
          <label>شماره کارت<input v-model="cardForm.CardNumber" required /></label>
          <label>شناسه مشتری<input v-model.number="cardForm.CustomerId" type="number" min="0" /></label>
          <label>موبایل مشتری<input v-model="cardForm.CustomerPhone" /></label>
          <label>نام مشتری<input v-model="cardForm.CustomerName" /></label>
          <label>درصد تخفیف<input v-model.number="cardForm.DiscountPercent" type="number" min="0" max="100" /></label>
          <label>مبلغ تخفیف<input v-model.number="cardForm.DiscountAmount" type="number" min="0" /></label>
          <label>مانده اعتبار<input v-model.number="cardForm.Balance" type="number" min="0" /></label>
          <label>از تاریخ<input v-model="cardForm.StartDate" /></label>
          <label>تا تاریخ<input v-model="cardForm.EndDate" /></label>
        </div>
        <div class="checks"><label><input v-model="cardForm.IsActive" type="checkbox" /> فعال</label></div>
        <div class="actions">
          <button class="btn primary" :disabled="loading">ذخیره</button>
          <button class="btn" type="button" @click="resetCardForm">جدید</button>
        </div>
      </form>

      <div class="card table-card">
        <table>
          <thead>
            <tr><th>شناسه</th><th>شماره</th><th>مشتری</th><th>درصد</th><th>مبلغ</th><th>مانده</th><th>فعال</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="row in cards" :key="row.DiscountCardId">
              <td>{{ row.DiscountCardId }}</td>
              <td>{{ row.CardNumber }}</td>
              <td>{{ row.CustomerName || row.CustomerPhone || '-' }}</td>
              <td>{{ row.DiscountPercent }}%</td>
              <td>{{ Number(row.DiscountAmount || 0).toLocaleString() }}</td>
              <td>{{ Number(row.Balance || 0).toLocaleString() }}</td>
              <td>{{ row.IsActive ? 'بله' : 'خیر' }}</td>
              <td class="row-actions"><button @click="editCard(row)">ویرایش</button><button @click="removeCard(row)">غیرفعال</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="activeTab === 'transactions'" class="card table-card full">
      <table>
        <thead><tr><th>شناسه</th><th>کارت</th><th>فاکتور</th><th>نوع</th><th>مبلغ</th><th>تاریخ</th><th>شرح</th></tr></thead>
        <tbody>
          <tr v-for="row in transactions" :key="row.DiscountCardTransactionId">
            <td>{{ row.DiscountCardTransactionId }}</td>
            <td>{{ row.CardNumber || row.DiscountCardId }}</td>
            <td>{{ row.SaleInvoiceId || '-' }}</td>
            <td>{{ row.TransactionType }}</td>
            <td>{{ Number(row.Amount || 0).toLocaleString() }}</td>
            <td>{{ row.TransactionDate }}</td>
            <td>{{ row.Description }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="productPickerOpen" class="modal-backdrop" @click.self="closeProductPicker">
      <div class="product-modal">
        <header class="modal-head">
          <div>
            <h3>انتخاب کالاهای شامل تخفیف</h3>
            <p>{{ selectedProductIds.length }} کالا انتخاب شده است</p>
          </div>
          <button class="icon-btn" type="button" @click="closeProductPicker">×</button>
        </header>

        <div class="modal-toolbar">
          <input v-model="productSearch" placeholder="جستجو بر اساس نام، کد یا شناسه کالا" />
          <button class="btn" type="button" @click="selectFilteredProducts">انتخاب همه نتایج</button>
          <button class="btn" type="button" @click="clearProductSelection">پاک کردن انتخاب</button>
        </div>

        <div v-if="productLoading" class="modal-state">در حال دریافت کالاها...</div>
        <div v-else-if="!filteredProducts.length" class="modal-state">کالایی یافت نشد</div>
        <div v-else class="product-list">
          <label v-for="product in filteredProducts" :key="productId(product)" class="product-row">
            <input type="checkbox" :checked="isProductSelected(product)" @change="toggleProduct(product)" />
            <span class="product-main">{{ productTitle(product) }}</span>
            <span class="product-meta">شناسه: {{ productId(product) }}</span>
            <span class="product-price">{{ Number(product.GoodsPrice || 0).toLocaleString() }}</span>
          </label>
        </div>

        <footer class="modal-footer">
          <button class="btn primary" type="button" @click="confirmProductSelection">تأیید انتخاب</button>
          <button class="btn" type="button" @click="closeProductPicker">انصراف</button>
        </footer>
      </div>
    </div>
  </section>
</template>

<style scoped>
.discounts-tab { direction: rtl; color: #e5e7eb; height: 100%; overflow: auto; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.page-head h2 { margin: 0 0 4px; font-size: 22px; }
.page-head p { margin: 0; color: #9ca3af; }
.message { padding: 10px 12px; border-radius: 12px; margin-bottom: 12px; background: rgba(20, 184, 166, .12); border: 1px solid rgba(20, 184, 166, .25); }
.tabs { display: flex; gap: 8px; margin-bottom: 12px; }
.tabs button, .btn, .row-actions button { border: 1px solid rgba(255,255,255,.1); color: #e5e7eb; background: rgba(255,255,255,.05); border-radius: 10px; padding: 9px 14px; cursor: pointer; }
.tabs button.active, .btn.primary { background: rgba(20,184,166,.22); border-color: rgba(20,184,166,.45); font-weight: 800; }
.btn.ghost { background: transparent; }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.grid-layout { display: grid; grid-template-columns: minmax(330px, 420px) 1fr; gap: 12px; align-items: start; }
.card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 16px; padding: 14px; }
.form h3 { margin: 0 0 12px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.form-grid label { display: flex; flex-direction: column; gap: 6px; color: #cbd5e1; font-size: 13px; }
.form-grid label.wide, .form-grid .wide { grid-column: 1 / -1; }
input, select { border: 1px solid rgba(255,255,255,.12); background: rgba(0,0,0,.22); color: #fff; border-radius: 10px; padding: 9px 10px; outline: none; }
.checks { display: flex; gap: 18px; margin: 12px 0; }
.actions { display: flex; gap: 8px; }
.table-card { overflow: auto; }
.table-card.full { height: calc(100vh - 230px); }
table { width: 100%; border-collapse: collapse; min-width: 760px; }
th, td { text-align: right; padding: 10px; border-bottom: 1px solid rgba(255,255,255,.07); white-space: nowrap; }
th { color: #93c5fd; font-weight: 800; }
.row-actions { display: flex; gap: 6px; }
.product-select-box { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px; border: 1px dashed rgba(255,255,255,.18); border-radius: 14px; background: rgba(0,0,0,.16); }
.product-select-box.disabled { opacity: .55; }
.product-select-box div { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.product-select-box span { color: #cbd5e1; }
.product-select-box small { color: #93c5fd; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 250px; }
.modal-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,.72); display: flex; align-items: center; justify-content: center; padding: 24px; }
.product-modal { width: min(920px, 96vw); max-height: 88vh; display: flex; flex-direction: column; border-radius: 20px; background: #111827; border: 1px solid rgba(255,255,255,.12); box-shadow: 0 24px 80px rgba(0,0,0,.5); overflow: hidden; }
.modal-head, .modal-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,.08); }
.modal-footer { border-bottom: 0; border-top: 1px solid rgba(255,255,255,.08); justify-content: flex-start; }
.modal-head h3 { margin: 0 0 4px; }
.modal-head p { margin: 0; color: #9ca3af; }
.icon-btn { width: 38px; height: 38px; border-radius: 999px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.06); color: #fff; font-size: 24px; cursor: pointer; }
.modal-toolbar { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,.08); }
.product-list { overflow: auto; padding: 8px 12px; }
.product-row { display: grid; grid-template-columns: 34px 1fr 120px 130px; align-items: center; gap: 10px; padding: 10px; border-bottom: 1px solid rgba(255,255,255,.07); cursor: pointer; }
.product-row:hover { background: rgba(255,255,255,.04); }
.product-row input { width: 18px; height: 18px; }
.product-main { font-weight: 800; }
.product-meta { color: #9ca3af; }
.product-price { color: #bbf7d0; text-align: left; }
.modal-state { padding: 40px; text-align: center; color: #9ca3af; }
@media (max-width: 980px) { .grid-layout { grid-template-columns: 1fr; } .modal-toolbar { grid-template-columns: 1fr; } .product-row { grid-template-columns: 30px 1fr; } .product-meta, .product-price { grid-column: 2; text-align: right; } }
</style>
