import "@majidh1/jalalidatepicker";
import "@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css";
import { computed, nextTick, onMounted, reactive, ref } from "vue";
import { loadDesktopCatalog, searchDesktopCustomers } from "../../../services/desktopApi";
import { disableLocalDiscount, disableLocalDiscountCard, listLocalDiscountCardTransactions, listLocalDiscountCards, listLocalDiscounts, saveLocalDiscount, saveLocalDiscountCard, } from "../../../services/localDiscountApi";
const loading = ref(false);
const productLoading = ref(false);
const productPickerOpen = ref(false);
const productSearch = ref("");
const customerSearch = ref("");
const customerLoading = ref(false);
const customers = ref([]);
const message = ref("");
const discounts = ref([]);
const cards = ref([]);
const transactions = ref([]);
const products = ref([]);
const selectedProductIds = ref([]);
const activeTab = ref("discounts");
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
const selectedGoodsCount = computed(() => parseNumberIds(discountForm.GoodsIdsText).length);
const selectedCustomerIds = computed(() => parseNumberIds(discountForm.CustomerIdsText));
const selectedCustomerCount = computed(() => selectedCustomerIds.value.length);
const selectedGoodsSummary = computed(() => {
    const ids = parseNumberIds(discountForm.GoodsIdsText);
    if (!ids.length)
        return "کالایی انتخاب نشده";
    if (ids.length <= 4)
        return ids.join(", ");
    return `${ids.slice(0, 4).join(", ")} و ${ids.length - 4} مورد دیگر`;
});
const filteredProducts = computed(() => {
    const q = productSearch.value.trim().toLowerCase();
    const rows = products.value.filter((item) => item && item.IsActive !== false);
    if (!q)
        return rows;
    return rows.filter((item) => `${item.GoodsId ?? ""} ${item.GoodsCode ?? ""} ${item.GoodsName ?? ""}`.toLowerCase().includes(q));
});
onMounted(() => {
    setupDatePicker();
    void refreshAll();
});
function setupDatePicker() {
    void nextTick(() => {
        const picker = window.jalaliDatepicker;
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
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در دریافت اطلاعات تخفیف";
    }
    finally {
        loading.value = false;
    }
}
async function loadProducts() {
    if (products.value.length)
        return;
    productLoading.value = true;
    try {
        const catalog = await loadDesktopCatalog(0);
        products.value = catalog.goods || [];
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در دریافت لیست کالاها";
    }
    finally {
        productLoading.value = false;
    }
}
function toNumber(value) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
}
function nullableText(value) {
    const normalized = String(value ?? "").trim();
    return normalized.length ? normalized : null;
}
function parseNumberIds(value) {
    if (Array.isArray(value)) {
        return value.map(Number).filter((item) => Number.isFinite(item) && item > 0).filter((item, index, array) => array.indexOf(item) === index);
    }
    return String(value || "")
        .split(/[,،\n\s]+/)
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isFinite(item) && item > 0)
        .filter((item, index, array) => array.indexOf(item) === index);
}
function rowGoodsIds(row) {
    const record = row;
    if (Array.isArray(record.GoodsIds))
        return parseNumberIds(record.GoodsIds);
    if (Array.isArray(record.goodsIds))
        return parseNumberIds(record.goodsIds);
    if (typeof record.GoodsIds === "string")
        return parseNumberIds(record.GoodsIds);
    if (typeof record.GoodsIdsText === "string")
        return parseNumberIds(record.GoodsIdsText);
    return [];
}
function rowCustomerIds(row) {
    const record = row;
    if (Array.isArray(record.CustomerIds))
        return parseNumberIds(record.CustomerIds);
    if (Array.isArray(record.customerIds))
        return parseNumberIds(record.customerIds);
    if (typeof record.CustomerIds === "string")
        return parseNumberIds(record.CustomerIds);
    if (typeof record.CustomerIdsText === "string")
        return parseNumberIds(record.CustomerIdsText);
    return [];
}
function productId(product) {
    const record = product;
    return Number(product.GoodsId ?? record.ProductId ?? 0);
}
function productTitle(product) {
    const code = product.GoodsCode ? `کد ${product.GoodsCode} - ` : "";
    return `${code}${product.GoodsName ?? "کالا"}`;
}
function customerId(customer) {
    return Number(customer.CustomerId ?? customer.UserId ?? 0);
}
function customerTitle(customer) {
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
}
function editDiscount(row) {
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
function isProductSelected(product) {
    const id = productId(product);
    return id > 0 && selectedProductIdSet.value.has(id);
}
function toggleProduct(product) {
    const id = productId(product);
    if (id <= 0)
        return;
    const current = new Set(selectedProductIds.value);
    if (current.has(id))
        current.delete(id);
    else
        current.add(id);
    selectedProductIds.value = Array.from(current).sort((a, b) => a - b);
}
function selectFilteredProducts() {
    const current = new Set(selectedProductIds.value);
    for (const product of filteredProducts.value) {
        const id = productId(product);
        if (id > 0)
            current.add(id);
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
async function findCustomers() {
    const q = customerSearch.value.trim();
    if (!q) {
        message.value = "برای جستجوی مشتری، نام یا موبایل را وارد کنید";
        return;
    }
    customerLoading.value = true;
    try {
        customers.value = await searchDesktopCustomers(q);
        if (!customers.value.length)
            message.value = "مشتری‌ای یافت نشد";
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در جستجوی مشتری";
    }
    finally {
        customerLoading.value = false;
    }
}
function addCustomerToDiscount(customer) {
    const id = customerId(customer);
    if (id <= 0)
        return;
    const current = new Set(parseNumberIds(discountForm.CustomerIdsText));
    current.add(id);
    discountForm.CustomerIdsText = Array.from(current).sort((a, b) => a - b).join(",");
}
function removeCustomerId(id) {
    discountForm.CustomerIdsText = parseNumberIds(discountForm.CustomerIdsText).filter((item) => item !== id).join(",");
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
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در ذخیره تخفیف";
    }
    finally {
        loading.value = false;
    }
}
async function removeDiscount(row) {
    if (!window.confirm(`تخفیف «${row.Title}» غیرفعال شود؟`))
        return;
    loading.value = true;
    try {
        await disableLocalDiscount(toNumber(row.DiscountId));
        message.value = "تخفیف غیرفعال شد";
        discounts.value = await listLocalDiscounts();
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در غیرفعال کردن تخفیف";
    }
    finally {
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
function editCard(row) {
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
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در ذخیره کارت تخفیف";
    }
    finally {
        loading.value = false;
    }
}
async function removeCard(row) {
    if (!window.confirm(`کارت «${row.CardNumber}» غیرفعال شود؟`))
        return;
    loading.value = true;
    try {
        await disableLocalDiscountCard(toNumber(row.DiscountCardId));
        message.value = "کارت تخفیف غیرفعال شد";
        cards.value = await listLocalDiscountCards();
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در غیرفعال کردن کارت";
    }
    finally {
        loading.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['page-head']} */ ;
/** @type {__VLS_StyleScopedClasses['page-head']} */ ;
/** @type {__VLS_StyleScopedClasses['tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['wide']} */ ;
/** @type {__VLS_StyleScopedClasses['table-card']} */ ;
/** @type {__VLS_StyleScopedClasses['row-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['product-select-box']} */ ;
/** @type {__VLS_StyleScopedClasses['product-select-box']} */ ;
/** @type {__VLS_StyleScopedClasses['product-select-box']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-select-box']} */ ;
/** @type {__VLS_StyleScopedClasses['product-select-box']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-select-box']} */ ;
/** @type {__VLS_StyleScopedClasses['product-select-box']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-select-box']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-results']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-results']} */ ;
/** @type {__VLS_StyleScopedClasses['chip']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-head']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-head']} */ ;
/** @type {__VLS_StyleScopedClasses['product-row']} */ ;
/** @type {__VLS_StyleScopedClasses['product-row']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-search-row']} */ ;
/** @type {__VLS_StyleScopedClasses['product-row']} */ ;
/** @type {__VLS_StyleScopedClasses['product-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['product-price']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "discounts-tab" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "page-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.refreshAll) },
    ...{ class: "btn ghost" },
    disabled: (__VLS_ctx.loading),
});
if (__VLS_ctx.hasMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "message" },
    });
    (__VLS_ctx.message);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "tabs" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeTab = 'discounts';
        } },
    ...{ class: ({ active: __VLS_ctx.activeTab === 'discounts' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeTab = 'cards';
        } },
    ...{ class: ({ active: __VLS_ctx.activeTab === 'cards' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeTab = 'transactions';
        } },
    ...{ class: ({ active: __VLS_ctx.activeTab === 'transactions' }) },
});
if (__VLS_ctx.activeTab === 'discounts') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grid-layout" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.submitDiscount) },
        ...{ class: "card form" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.discountForm.DiscountId ? 'ویرایش تخفیف' : 'تعریف تخفیف جدید');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({});
    (__VLS_ctx.discountForm.DiscountCode);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        required: true,
    });
    (__VLS_ctx.discountForm.Title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "wide" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({});
    (__VLS_ctx.discountForm.Description);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.discountForm.DiscountType),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (1),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (2),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
        max: "100",
    });
    (__VLS_ctx.discountForm.DiscountPercent);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
    });
    (__VLS_ctx.discountForm.DiscountAmount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
    });
    (__VLS_ctx.discountForm.MaxDiscountAmount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
    });
    (__VLS_ctx.discountForm.MinInvoiceAmount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        readonly: true,
        placeholder: "1405/01/01",
        'data-jdp': true,
    });
    (__VLS_ctx.discountForm.StartDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        readonly: true,
        placeholder: "1405/12/29",
        'data-jdp': true,
    });
    (__VLS_ctx.discountForm.EndDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "09:00",
    });
    (__VLS_ctx.discountForm.FromTime);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "23:59",
    });
    (__VLS_ctx.discountForm.ToTime);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "product-select-box wide" },
        ...{ class: ({ disabled: __VLS_ctx.discountForm.ApplyToAllGoods }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.discountForm.ApplyToAllGoods ? 'همه کالاها' : `${__VLS_ctx.selectedGoodsCount} کالا انتخاب شده`);
    if (!__VLS_ctx.discountForm.ApplyToAllGoods) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (__VLS_ctx.selectedGoodsSummary);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.openProductPicker) },
        ...{ class: "btn" },
        type: "button",
        disabled: (__VLS_ctx.discountForm.ApplyToAllGoods),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "customer-select-box wide" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.selectedCustomerCount ? `${__VLS_ctx.selectedCustomerCount} مشتری انتخاب شده` : 'عمومی؛ برای همه مشتری‌ها');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "مثلا 12,18,25 - خالی یعنی عمومی",
    });
    (__VLS_ctx.discountForm.CustomerIdsText);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "customer-search-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onKeyup: (__VLS_ctx.findCustomers) },
        placeholder: "جستجوی مشتری با نام یا موبایل",
    });
    (__VLS_ctx.customerSearch);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.findCustomers) },
        ...{ class: "btn" },
        type: "button",
        disabled: (__VLS_ctx.customerLoading),
    });
    if (__VLS_ctx.selectedCustomerIds.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "chip-list" },
        });
        for (const [id] of __VLS_getVForSourceType((__VLS_ctx.selectedCustomerIds))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeTab === 'discounts'))
                            return;
                        if (!(__VLS_ctx.selectedCustomerIds.length))
                            return;
                        __VLS_ctx.removeCustomerId(id);
                    } },
                key: (id),
                ...{ class: "chip" },
                type: "button",
            });
            (id);
        }
    }
    if (__VLS_ctx.customers.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "customer-results" },
        });
        for (const [customer] of __VLS_getVForSourceType((__VLS_ctx.customers))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeTab === 'discounts'))
                            return;
                        if (!(__VLS_ctx.customers.length))
                            return;
                        __VLS_ctx.addCustomerToDiscount(customer);
                    } },
                key: (__VLS_ctx.customerId(customer)),
                type: "button",
            });
            (__VLS_ctx.customerTitle(customer));
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "checks" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "checkbox",
    });
    (__VLS_ctx.discountForm.ApplyToAllGoods);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "checkbox",
    });
    (__VLS_ctx.discountForm.IsActive);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ class: "btn primary" },
        disabled: (__VLS_ctx.loading),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.resetDiscountForm) },
        ...{ class: "btn" },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card table-card" },
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [row] of __VLS_getVForSourceType((__VLS_ctx.discounts))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (row.DiscountId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (row.DiscountId);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (row.Title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (Number(row.DiscountType) === 1 ? 'درصدی' : 'مبلغی');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (Number(row.DiscountType) === 1 ? row.DiscountPercent + '%' :
            Number(row.DiscountAmount).toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (row.ApplyToAllGoods ? 'همه' : __VLS_ctx.rowGoodsIds(row).join(','));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.rowCustomerIds(row).length ? __VLS_ctx.rowCustomerIds(row).join(',') : 'عمومی');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (row.IsActive ? 'بله' : 'خیر');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: "row-actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeTab === 'discounts'))
                        return;
                    __VLS_ctx.editDiscount(row);
                } },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeTab === 'discounts'))
                        return;
                    __VLS_ctx.removeDiscount(row);
                } },
        });
    }
}
if (__VLS_ctx.activeTab === 'cards') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grid-layout" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.submitCard) },
        ...{ class: "card form" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.cardForm.DiscountCardId ? 'ویرایش کارت' : 'تعریف کارت جدید');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        required: true,
    });
    (__VLS_ctx.cardForm.CardNumber);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
    });
    (__VLS_ctx.cardForm.CustomerId);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({});
    (__VLS_ctx.cardForm.CustomerPhone);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({});
    (__VLS_ctx.cardForm.CustomerName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
        max: "100",
    });
    (__VLS_ctx.cardForm.DiscountPercent);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
    });
    (__VLS_ctx.cardForm.DiscountAmount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
    });
    (__VLS_ctx.cardForm.Balance);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        readonly: true,
        'data-jdp': true,
    });
    (__VLS_ctx.cardForm.StartDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        readonly: true,
        'data-jdp': true,
    });
    (__VLS_ctx.cardForm.EndDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "checks" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "checkbox",
    });
    (__VLS_ctx.cardForm.IsActive);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ class: "btn primary" },
        disabled: (__VLS_ctx.loading),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.resetCardForm) },
        ...{ class: "btn" },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card table-card" },
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [row] of __VLS_getVForSourceType((__VLS_ctx.cards))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (row.DiscountCardId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (row.DiscountCardId);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (row.CardNumber);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (row.CustomerName || row.CustomerPhone || '-');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (row.DiscountPercent);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (Number(row.DiscountAmount || 0).toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (Number(row.Balance || 0).toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (row.IsActive ? 'بله' : 'خیر');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: "row-actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeTab === 'cards'))
                        return;
                    __VLS_ctx.editCard(row);
                } },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeTab === 'cards'))
                        return;
                    __VLS_ctx.removeCard(row);
                } },
        });
    }
}
if (__VLS_ctx.activeTab === 'transactions') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card table-card full" },
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
    for (const [row] of __VLS_getVForSourceType((__VLS_ctx.transactions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (row.DiscountCardTransactionId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (row.DiscountCardTransactionId);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (row.CardNumber || row.DiscountCardId);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (row.SaleInvoiceId || '-');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (row.TransactionType);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (Number(row.Amount || 0).toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (row.TransactionDate);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (row.Description);
    }
}
if (__VLS_ctx.productPickerOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.closeProductPicker) },
        ...{ class: "modal-backdrop" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "product-modal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
        ...{ class: "modal-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.selectedProductIds.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeProductPicker) },
        ...{ class: "icon-btn" },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "جستجو بر اساس نام، کد یا شناسه کالا",
    });
    (__VLS_ctx.productSearch);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.selectFilteredProducts) },
        ...{ class: "btn" },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.clearProductSelection) },
        ...{ class: "btn" },
        type: "button",
    });
    if (__VLS_ctx.productLoading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-state" },
        });
    }
    else if (!__VLS_ctx.filteredProducts.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-state" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "product-list" },
        });
        for (const [product] of __VLS_getVForSourceType((__VLS_ctx.filteredProducts))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                key: (__VLS_ctx.productId(product)),
                ...{ class: "product-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                ...{ onChange: (...[$event]) => {
                        if (!(__VLS_ctx.productPickerOpen))
                            return;
                        if (!!(__VLS_ctx.productLoading))
                            return;
                        if (!!(!__VLS_ctx.filteredProducts.length))
                            return;
                        __VLS_ctx.toggleProduct(product);
                    } },
                type: "checkbox",
                checked: (__VLS_ctx.isProductSelected(product)),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "product-main" },
            });
            (__VLS_ctx.productTitle(product));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "product-meta" },
            });
            (__VLS_ctx.productId(product));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "product-price" },
            });
            (Number(product.GoodsPrice || 0).toLocaleString());
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
        ...{ class: "modal-footer" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.confirmProductSelection) },
        ...{ class: "btn primary" },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeProductPicker) },
        ...{ class: "btn" },
        type: "button",
    });
}
/** @type {__VLS_StyleScopedClasses['discounts-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['page-head']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['ghost']} */ ;
/** @type {__VLS_StyleScopedClasses['message']} */ ;
/** @type {__VLS_StyleScopedClasses['tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['form']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['wide']} */ ;
/** @type {__VLS_StyleScopedClasses['product-select-box']} */ ;
/** @type {__VLS_StyleScopedClasses['wide']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-select-box']} */ ;
/** @type {__VLS_StyleScopedClasses['wide']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-search-row']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['chip-list']} */ ;
/** @type {__VLS_StyleScopedClasses['chip']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-results']} */ ;
/** @type {__VLS_StyleScopedClasses['checks']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['table-card']} */ ;
/** @type {__VLS_StyleScopedClasses['row-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['form']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['checks']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['table-card']} */ ;
/** @type {__VLS_StyleScopedClasses['row-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['table-card']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-backdrop']} */ ;
/** @type {__VLS_StyleScopedClasses['product-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-head']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-state']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-state']} */ ;
/** @type {__VLS_StyleScopedClasses['product-list']} */ ;
/** @type {__VLS_StyleScopedClasses['product-row']} */ ;
/** @type {__VLS_StyleScopedClasses['product-main']} */ ;
/** @type {__VLS_StyleScopedClasses['product-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['product-price']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            productLoading: productLoading,
            productPickerOpen: productPickerOpen,
            productSearch: productSearch,
            customerSearch: customerSearch,
            customerLoading: customerLoading,
            customers: customers,
            message: message,
            discounts: discounts,
            cards: cards,
            transactions: transactions,
            selectedProductIds: selectedProductIds,
            activeTab: activeTab,
            discountForm: discountForm,
            cardForm: cardForm,
            hasMessage: hasMessage,
            selectedGoodsCount: selectedGoodsCount,
            selectedCustomerIds: selectedCustomerIds,
            selectedCustomerCount: selectedCustomerCount,
            selectedGoodsSummary: selectedGoodsSummary,
            filteredProducts: filteredProducts,
            refreshAll: refreshAll,
            rowGoodsIds: rowGoodsIds,
            rowCustomerIds: rowCustomerIds,
            productId: productId,
            productTitle: productTitle,
            customerId: customerId,
            customerTitle: customerTitle,
            resetDiscountForm: resetDiscountForm,
            editDiscount: editDiscount,
            openProductPicker: openProductPicker,
            closeProductPicker: closeProductPicker,
            isProductSelected: isProductSelected,
            toggleProduct: toggleProduct,
            selectFilteredProducts: selectFilteredProducts,
            clearProductSelection: clearProductSelection,
            confirmProductSelection: confirmProductSelection,
            findCustomers: findCustomers,
            addCustomerToDiscount: addCustomerToDiscount,
            removeCustomerId: removeCustomerId,
            submitDiscount: submitDiscount,
            removeDiscount: removeDiscount,
            resetCardForm: resetCardForm,
            editCard: editCard,
            submitCard: submitCard,
            removeCard: removeCard,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
