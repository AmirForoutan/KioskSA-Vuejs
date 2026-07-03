<script setup lang="ts">
import "@majidh1/jalalidatepicker";
import "@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css";
import { computed, nextTick, onMounted, reactive, ref } from "vue";
import { loadDesktopCatalog, loadDesktopCustomers, searchDesktopCustomers, type DesktopCustomer, type DesktopProduct } from "../../../services/desktopApi";
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
const customerPickerOpen = ref(false);
const customerSearch = ref("");
const customerLoading = ref(false);
const customers = ref<DesktopCustomer[]>([]);
const selectedCustomerPickerIds = ref<number[]>([]);
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
  CustomerIdsText: "",
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
const selectedCustomerPickerIdSet = computed(() => new Set(selectedCustomerPickerIds.value));
const selectedGoodsCount = computed(() => parseNumberIds(discountForm.GoodsIdsText).length);
const selectedCustomerIds = computed(() => parseNumberIds(discountForm.CustomerIdsText));
const selectedCustomerCount = computed(() => selectedCustomerIds.value.length);
const selectedGoodsSummary = computed(() => {
  const ids = parseNumberIds(discountForm.GoodsIdsText);
  if (!ids.length) return "کالایی انتخاب نشده";
  if (ids.length <= 4) return ids.join(", ");
  return `${ids.slice(0, 4).join(", ")} و ${ids.length - 4} مورد دیگر`;
});
const selectedCustomersSummary = computed(() => {
  const ids = selectedCustomerIds.value;
  if (!ids.length) return "عمومی؛ برای همه مشتری‌ها";
  if (ids.length <= 5) return ids.map((id) => `#${id}`).join("، ");
  return `${ids.slice(0, 5).map((id) => `#${id}`).join("، ")} و ${ids.length - 5} مشتری دیگر`;
});

const filteredProducts = computed(() => {
  const q = productSearch.value.trim().toLowerCase();
  const rows = products.value.filter((item) => item && item.IsActive !== false);
  if (!q) return rows;
  return rows.filter((item) => `${item.GoodsId ?? ""} ${item.GoodsCode ?? ""} ${item.GoodsName ?? ""}`.toLowerCase().includes(q));
});

onMounted(() => {
  setupDatePicker();
  void refreshAll();
});

function setupDatePicker() {
  void nextTick(() => {
    const picker = (window as unknown as { jalaliDatepicker?: { startWatch?: (options?: unknown) => void } }).jalaliDatepicker;
    picker?.startWatch?.({ autoHide: true, persianDigits: false });
  });
}

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

function parseNumberIds(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(Number).filter((item) => Number.isFinite(item) && item > 0).filter((item, index, array) => array.indexOf(item) === index);
  }

  return String(value || "")
    .split(/[,،\n\s]+/)
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)
    .filter((item, index, array) => array.indexOf(item) === index);
}

function rowGoodsIds(row: LocalDiscount) {
  const record = row as Record<string, unknown>;
  if (Array.isArray(record.GoodsIds)) return parseNumberIds(record.GoodsIds);
  if (Array.isArray(record.goodsIds)) return parseNumberIds(record.goodsIds);
  if (typeof record.GoodsIds === "string") return parseNumberIds(record.GoodsIds);
  if (typeof record.GoodsIdsText === "string") return parseNumberIds(record.GoodsIdsText);
  return [];
}

function rowCustomerIds(row: LocalDiscount) {
  const record = row as Record<string, unknown>;
  if (Array.isArray(record.CustomerIds)) return parseNumberIds(record.CustomerIds);
  if (Array.isArray(record.customerIds)) return parseNumberIds(record.customerIds);
  if (typeof record.CustomerIds === "string") return parseNumberIds(record.CustomerIds);
  if (typeof record.CustomerIdsText === "string") return parseNumberIds(record.CustomerIdsText);
  return [];
}

function productId(product: DesktopProduct) {
  const record = product as Record<string, unknown>;
  return Number(product.GoodsId ?? record.ProductId ?? 0);
}

function productTitle(product: DesktopProduct) {
  const code = product.GoodsCode ? `کد ${product.GoodsCode} - ` : "";
  return `${code}${product.GoodsName ?? "کالا"}`;
}

function customerId(customer: DesktopCustomer) {
  return Number(customer.CustomerId ?? customer.UserId ?? 0);
}

function customerTitle(customer: DesktopCustomer) {
  const id = customerId(customer);
  const name = customer.FullName || customer.Name || `${customer.Firstname || ""} ${customer.Lastname || ""}`.trim() || "مشتری";
  const phone = customer.PhoneNumber || customer.Mobile || "";
  return `${id ? `#${id} - ` : ""}${name}${phone ? ` - ${phone}` : ""}`;
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
    CustomerIdsText: "",
  });
  selectedProductIds.value = [];
  selectedCustomerPickerIds.value = [];
}

function editDiscount(row: LocalDiscount) {
  const goodsIds = rowGoodsIds(row);
  const customerIds = rowCustomerIds(row);
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
    CustomerIdsText: customerIds.join(","),
  });
  selectedProductIds.value = goodsIds;
  selectedCustomerPickerIds.value = customerIds;
  activeTab.value = "discounts";
}

async function openProductPicker() {
  selectedProductIds.value = parseNumberIds(discountForm.GoodsIdsText);
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

async function openCustomerPicker() {
  selectedCustomerPickerIds.value = parseNumberIds(discountForm.CustomerIdsText);
  customerSearch.value = "";
  customerPickerOpen.value = true;
  await loadCustomersForPicker("");
}

function closeCustomerPicker() {
  customerPickerOpen.value = false;
}

async function loadCustomersForPicker(searchTerm: string) {
  customerLoading.value = true;
  try {
    const term = searchTerm.trim();
    const result = term ? await searchDesktopCustomers(term) : await loadDesktopCustomers("");
    customers.value = result.filter((customer) => customerId(customer) > 0);
    if (!customers.value.length) message.value = term ? "مشتری‌ای یافت نشد" : "لیست مشتری‌ها خالی است";
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در دریافت مشتری‌ها";
    customers.value = [];
  } finally {
    customerLoading.value = false;
  }
}

async function findCustomers() {
  await loadCustomersForPicker(customerSearch.value);
}

function isCustomerSelected(customer: DesktopCustomer) {
  const id = customerId(customer);
  return id > 0 && selectedCustomerPickerIdSet.value.has(id);
}

function toggleCustomer(customer: DesktopCustomer) {
  const id = customerId(customer);
  if (id <= 0) return;
  const current = new Set(selectedCustomerPickerIds.value);
  if (current.has(id)) current.delete(id);
  else current.add(id);
  selectedCustomerPickerIds.value = Array.from(current).sort((a, b) => a - b);
}

function selectFoundCustomers() {
  const current = new Set(selectedCustomerPickerIds.value);
  for (const customer of customers.value) {
    const id = customerId(customer);
    if (id > 0) current.add(id);
  }
  selectedCustomerPickerIds.value = Array.from(current).sort((a, b) => a - b);
}

function clearCustomerPickerSelection() {
  selectedCustomerPickerIds.value = [];
}

function clearDiscountCustomers() {
  discountForm.CustomerIdsText = "";
  selectedCustomerPickerIds.value = [];
}

function confirmCustomerSelection() {
  const ids = Array.from(new Set(selectedCustomerPickerIds.value.map(Number).filter((id) => Number.isFinite(id) && id > 0))).sort((a, b) => a - b);
  discountForm.CustomerIdsText = ids.join(",");
  selectedCustomerPickerIds.value = ids;
  customerPickerOpen.value = false;
}

function removeCustomerId(id: number) {
  const ids = parseNumberIds(discountForm.CustomerIdsText).filter((item) => item !== id);
  discountForm.CustomerIdsText = ids.join(",");
  selectedCustomerPickerIds.value = ids;
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
    const goodsIds = discountForm.ApplyToAllGoods ? [] : parseNumberIds(discountForm.GoodsIdsText);
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
      CustomerIds: parseNumberIds(discountForm.CustomerIdsText),
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
        <p>تعریف تخفیف عمومی یا تخفیف مخصوص چند مشتری؛ با انتخاب مشتری در فاکتور، تخفیف مخصوص او خودکار قابل اعمال
          می‌شود.</p>
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
          <label>از تاریخ<input v-model="discountForm.StartDate" readonly placeholder="1405/01/01" data-jdp /></label>
          <label>تا تاریخ<input v-model="discountForm.EndDate" readonly placeholder="1405/12/29" data-jdp /></label>
          <label>از ساعت<input v-model="discountForm.FromTime" placeholder="09:00" /></label>
          <label>تا ساعت<input v-model="discountForm.ToTime" placeholder="23:59" /></label>

          <div class="product-select-box wide" :class="{ disabled: discountForm.ApplyToAllGoods }">
            <div>
              <strong>کالاهای شامل تخفیف</strong>
              <span>{{ discountForm.ApplyToAllGoods ? 'همه کالاها' : `${selectedGoodsCount} کالا انتخاب شده` }}</span>
              <small v-if="!discountForm.ApplyToAllGoods">{{ selectedGoodsSummary }}</small>
            </div>
            <button class="btn" type="button" :disabled="discountForm.ApplyToAllGoods" @click="openProductPicker">انتخاب
              از لیست کالاها</button>
          </div>

          <div class="customer-select-box wide">
            <div>
              <strong>مشتریان مجاز برای این تخفیف</strong>
              <span>{{ selectedCustomerCount ? `${selectedCustomerCount} مشتری انتخاب شده` : 'عمومی؛ برای همه مشتری‌ها'
                }}</span>
              <small>{{ selectedCustomersSummary }}</small>
            </div>
            <div class="customer-selector-actions">
              <button class="btn" type="button" @click="openCustomerPicker">انتخاب از لیست مشتری‌ها</button>
              <button class="btn" type="button" :disabled="!selectedCustomerCount" @click="clearDiscountCustomers">پاک
                کردن انتخاب</button>
            </div>
            <div v-if="selectedCustomerIds.length" class="chip-list">
              <button v-for="id in selectedCustomerIds" :key="id" class="chip" type="button"
                @click="removeCustomerId(id)">#{{ id }} ×</button>
            </div>
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
              <th>شناسه</th>
              <th>عنوان</th>
              <th>نوع</th>
              <th>مقدار</th>
              <th>کالاها</th>
              <th>مشتری‌ها</th>
              <th>فعال</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in discounts" :key="row.DiscountId">
              <td>{{ row.DiscountId }}</td>
              <td>{{ row.Title }}</td>
              <td>{{ Number(row.DiscountType) === 1 ? 'درصدی' : 'مبلغی' }}</td>
              <td>{{ Number(row.DiscountType) === 1 ? row.DiscountPercent + '%' :
                Number(row.DiscountAmount).toLocaleString() }}</td>
              <td>{{ row.ApplyToAllGoods ? 'همه' : rowGoodsIds(row).join(',') }}</td>
              <td>{{ rowCustomerIds(row).length ? rowCustomerIds(row).join(',') : 'عمومی' }}</td>
              <td>{{ row.IsActive ? 'بله' : 'خیر' }}</td>
              <td class="row-actions"><button @click="editDiscount(row)">ویرایش</button><button
                  @click="removeDiscount(row)">غیرفعال</button></td>
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
          <label>از تاریخ<input v-model="cardForm.StartDate" readonly data-jdp /></label>
          <label>تا تاریخ<input v-model="cardForm.EndDate" readonly data-jdp /></label>
        </div>
        <div class="checks"><label><input v-model="cardForm.IsActive" type="checkbox" /> فعال</label></div>
        <div class="actions"><button class="btn primary" :disabled="loading">ذخیره</button><button class="btn"
            type="button" @click="resetCardForm">جدید</button></div>
      </form>

      <div class="card table-card">
        <table>
          <thead>
            <tr>
              <th>شناسه</th>
              <th>شماره</th>
              <th>مشتری</th>
              <th>درصد</th>
              <th>مبلغ</th>
              <th>مانده</th>
              <th>فعال</th>
              <th></th>
            </tr>
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
              <td class="row-actions"><button @click="editCard(row)">ویرایش</button><button
                  @click="removeCard(row)">غیرفعال</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="activeTab === 'transactions'" class="card table-card full">
      <table>
        <thead>
          <tr>
            <th>شناسه</th>
            <th>کارت</th>
            <th>فاکتور</th>
            <th>نوع</th>
            <th>مبلغ</th>
            <th>تاریخ</th>
            <th>شرح</th>
          </tr>
        </thead>
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

    <div v-if="customerPickerOpen" class="modal-backdrop" @click.self="closeCustomerPicker">
      <div class="product-modal customer-modal">
        <header class="modal-head">
          <div>
            <h3>انتخاب مشتری‌های مجاز تخفیف</h3>
            <p>{{ selectedCustomerPickerIds.length }} مشتری انتخاب شده است</p>
          </div>
          <button class="icon-btn" type="button" @click="closeCustomerPicker">×</button>
        </header>
        <div class="modal-toolbar customer-modal-toolbar">
          <input v-model="customerSearch" placeholder="جستجوی نام، موبایل یا شناسه مشتری"
            @keyup.enter.prevent="findCustomers" />
          <button class="btn" type="button" :disabled="customerLoading" @click="findCustomers">جستجو</button>
          <button class="btn" type="button" :disabled="!customers.length" @click="selectFoundCustomers">انتخاب همه
            نتایج</button>
          <button class="btn" type="button" @click="clearCustomerPickerSelection">پاک کردن انتخاب</button>
        </div>
        <div v-if="customerLoading" class="modal-state">در حال دریافت مشتری‌ها...</div>
        <div v-else-if="!customers.length" class="modal-state">مشتری‌ای برای نمایش وجود ندارد</div>
        <div v-else class="customer-list">
          <label v-for="customer in customers" :key="customerId(customer)" class="customer-row"
            :class="{ selected: isCustomerSelected(customer) }">
            <input type="checkbox" :checked="isCustomerSelected(customer)" @change="toggleCustomer(customer)" />
            <span class="customer-main">{{ customerTitle(customer) }}</span>
            <span class="customer-meta">شناسه: {{ customerId(customer) }}</span>
          </label>
        </div>
        <footer class="modal-footer">
          <button class="btn primary" type="button" @click="confirmCustomerSelection">تأیید انتخاب</button>
          <button class="btn" type="button" @click="closeCustomerPicker">انصراف</button>
        </footer>
      </div>
    </div>
  </section>
</template>

<style scoped>
.discounts-tab {
  direction: rtl;
  color: #e5e7eb;
  height: 100%;
  overflow: auto;
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.page-head h2 {
  margin: 0 0 4px;
  font-size: 22px;
}

.page-head p {
  margin: 0;
  color: #9ca3af;
}

.message {
  padding: 10px 12px;
  border-radius: 12px;
  margin-bottom: 12px;
  background: rgba(20, 184, 166, .12);
  border: 1px solid rgba(20, 184, 166, .25);
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.tabs button,
.btn,
.row-actions button,
.chip {
  border: 1px solid rgba(255, 255, 255, .1);
  color: #e5e7eb;
  background: rgba(255, 255, 255, .05);
  border-radius: 10px;
  padding: 9px 14px;
  cursor: pointer;
}

.tabs button.active,
.btn.primary {
  background: rgba(20, 184, 166, .22);
  border-color: rgba(20, 184, 166, .45);
  font-weight: 800;
}

.btn.ghost {
  background: transparent;
}

.btn:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.grid-layout {
  display: grid;
  grid-template-columns: minmax(330px, 460px) 1fr;
  gap: 12px;
  align-items: start;
}

.card {
  background: rgba(255, 255, 255, .04);
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 16px;
  padding: 14px;
}

.form h3 {
  margin: 0 0 12px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #cbd5e1;
  font-size: 13px;
}

.form-grid label.wide,
.form-grid .wide {
  grid-column: 1 / -1;
}

input,
select {
  border: 1px solid rgba(255, 255, 255, .12);
  background: rgba(0, 0, 0, .22);
  color: #fff;
  border-radius: 10px;
  padding: 9px 10px;
  outline: none;
}

.checks {
  display: flex;
  gap: 18px;
  margin: 12px 0;
}

.actions {
  display: flex;
  gap: 8px;
}

.table-card {
  overflow: auto;
}

.table-card.full {
  height: calc(100vh - 230px);
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 820px;
}

th,
td {
  text-align: right;
  padding: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, .07);
  white-space: nowrap;
}

th {
  color: #000000;
  font-weight: 800;
}

.row-actions {
  display: flex;
  gap: 6px;
}

.product-select-box,
.customer-select-box {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px dashed rgba(255, 255, 255, .18);
  border-radius: 14px;
  background: rgba(0, 0, 0, .16);
}

.product-select-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-select-box.disabled {
  opacity: .55;
}

.product-select-box div,
.customer-select-box>div:first-child {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.product-select-box span,
.customer-select-box span {
  color: #cbd5e1;
}

.product-select-box small,
.customer-select-box small {
  color: #93c5fd;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 330px;
}

.customer-selector-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  padding: 6px 9px;
  background: rgba(59, 130, 246, .18);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, .72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.product-modal {
  width: min(920px, 96vw);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  background: #111827;
  border: 1px solid rgba(255, 255, 255, .12);
  box-shadow: 0 24px 80px rgba(0, 0, 0, .5);
  overflow: hidden;
}

.customer-modal {
  width: min(680px, 94vw);
  max-height: 76vh;
}

.modal-head,
.modal-footer {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, .08);
}

.modal-footer {
  border-bottom: 0;
  border-top: 1px solid rgba(255, 255, 255, .08);
  justify-content: flex-start;
}

.modal-head h3 {
  margin: 0 0 4px;
}

.modal-head p {
  margin: 0;
  color: #9ca3af;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, .12);
  background: rgba(255, 255, 255, .06);
  color: #fff;
  font-size: 22px;
  cursor: pointer;
}

.modal-toolbar {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, .08);
}

.customer-modal-toolbar {
  grid-template-columns: 1fr auto auto auto;
}

.product-list,
.customer-list {
  overflow: auto;
  padding: 8px 12px;
}

.customer-list {
  max-height: 360px;
  min-height: 180px;
}

.product-row {
  display: grid;
  grid-template-columns: 34px 1fr 120px 130px;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, .07);
  cursor: pointer;
}

.customer-row {
  display: grid;
  grid-template-columns: 34px 1fr 110px;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, .07);
  cursor: pointer;
}

.product-row:hover,
.customer-row:hover {
  background: rgba(255, 255, 255, .04);
}

.customer-row.selected {
  background: rgba(20, 184, 166, .11);
}

.product-row input,
.customer-row input {
  width: 18px;
  height: 18px;
}

.product-main,
.customer-main {
  font-weight: 800;
}

.product-meta,
.customer-meta {
  color: #9ca3af;
}

.product-price {
  color: #bbf7d0;
  text-align: left;
}

.modal-state {
  padding: 34px;
  text-align: center;
  color: #9ca3af;
}

@media (max-width: 980px) {
  .grid-layout {
    grid-template-columns: 1fr;
  }

  .modal-toolbar,
  .customer-modal-toolbar {
    grid-template-columns: 1fr;
  }

  .product-row,
  .customer-row {
    grid-template-columns: 30px 1fr;
  }

  .product-meta,
  .product-price,
  .customer-meta {
    grid-column: 2;
    text-align: right;
  }
}
</style>