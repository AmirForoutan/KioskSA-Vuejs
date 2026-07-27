import { ref, computed, onMounted, watch } from 'vue';
import { fetchCategoriesApi, fetchGoodsApi, fetchToppingItemsApi, fetchToppingLevelsApi, fetchProductToppingsApi, saveCategoryApi, saveProductApi, saveToppingItemApi, saveToppingLevelApi, saveProductToppingApi, Delete, fetchInvoicesApi, fetchInvoiceItemsApi } from '../services/apiService';
import { useToast } from 'vue-toastification';
import ImageUploader from './ImageUploader.vue';
import CategoryModal from './CategoryModal.vue';
import ProductModal from './ProductModal.vue';
import ToppingItemModal from './ToppingItemModal.vue';
import ToppingLevelModal from './ToppingLevelModal.vue';
import ProductToppingModal from './ProductToppingModal.vue';
import CustomerManagement from './CustomerManagement.vue';
import VirtualKeyboard from './VirtualKeyboard.vue';
import "@majidh1/jalalidatepicker";
import "@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css";
import { ShwoKeyboardStatus } from '../utilities';
const toast = useToast();
const IsShowKeyboard = ref(false);
// حالت‌های تب‌ها
const activeTab = ref('manage-categories');
const toppingSubTab = ref('items');
// داده‌ها
const categories = ref([]);
const products = ref([]);
const toppingItems = ref([]);
const toppingLevels = ref([]);
const productToppings = ref([]);
// جستجوها
const categorySearch = ref('');
const productSearch = ref('');
const selectedProductCategory = ref('');
const toppingItemSearch = ref('');
const toppingLevelSearch = ref('');
const toppingProductSearch = ref('');
const selectedProductForTopping = ref('');
const selectedLevelForTopping = ref('');
const imageCategorySearch = ref('');
const imageProductSearch = ref('');
const selectedImageCategory = ref('');
// مدال‌ها
const showCategoryModalFlag = ref(false);
const showProductModalFlag = ref(false);
const showToppingItemModalFlag = ref(false);
const showToppingLevelModalFlag = ref(false);
const showProductToppingModalFlag = ref(false);
const currentCategory = ref(null);
const currentProduct = ref(null);
const currentToppingItem = ref(null);
const currentToppingLevel = ref(null);
const currentProductTopping = ref(null);
// متغیرهای جدید برای مدیریت فاکتورها
const invoices = ref([]);
const invoiceItems = ref({});
const invoiceToppings = ref({});
const expandedInvoices = ref([]);
const fromDate = ref(null);
const toDate = ref(null);
const invoiceSearch = ref('');
// مدیریت کیبورد مجازی
const showKeyboard = ref(false);
const activeInputType = ref('');
const activeInputRef = ref(null);
const isNumberMode = ref(false);
// refs برای فیلدهای ورودی برای کیبورد مجازی
const searchcategoryref = ref(null);
const searchgoodsref = ref(null);
const searchtopitemref = ref(null);
const searchtoplevelref = ref(null);
const searchinvoiceref = ref(null);
const searchcustomerref = ref(null);
const invoiceColumns = ref([
    { key: 'SaleInvoiceId', title: 'شناسه فاکتور', filterable: true },
    { key: 'SaleInvoiceNumberDay', title: 'شماره فاکتور روزانه', filterable: true },
    { key: 'OrderDate', title: 'تاریخ', filterable: true },
    { key: 'OrderTime', title: 'زمان' },
    { key: 'CustomerName', title: 'مشتری', filterable: true },
    { key: 'Price', title: 'مبلغ کل' },
    { key: 'Discount', title: 'تخفیف' },
    { key: 'Tax', title: 'مالیات' },
    { key: 'Payable', title: 'قابل پرداخت' }
]);
// فیلترهای محاسبه شده
const filteredCategories = computed(() => {
    const searchTerm = categorySearch.value.toLowerCase();
    return categories.value.filter(cat => {
        const name = typeof cat.GroupName === 'string' ? cat.GroupName : String(cat.GroupName);
        const code = typeof cat.GroupCode === 'string' ? cat.GroupCode : String(cat.GroupCode);
        return name.toLowerCase().includes(searchTerm) ||
            code.toLowerCase().includes(searchTerm);
    });
});
const filteredProducts = computed(() => {
    const searchTerm = productSearch.value.toLowerCase();
    return products.value.filter(product => {
        const matchesSearch = String(product.GoodsName).toLowerCase().includes(searchTerm) ||
            String(product.GoodsCode).toLowerCase().includes(searchTerm);
        const matchesCategory = !selectedProductCategory.value ||
            product.GoodsGroupId == selectedProductCategory.value;
        return matchesSearch && matchesCategory;
    });
});
const filteredToppingItems = computed(() => {
    const searchTerm = toppingItemSearch.value.toLowerCase();
    return toppingItems.value.filter(cat => {
        const name = typeof cat.GoodsName === 'string' ? cat.GoodsName : String(cat.GoodsName);
        const code = typeof cat.GoodsCode === 'string' ? cat.GoodsCode : String(cat.GoodsCode);
        return name.toLowerCase().includes(searchTerm) ||
            code.toLowerCase().includes(searchTerm);
    });
});
const filteredToppingLevels = computed(() => {
    const searchTerm = toppingLevelSearch.value.toLowerCase();
    return toppingLevels.value.filter(cat => {
        const name = typeof cat.LevelTitle === 'string' ? cat.LevelTitle : String(cat.LevelTitle);
        return name.toLowerCase().includes(searchTerm);
    });
});
const filteredProductToppings = computed(() => {
    const searchTerm = toppingProductSearch.value.toLowerCase();
    return productToppings.value.filter(cat => {
        const name = typeof cat.LevelId === 'string' ? cat.LevelId : String(cat.LevelId);
        const code = typeof cat.GoodsId === 'string' ? cat.GoodsId : String(cat.GoodsId);
        return name.toLowerCase().includes(searchTerm) ||
            code.toLowerCase().includes(searchTerm);
    });
});
const filteredImageCategories = computed(() => {
    const searchTerm = imageCategorySearch.value.toLowerCase();
    return categories.value.filter(cat => {
        const name = typeof cat.GroupName === 'string' ? cat.GroupName : String(cat.GroupName);
        const code = typeof cat.GroupCode === 'string' ? cat.GroupCode : String(cat.GroupCode);
        return name.toLowerCase().includes(searchTerm) ||
            code.toLowerCase().includes(searchTerm);
    });
});
const filteredImageProducts = computed(() => {
    const searchTerm = productSearch.value.toLowerCase();
    return products.value.filter(product => {
        const matchesSearch = String(product.GoodsName).toLowerCase().includes(searchTerm) ||
            String(product.GoodsCode).toLowerCase().includes(searchTerm);
        const matchesCategory = !selectedImageCategory.value ||
            product.GoodsGroupId == selectedImageCategory.value;
        return matchesSearch && matchesCategory;
    });
});
// توابع کمکی
function getCategoryName(categoryId) {
    const category = categories.value.find(c => c.GroupId == categoryId);
    return category ? category.GroupName : 'نامشخص';
}
function getToppingItemName(itemId) {
    const item = toppingItems.value.find(i => i.GoodsId == itemId);
    return item ? item.GoodsName : 'نامشخص';
}
function getLevelName(levelId) {
    const level = toppingLevels.value.find(l => l.LevelId == levelId);
    return level ? level.LevelTitle : 'نامشخص';
}
function getItemName(goodsid) {
    const item = products.value.find(l => l.GoodsId == goodsid);
    return item ? item.GoodsName : 'نامشخص';
}
function getGroupImage(groupId) {
    const version = new Date().toISOString().slice(0, 16).replace(/[^0-9]/g, "");
    return `./img/groups/${groupId}.png?v=${version}`;
}
function getGoodsImage(goodsId) {
    const version = new Date().toISOString().slice(0, 16).replace(/[^0-9]/g, "");
    return `/img/goods/${goodsId}.png?v=${version}`;
}
// توابع دریافت داده
async function loadData() {
    try {
        await Promise.all([
            fetchCategories(),
            fetchProducts(),
            fetchToppingItems(),
            fetchToppingLevels(),
            fetchProductToppings(),
            fetchInvoicesApi()
        ]);
    }
    catch (error) {
        toast.error('خطا در دریافت اطلاعات');
        console.error(error);
    }
}
async function fetchCategories() {
    const response = await fetchCategoriesApi();
    categories.value = response.GoodsGroup || [];
}
async function fetchProducts() {
    const response = await fetchGoodsApi();
    products.value = response.Goods || [];
}
async function fetchToppingItems() {
    const response = await fetchToppingItemsApi();
    toppingItems.value = response.ToppingGoods || [];
}
async function fetchToppingLevels() {
    const response = await fetchToppingLevelsApi();
    toppingLevels.value = response.ToppingLevel || [];
}
async function fetchProductToppings() {
    const response = await fetchProductToppingsApi();
    productToppings.value = response.Goods || [];
}
// توابع مدال‌ها
function showCategoryModal(category) {
    currentCategory.value = category ? { ...category } : {
        GroupId: 0,
        GroupCode: '',
        GroupName: '',
        IsActive: true
    };
    showCategoryModalFlag.value = true;
}
function showProductModal(product) {
    currentProduct.value = product ? { ...product } : {
        GoodsId: 0,
        GoodsCode: '',
        GoodsName: '',
        GoodsDescription: '',
        GoodsPrice: 0,
        TaxPercent: 0,
        DutyPercent: 0,
        PackingPrice: 0,
        GoodsGroupId: 0,
        StockInventory: 0,
        IsActive: true,
        Saturday: true,
        FromTimeSaturday: '00:00',
        ToTimeSaturday: '23:59',
        Sunday: true,
        FromTimeSunday: '00:00',
        ToTimeSunday: '23:59',
        Monday: true,
        FromTimeMonday: '00:00',
        ToTimeMonday: '23:59',
        Tuesday: true,
        FromTimeTuesday: '00:00',
        ToTimeTuesday: '23:59',
        Wednesday: true,
        FromTimeWednesday: '00:00',
        ToTimeWednesday: '23:59',
        Thursday: true,
        FromTimeThursday: '00:00',
        ToTimeThursday: '23:59',
        Friday: true,
        FromTimeFriday: '00:00',
        ToTimeFriday: '23:59'
    };
    showProductModalFlag.value = true;
}
function showToppingItemModal(item) {
    currentToppingItem.value = item ? { ...item } : {
        GoodsId: 0,
        GoodsCode: '',
        GoodsName: '',
        TaxPercent: 0,
        DutyPercent: 0,
        IsActive: true
    };
    showToppingItemModalFlag.value = true;
}
function showToppingLevelModal(level) {
    currentToppingLevel.value = level ? { ...level } : {
        LevelId: 0,
        LevelTitle: '',
        Priority: 0,
        MinCount: 0,
        MaxCount: 0
    };
    showToppingLevelModalFlag.value = true;
}
function showProductToppingModal(topping) {
    currentProductTopping.value = topping ? { ...topping } : {
        ToppingId: 0,
        GoodsId: selectedProductForTopping.value || products.value[0]?.GoodsId || 0,
        GoodsToppingId: toppingItems.value[0]?.GoodsId || 0,
        LevelId: selectedLevelForTopping.value || toppingLevels.value[0]?.LevelId || 0,
        GoodsCountDefault: 0,
        GoodsCount: 0,
        Price: 0,
        containerPrice: 0,
        MinCount: 0,
        MaxCount: 0
    };
    showProductToppingModalFlag.value = true;
}
function closeModals() {
    showCategoryModalFlag.value = false;
    showProductModalFlag.value = false;
    showToppingItemModalFlag.value = false;
    showToppingLevelModalFlag.value = false;
    showProductToppingModalFlag.value = false;
}
// توابع ذخیره
async function handleSaveCategory(categoryData) {
    try {
        const result = await saveCategoryApi(categoryData);
        if (result.status) {
            toast.success('دسته‌بندی با موفقیت ذخیره شد');
            fetchCategories();
            closeModals();
        }
        else {
            toast.error(result.message || 'خطا در ذخیره دسته‌بندی');
        }
    }
    catch (error) {
        toast.error('خطا در ذخیره دسته‌بندی');
        console.error(error);
    }
}
async function handleSaveProduct(productData) {
    try {
        const result = await saveProductApi(productData);
        if (result.status) {
            toast.success('کالا با موفقیت ذخیره شد');
            fetchProducts();
            closeModals();
        }
        else {
            toast.error(result.message || 'خطا در ذخیره کالا');
        }
    }
    catch (error) {
        toast.error('خطا در ذخیره کالا');
        console.error(error);
    }
}
async function handleSaveToppingItem(itemData) {
    try {
        const result = await saveToppingItemApi(itemData);
        if (result.status) {
            toast.success('قلم تاپینگ با موفقیت ذخیره شد');
            fetchToppingItems();
            closeModals();
        }
        else {
            toast.error(result.message || 'خطا در ذخیره قلم تاپینگ');
        }
    }
    catch (error) {
        toast.error('خطا در ذخیره قلم تاپینگ');
        console.error(error);
    }
}
async function handleSaveToppingLevel(levelData) {
    try {
        const result = await saveToppingLevelApi(levelData);
        if (result.status) {
            toast.success('مرحله تاپینگ با موفقیت ذخیره شد');
            fetchToppingLevels();
            closeModals();
        }
        else {
            toast.error(result.message || 'خطا در ذخیره مرحله تاپینگ');
        }
    }
    catch (error) {
        toast.error('خطا در ذخیره مرحله تاپینگ');
        console.error(error);
    }
}
async function handleSaveProductTopping(toppingData) {
    try {
        const result = await saveProductToppingApi(toppingData);
        if (result.status) {
            toast.success('تاپینگ کالا با موفقیت ذخیره شد');
            fetchProductToppings();
            closeModals();
        }
        else {
            toast.error(result.message || 'خطا در ذخیره تاپینگ کالا');
        }
    }
    catch (error) {
        toast.error('خطا در ذخیره تاپینگ کالا');
        console.error(error);
    }
}
// توابع آپلود تصاویر
function handleUploadSuccess({ itemId, itemType }) {
    toast.success(`تصویر ${itemType === 'category' ? 'دسته‌بندی' : itemType === 'product' ? 'کالا' : 'شعبه'} با موفقیت آپلود شد`);
}
function emptyCategorySearch() {
    imageCategorySearch.value = '';
}
function emptyProductSearch() {
    imageProductSearch.value = '';
}
function back() {
    window.location.reload();
}
// مقداردهی اولیه
onMounted(() => {
    loadData();
    loadDatePicker();
    IsShowKeyboard.value = ShwoKeyboardStatus();
});
async function deleteItem(id, type) {
    try {
        const result = await Delete(id, type);
        if (result.status) {
            if (type === 'Category') {
                toast.success(result.message);
                fetchCategories();
            }
            else if (type === 'Good') {
                toast.success(result.message);
                fetchProducts();
            }
            else if (type === 'Topping') {
                toast.success(result.message);
                fetchProductToppings();
            }
            else if (type === 'ToppingLevel') {
                toast.success(result.message);
                fetchToppingLevels();
            }
            else if (type === 'ToppingProduct') {
                toast.success(result.message);
                fetchToppingItems();
            }
        }
        else {
            toast.error('خطا در حذف، ' + result.message);
            return;
        }
    }
    catch (error) {
        toast.error('خطا در حذف');
        console.error(error);
    }
}
const invoiceFilters = ref({
    SaleInvoiceId: '',
    CustomerName: '',
    OrderDate: ''
});
// محاسبه‌کننده‌های جدید
const filteredInvoices = computed(() => {
    return invoices.value.filter(invoice => {
        const matchesSearch = !invoiceSearch.value ||
            String(invoice.SaleInvoiceId).includes(invoiceSearch.value) ||
            (invoice.CustomerName && invoice.CustomerName.includes(invoiceSearch.value));
        const matchesFilters = Object.entries(invoiceFilters.value).every(([key, value]) => {
            if (!value)
                return true;
            return String(invoice[key]).includes(value);
        });
        return matchesSearch && matchesFilters;
    });
});
const totalInvoicePrice = computed(() => {
    return filteredInvoices.value.reduce((sum, invoice) => sum + invoice.Price, 0);
});
const totalInvoiceDiscount = computed(() => {
    return filteredInvoices.value.reduce((sum, invoice) => sum + invoice.Discount, 0);
});
const totalInvoiceTax = computed(() => {
    return filteredInvoices.value.reduce((sum, invoice) => sum + invoice.Tax, 0);
});
const totalInvoicePayable = computed(() => {
    return filteredInvoices.value.reduce((sum, invoice) => sum + invoice.Payable, 0);
});
// توابع جدید
async function fetchInvoices() {
    try {
        const params = {
            FromDate: fromDate.value,
            ToDate: toDate.value
        };
        const response = await fetchInvoicesApi(params);
        invoices.value = response.data || [];
    }
    catch (error) {
        toast.error('خطا در دریافت فاکتورها');
        console.error('Error fetching invoices:', error);
    }
}
async function fetchInvoiceDetails(invoiceId) {
    try {
        const response = await fetchInvoiceItemsApi(invoiceId);
        invoiceItems.value[invoiceId] = response.data.items || [];
        invoiceToppings.value[invoiceId] = response.data.toppings || [];
    }
    catch (error) {
        toast.error('خطا در دریافت جزئیات فاکتور');
        console.error('Error fetching invoice details:', error);
    }
}
async function toggleInvoiceDetails(invoiceId) {
    const index = expandedInvoices.value.indexOf(invoiceId);
    if (index === -1) {
        if (!invoiceItems.value[invoiceId]) {
            await fetchInvoiceDetails(invoiceId);
        }
        expandedInvoices.value.push(invoiceId);
    }
    else {
        expandedInvoices.value.splice(index, 1);
    }
}
function hasToppings(invoiceId) {
    return invoiceToppings.value[invoiceId] && invoiceToppings.value[invoiceId].length > 0;
}
function getToppings(invoiceId) {
    return invoiceToppings.value[invoiceId] || [];
}
function applyInvoiceFilters() {
    // فیلترها به صورت computed هستند و به صورت خودکار اعمال می‌شوند
}
function formatPrice(price) {
    return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
}
watch(() => invoices.value === 'manage-invoices', (newVal) => {
    // با تاخیر 100 میلی‌ثانیه صبر می‌کنیم تا DOM به روز رسانی شود
    setTimeout(loadDatePicker, 1000);
}, { deep: true });
function loadDatePicker() {
    jalaliDatepicker.startWatch({
        autoShow: false
    });
    // فقط inputهایی که هنوز رویداد focus برایشان تنظیم نشده را انتخاب کنید
    const inputList = document.querySelectorAll("input[data-jdp]:not([data-jdp-initialized])");
    for (let i = 0; i < inputList.length; i++) {
        inputList[i].setAttribute('data-jdp-initialized', 'true');
        inputList[i].addEventListener('focus', function () {
            if (this.hasAttribute("data-jdp-option-2")) {
                jalaliDatepicker.updateOptions({
                    date: true,
                    time: false,
                    hasSecond: false,
                    showEmptyBtn: false,
                    maxDate: 'today'
                });
            }
            else {
                jalaliDatepicker.updateOptions({
                    date: true,
                    time: true,
                    hasSecond: false,
                    showEmptyBtn: false,
                    initTime: '23:59'
                });
            }
            jalaliDatepicker.show(this);
        });
    }
}
////////////////////////
///// Virtual Keyboard ///////
const numberModeInputs = [];
function handleInputClick(event, inputType) {
    if (IsShowKeyboard.value == true) {
        activeInputType.value = inputType;
        showKeyboard.value = true;
        isNumberMode.value = numberModeInputs.includes(inputType);
        // تنظیم ref مربوطه
        switch (inputType) {
            case 'searchcategory':
                activeInputRef.value = searchcategoryref.value;
                break;
            case 'searchgoods':
                activeInputRef.value = searchgoodsref.value;
                break;
            case 'searchtopitem':
                activeInputRef.value = searchtopitemref.value;
                break;
            case 'searchtoplevel':
                activeInputRef.value = searchtoplevelref.value;
                break;
            case 'searchinvoice':
                activeInputRef.value = searchinvoiceref.value;
                break;
            case 'searchcustomer':
                activeInputRef.value = searchcustomerref.value;
                break;
        }
        event.preventDefault();
    }
}
function handleInputFocus(inputType) {
    if (IsShowKeyboard.value == true) {
        activeInputType.value = inputType;
        showKeyboard.value = true;
        isNumberMode.value = numberModeInputs.includes(inputType);
        // تنظیم ref مربوطه
        switch (inputType) {
            case 'searchcategory':
                activeInputRef.value = searchcategoryref.value;
                break;
            case 'searchgoods':
                activeInputRef.value = searchgoodsref.value;
                break;
            case 'searchtopitem':
                activeInputRef.value = searchtopitemref.value;
                break;
            case 'searchtoplevel':
                activeInputRef.value = searchtoplevelref.value;
                break;
            case 'searchinvoice':
                activeInputRef.value = searchinvoiceref.value;
                break;
            case 'searchcustomer':
                activeInputRef.value = searchcustomerref.value;
                break;
        }
    }
}
function hideKeyboard() {
    showKeyboard.value = false;
    activeInputType.value = '';
    activeInputRef.value = null;
}
function handleKeyPress(key) {
    if (!activeInputRef.value)
        return;
    const input = activeInputRef.value;
    const currentValue = input.value;
    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;
    if (key === '{bksp}') {
        // حذف کاراکتر
        if (selectionStart === selectionEnd && selectionStart > 0) {
            input.value = currentValue.substring(0, selectionStart - 1) + currentValue.substring(selectionStart);
            input.selectionStart = input.selectionEnd = selectionStart - 1;
        }
        else if (selectionStart !== selectionEnd) {
            input.value = currentValue.substring(0, selectionStart) + currentValue.substring(selectionEnd);
            input.selectionStart = input.selectionEnd = selectionStart;
        }
    }
    else if (key === '{enter}') {
        // ثبت و مخفی کردن کیبورد
        hideKeyboard();
    }
    else {
        // درج کاراکتر جدید
        const newValue = currentValue.substring(0, selectionStart) + key + currentValue.substring(selectionEnd);
        input.value = newValue;
        const newPosition = selectionStart + key.length;
        input.selectionStart = input.selectionEnd = newPosition;
    }
    // انتشار رویداد input برای به روزرسانی واکنشی
    input.dispatchEvent(new Event('input'));
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "admin-back-div" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.back) },
    type: "button",
    ...{ class: "refresh-btn" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "admin-image-upload-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "admin-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "admin-content" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tabs" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeTab = 'manage-categories';
        } },
    ...{ class: ({ 'active': __VLS_ctx.activeTab === 'manage-categories' }) },
    ...{ class: "tab-button" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeTab = 'manage-products';
        } },
    ...{ class: ({ 'active': __VLS_ctx.activeTab === 'manage-products' }) },
    ...{ class: "tab-button" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeTab = 'manage-toppings';
        } },
    ...{ class: ({ 'active': __VLS_ctx.activeTab === 'manage-toppings' }) },
    ...{ class: "tab-button" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeTab = 'image-categories';
        } },
    ...{ class: ({ 'active': __VLS_ctx.activeTab === 'image-categories' }) },
    ...{ class: "tab-button" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeTab = 'image-products';
        } },
    ...{ class: ({ 'active': __VLS_ctx.activeTab === 'image-products' }) },
    ...{ class: "tab-button" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeTab = 'manage-invoices';
        } },
    ...{ class: ({ 'active': __VLS_ctx.activeTab === 'manage-invoices' }) },
    ...{ class: "tab-button" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeTab = 'manage-customers';
        } },
    ...{ class: ({ 'active': __VLS_ctx.activeTab === 'manage-customers' }) },
    ...{ class: "tab-button" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tab-content" },
});
if (__VLS_ctx.activeTab === 'manage-categories') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "manage-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "controls-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "search-filter" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeTab === 'manage-categories'))
                    return;
                __VLS_ctx.handleInputClick($event, 'searchcategory');
            } },
        ...{ onFocus: (...[$event]) => {
                if (!(__VLS_ctx.activeTab === 'manage-categories'))
                    return;
                __VLS_ctx.handleInputFocus('searchcategory');
            } },
        placeholder: "جستجوی دسته‌بندی...",
        ...{ class: "search-input" },
        ref: "searchcategoryref",
    });
    (__VLS_ctx.categorySearch);
    /** @type {typeof __VLS_ctx.searchcategoryref} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeTab === 'manage-categories'))
                    return;
                __VLS_ctx.showCategoryModal(null);
            } },
        ...{ class: "add-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-plus" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.fetchCategories) },
        ...{ class: "refresh-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-sync-alt" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "items-grid" },
    });
    for (const [category] of __VLS_getVForSourceType((__VLS_ctx.filteredCategories))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (category.GroupId),
            ...{ class: "item-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "item-info" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (category.GroupName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (category.GroupCode);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (category.IsActive ? 'فعال' : 'غیرفعال');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "item-actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeTab === 'manage-categories'))
                        return;
                    __VLS_ctx.showCategoryModal(category);
                } },
            ...{ class: "edit-btn" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-edit" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeTab === 'manage-categories'))
                        return;
                    __VLS_ctx.deleteItem(category.GroupId, 'Category');
                } },
            ...{ class: "delete-btn" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-trash-alt" },
        });
    }
}
if (__VLS_ctx.activeTab === 'manage-products') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "manage-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "controls-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "search-filter" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeTab === 'manage-products'))
                    return;
                __VLS_ctx.handleInputClick($event, 'searchgoods');
            } },
        ...{ onFocus: (...[$event]) => {
                if (!(__VLS_ctx.activeTab === 'manage-products'))
                    return;
                __VLS_ctx.handleInputFocus('searchgoods');
            } },
        placeholder: "جستجوی کالا...",
        ...{ class: "search-input" },
        ref: "searchgoodsref",
    });
    (__VLS_ctx.productSearch);
    /** @type {typeof __VLS_ctx.searchgoodsref} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.selectedProductCategory),
        ...{ class: "category-select" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "",
    });
    for (const [cat] of __VLS_getVForSourceType((__VLS_ctx.categories))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (cat.GroupId),
            key: (cat.GroupId),
        });
        (cat.GroupName);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeTab === 'manage-products'))
                    return;
                __VLS_ctx.showProductModal(null);
            } },
        ...{ class: "add-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-plus" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.fetchProducts) },
        ...{ class: "refresh-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-sync-alt" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "items-grid" },
    });
    for (const [product] of __VLS_getVForSourceType((__VLS_ctx.filteredProducts))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (product.GoodsId),
            ...{ class: "item-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "item-info" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (product.GoodsName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (product.GoodsCode);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (product.StockInventory);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (product.GoodsPrice.toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.getCategoryName(product.GoodsGroupId));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "item-actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeTab === 'manage-products'))
                        return;
                    __VLS_ctx.showProductModal(product);
                } },
            ...{ class: "edit-btn" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-edit" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeTab === 'manage-products'))
                        return;
                    __VLS_ctx.deleteItem(product.GoodsId, 'Good');
                } },
            ...{ class: "delete-btn" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-trash-alt" },
        });
    }
}
if (__VLS_ctx.activeTab === 'manage-toppings') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "manage-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sub-tabs" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeTab === 'manage-toppings'))
                    return;
                __VLS_ctx.toppingSubTab = 'items';
            } },
        ...{ class: ({ 'active': __VLS_ctx.toppingSubTab === 'items' }) },
        ...{ class: "sub-tab-button" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeTab === 'manage-toppings'))
                    return;
                __VLS_ctx.toppingSubTab = 'levels';
            } },
        ...{ class: ({ 'active': __VLS_ctx.toppingSubTab === 'levels' }) },
        ...{ class: "sub-tab-button" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeTab === 'manage-toppings'))
                    return;
                __VLS_ctx.toppingSubTab = 'product-toppings';
            } },
        ...{ class: ({ 'active': __VLS_ctx.toppingSubTab === 'product-toppings' }) },
        ...{ class: "sub-tab-button" },
    });
    if (__VLS_ctx.toppingSubTab === 'items') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "topping-items-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "controls-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "search-filter" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeTab === 'manage-toppings'))
                        return;
                    if (!(__VLS_ctx.toppingSubTab === 'items'))
                        return;
                    __VLS_ctx.handleInputClick($event, 'searchtopitem');
                } },
            ...{ onFocus: (...[$event]) => {
                    if (!(__VLS_ctx.activeTab === 'manage-toppings'))
                        return;
                    if (!(__VLS_ctx.toppingSubTab === 'items'))
                        return;
                    __VLS_ctx.handleInputFocus('searchtopitem');
                } },
            placeholder: "جستجوی اقلام تاپینگ...",
            ...{ class: "search-input" },
            ref: "searchtopitemref",
        });
        (__VLS_ctx.toppingItemSearch);
        /** @type {typeof __VLS_ctx.searchtopitemref} */ ;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeTab === 'manage-toppings'))
                        return;
                    if (!(__VLS_ctx.toppingSubTab === 'items'))
                        return;
                    __VLS_ctx.showToppingItemModal(null);
                } },
            ...{ class: "add-btn" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-plus" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.fetchToppingItems) },
            ...{ class: "refresh-btn" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-sync-alt" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "items-grid" },
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.filteredToppingItems))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (item.GoodsId),
                ...{ class: "item-card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "item-info" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
            (item.GoodsName);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (item.GoodsCode);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (item.TaxPercent);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (item.DutyPercent);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "item-actions" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeTab === 'manage-toppings'))
                            return;
                        if (!(__VLS_ctx.toppingSubTab === 'items'))
                            return;
                        __VLS_ctx.showToppingItemModal(item);
                    } },
                ...{ class: "edit-btn" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-edit" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeTab === 'manage-toppings'))
                            return;
                        if (!(__VLS_ctx.toppingSubTab === 'items'))
                            return;
                        __VLS_ctx.deleteItem(item.GoodsId, 'ToppingProduct');
                    } },
                ...{ class: "delete-btn" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-trash-alt" },
            });
        }
    }
    if (__VLS_ctx.toppingSubTab === 'levels') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "topping-levels-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "controls-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "search-filter" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeTab === 'manage-toppings'))
                        return;
                    if (!(__VLS_ctx.toppingSubTab === 'levels'))
                        return;
                    __VLS_ctx.handleInputClick($event, 'searchtoplevel');
                } },
            ...{ onFocus: (...[$event]) => {
                    if (!(__VLS_ctx.activeTab === 'manage-toppings'))
                        return;
                    if (!(__VLS_ctx.toppingSubTab === 'levels'))
                        return;
                    __VLS_ctx.handleInputFocus('searchtoplevel');
                } },
            placeholder: "جستجوی مراحل تاپینگ...",
            ...{ class: "search-input" },
            ref: "searchtoplevelref",
        });
        (__VLS_ctx.toppingLevelSearch);
        /** @type {typeof __VLS_ctx.searchtoplevelref} */ ;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeTab === 'manage-toppings'))
                        return;
                    if (!(__VLS_ctx.toppingSubTab === 'levels'))
                        return;
                    __VLS_ctx.showToppingLevelModal(null);
                } },
            ...{ class: "add-btn" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-plus" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.fetchToppingLevels) },
            ...{ class: "refresh-btn" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-sync-alt" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "items-grid" },
        });
        for (const [level] of __VLS_getVForSourceType((__VLS_ctx.filteredToppingLevels))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (level.LevelId),
                ...{ class: "item-card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "item-info" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
            (level.LevelTitle);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (level.Priority);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (level.MinCount);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (level.MaxCount);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "item-actions" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeTab === 'manage-toppings'))
                            return;
                        if (!(__VLS_ctx.toppingSubTab === 'levels'))
                            return;
                        __VLS_ctx.showToppingLevelModal(level);
                    } },
                ...{ class: "edit-btn" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-edit" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeTab === 'manage-toppings'))
                            return;
                        if (!(__VLS_ctx.toppingSubTab === 'levels'))
                            return;
                        __VLS_ctx.deleteItem(level.LevelId, 'ToppingLevel');
                    } },
                ...{ class: "delete-btn" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-trash-alt" },
            });
        }
    }
    if (__VLS_ctx.toppingSubTab === 'product-toppings') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "product-toppings-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "controls-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "search-filter" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.selectedProductForTopping),
            ...{ class: "product-select" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        for (const [product] of __VLS_getVForSourceType((__VLS_ctx.products))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: (product.GoodsId),
                key: (product.GoodsId),
            });
            (product.GoodsName);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.selectedLevelForTopping),
            ...{ class: "level-select" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        for (const [level] of __VLS_getVForSourceType((__VLS_ctx.toppingLevels))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: (level.LevelId),
                key: (level.LevelId),
            });
            (level.LevelTitle);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeTab === 'manage-toppings'))
                        return;
                    if (!(__VLS_ctx.toppingSubTab === 'product-toppings'))
                        return;
                    __VLS_ctx.showProductToppingModal(null);
                } },
            ...{ class: "add-btn" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-plus" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.fetchProductToppings) },
            ...{ class: "refresh-btn" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-sync-alt" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "items-grid" },
        });
        for (const [topping] of __VLS_getVForSourceType((__VLS_ctx.filteredProductToppings))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (topping.ToppingId),
                ...{ class: "item-card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "item-info" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
            (__VLS_ctx.getToppingItemName(topping.GoodsToppingId));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (__VLS_ctx.getItemName(topping.GoodsId));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (__VLS_ctx.getLevelName(topping.LevelId));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (topping.GoodsCountDefault);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (topping.Price.toLocaleString());
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (topping.MinCount);
            (topping.MaxCount);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "item-actions" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeTab === 'manage-toppings'))
                            return;
                        if (!(__VLS_ctx.toppingSubTab === 'product-toppings'))
                            return;
                        __VLS_ctx.showProductToppingModal(topping);
                    } },
                ...{ class: "edit-btn" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-edit" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeTab === 'manage-toppings'))
                            return;
                        if (!(__VLS_ctx.toppingSubTab === 'product-toppings'))
                            return;
                        __VLS_ctx.deleteItem(topping.ToppingId, 'Topping');
                    } },
                ...{ class: "delete-btn" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-trash-alt" },
            });
        }
    }
}
if (__VLS_ctx.activeTab === 'image-categories') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "image-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "search-filter" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "جستجوی دسته‌بندی...",
        ...{ class: "search-input" },
    });
    (__VLS_ctx.imageCategorySearch);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.emptyCategorySearch) },
        ...{ class: "empty-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-trash-alt" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.fetchCategories) },
        ...{ class: "refresh-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-sync-alt" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "items-grid" },
    });
    for (const [category] of __VLS_getVForSourceType((__VLS_ctx.filteredImageCategories))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (category.GroupId),
            ...{ class: "item-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "item-info" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (category.GroupName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (category.GroupCode);
        /** @type {[typeof ImageUploader, ]} */ ;
        // @ts-ignore
        const __VLS_0 = __VLS_asFunctionalComponent(ImageUploader, new ImageUploader({
            ...{ 'onUploadSuccess': {} },
            key: (`category-${category.GroupCode}`),
            currentImage: (__VLS_ctx.getGroupImage(category.GroupCode)),
            itemId: (category.GroupCode),
            itemType: "category",
        }));
        const __VLS_1 = __VLS_0({
            ...{ 'onUploadSuccess': {} },
            key: (`category-${category.GroupCode}`),
            currentImage: (__VLS_ctx.getGroupImage(category.GroupCode)),
            itemId: (category.GroupCode),
            itemType: "category",
        }, ...__VLS_functionalComponentArgsRest(__VLS_0));
        let __VLS_3;
        let __VLS_4;
        let __VLS_5;
        const __VLS_6 = {
            onUploadSuccess: (__VLS_ctx.handleUploadSuccess)
        };
        var __VLS_2;
    }
}
if (__VLS_ctx.activeTab === 'image-products') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "image-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "controls-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "search-filter" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "جستجوی کالا...",
        ...{ class: "search-input" },
    });
    (__VLS_ctx.imageProductSearch);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.emptyProductSearch) },
        ...{ class: "empty-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-trash-alt" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.selectedImageCategory),
        ...{ class: "category-select" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "",
    });
    for (const [cat] of __VLS_getVForSourceType((__VLS_ctx.categories))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (cat.GroupId),
            key: (cat.GroupId),
        });
        (cat.GroupName);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.fetchProducts) },
        ...{ class: "refresh-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-sync-alt" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "items-grid" },
    });
    for (const [product] of __VLS_getVForSourceType((__VLS_ctx.filteredImageProducts))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (product.GoodsId),
            ...{ class: "item-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "item-info" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (product.GoodsName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (product.GoodsCode);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (product.StockInventory);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (product.GoodsPrice.toLocaleString());
        /** @type {[typeof ImageUploader, ]} */ ;
        // @ts-ignore
        const __VLS_7 = __VLS_asFunctionalComponent(ImageUploader, new ImageUploader({
            ...{ 'onUploadSuccess': {} },
            key: (`product-${product.GoodsCode}`),
            currentImage: (__VLS_ctx.getGoodsImage(product.GoodsCode)),
            itemId: (product.GoodsCode),
            itemType: "product",
        }));
        const __VLS_8 = __VLS_7({
            ...{ 'onUploadSuccess': {} },
            key: (`product-${product.GoodsCode}`),
            currentImage: (__VLS_ctx.getGoodsImage(product.GoodsCode)),
            itemId: (product.GoodsCode),
            itemType: "product",
        }, ...__VLS_functionalComponentArgsRest(__VLS_7));
        let __VLS_10;
        let __VLS_11;
        let __VLS_12;
        const __VLS_13 = {
            onUploadSuccess: (__VLS_ctx.handleUploadSuccess)
        };
        var __VLS_9;
    }
}
if (__VLS_ctx.activeTab === 'manage-invoices') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "manage-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "controls-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "search-filter" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onChange: (__VLS_ctx.fetchInvoices) },
        value: (__VLS_ctx.fromDate),
        'data-jdp': true,
        'data-jdp-option-2': true,
        type: "text",
        placeholder: "از تاریخ",
        readonly: true,
        ...{ class: "search-input" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onChange: (__VLS_ctx.fetchInvoices) },
        value: (__VLS_ctx.toDate),
        'data-jdp': true,
        'data-jdp-option-2': true,
        type: "text",
        placeholder: "تا تاریخ",
        readonly: true,
        ...{ class: "search-input" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeTab === 'manage-invoices'))
                    return;
                __VLS_ctx.handleInputClick($event, 'searchinvoice');
            } },
        ...{ onFocus: (...[$event]) => {
                if (!(__VLS_ctx.activeTab === 'manage-invoices'))
                    return;
                __VLS_ctx.handleInputFocus('searchinvoice');
            } },
        placeholder: "جستجوی فاکتور...",
        ...{ class: "search-input" },
        ref: "searchinvoiceref",
    });
    (__VLS_ctx.invoiceSearch);
    /** @type {typeof __VLS_ctx.searchinvoiceref} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.fetchInvoices) },
        ...{ class: "refresh-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-sync-alt" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "invoice-table-container" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "invoice-table" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    for (const [column] of __VLS_getVForSourceType((__VLS_ctx.invoiceColumns))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            key: (column.key),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "column-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (column.title);
        if (column.filterable) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                ...{ onInput: (__VLS_ctx.applyInvoiceFilters) },
                placeholder: (`فیلتر ${column.title}`),
                ...{ class: "filter-input" },
            });
            (__VLS_ctx.invoiceFilters[column.key]);
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [invoice] of __VLS_getVForSourceType((__VLS_ctx.filteredInvoices))) {
        (invoice.SaleInvoiceId);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (invoice.SaleInvoiceId);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (invoice.SaleInvoiceNumberDay);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (invoice.OrderDate);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (invoice.OrderTime);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (invoice.CustomerName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.formatPrice(invoice.Price));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.formatPrice(invoice.Discount));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.formatPrice(invoice.Tax));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.formatPrice(invoice.Payable));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeTab === 'manage-invoices'))
                        return;
                    __VLS_ctx.toggleInvoiceDetails(invoice.SaleInvoiceId);
                } },
            ...{ class: "expand-btn" },
        });
        (__VLS_ctx.expandedInvoices.includes(invoice.SaleInvoiceId) ? '-' : '+');
        if (__VLS_ctx.expandedInvoices.includes(invoice.SaleInvoiceId)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                colspan: "9",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "invoice-details" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
            (invoice.SaleInvoiceId);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
                ...{ class: "items-table" },
            });
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
            for (const [item] of __VLS_getVForSourceType((__VLS_ctx.invoiceItems[invoice.SaleInvoiceId]))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                    key: (item.SaleInvoiceItemId),
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                (item.ProductCode);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                (item.ProductTitle);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                (__VLS_ctx.formatPrice(item.ProductPrice));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                (item.Quantity);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                (__VLS_ctx.formatPrice(item.ProductDiscount));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                (__VLS_ctx.formatPrice(item.ProductTax));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                (__VLS_ctx.formatPrice(item.TotalPrice));
            }
            if (__VLS_ctx.hasToppings(invoice.SaleInvoiceId)) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "toppings-section" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
                    ...{ class: "toppings-table" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
                for (const [topping] of __VLS_getVForSourceType((__VLS_ctx.getToppings(invoice.SaleInvoiceId)))) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                        key: (topping.SaleInvoiceItemToppingId),
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                    (topping.ToppingName);
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                    (topping.GoodsCount);
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                    (__VLS_ctx.formatPrice(topping.Price));
                }
            }
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tfoot, __VLS_intrinsicElements.tfoot)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
        colspan: "5",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    (__VLS_ctx.formatPrice(__VLS_ctx.totalInvoicePrice));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    (__VLS_ctx.formatPrice(__VLS_ctx.totalInvoiceDiscount));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    (__VLS_ctx.formatPrice(__VLS_ctx.totalInvoiceTax));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    (__VLS_ctx.formatPrice(__VLS_ctx.totalInvoicePayable));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
}
if (__VLS_ctx.activeTab == 'manage-customers') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "image-section" },
    });
    /** @type {[typeof CustomerManagement, ]} */ ;
    // @ts-ignore
    const __VLS_14 = __VLS_asFunctionalComponent(CustomerManagement, new CustomerManagement({}));
    const __VLS_15 = __VLS_14({}, ...__VLS_functionalComponentArgsRest(__VLS_14));
}
if (__VLS_ctx.showCategoryModalFlag) {
    /** @type {[typeof CategoryModal, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(CategoryModal, new CategoryModal({
        ...{ 'onSave': {} },
        ...{ 'onClose': {} },
        category: (__VLS_ctx.currentCategory),
        categories: (__VLS_ctx.categories),
    }));
    const __VLS_18 = __VLS_17({
        ...{ 'onSave': {} },
        ...{ 'onClose': {} },
        category: (__VLS_ctx.currentCategory),
        categories: (__VLS_ctx.categories),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    let __VLS_20;
    let __VLS_21;
    let __VLS_22;
    const __VLS_23 = {
        onSave: (__VLS_ctx.handleSaveCategory)
    };
    const __VLS_24 = {
        onClose: (__VLS_ctx.closeModals)
    };
    var __VLS_19;
}
if (__VLS_ctx.showProductModalFlag) {
    /** @type {[typeof ProductModal, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(ProductModal, new ProductModal({
        ...{ 'onSave': {} },
        ...{ 'onClose': {} },
        product: (__VLS_ctx.currentProduct),
        categories: (__VLS_ctx.categories),
        products: (__VLS_ctx.products),
    }));
    const __VLS_26 = __VLS_25({
        ...{ 'onSave': {} },
        ...{ 'onClose': {} },
        product: (__VLS_ctx.currentProduct),
        categories: (__VLS_ctx.categories),
        products: (__VLS_ctx.products),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    let __VLS_28;
    let __VLS_29;
    let __VLS_30;
    const __VLS_31 = {
        onSave: (__VLS_ctx.handleSaveProduct)
    };
    const __VLS_32 = {
        onClose: (__VLS_ctx.closeModals)
    };
    var __VLS_27;
}
if (__VLS_ctx.showToppingItemModalFlag) {
    /** @type {[typeof ToppingItemModal, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(ToppingItemModal, new ToppingItemModal({
        ...{ 'onSave': {} },
        ...{ 'onClose': {} },
        item: (__VLS_ctx.currentToppingItem),
        toppingItems: (__VLS_ctx.toppingItems),
    }));
    const __VLS_34 = __VLS_33({
        ...{ 'onSave': {} },
        ...{ 'onClose': {} },
        item: (__VLS_ctx.currentToppingItem),
        toppingItems: (__VLS_ctx.toppingItems),
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    let __VLS_36;
    let __VLS_37;
    let __VLS_38;
    const __VLS_39 = {
        onSave: (__VLS_ctx.handleSaveToppingItem)
    };
    const __VLS_40 = {
        onClose: (__VLS_ctx.closeModals)
    };
    var __VLS_35;
}
if (__VLS_ctx.showToppingLevelModalFlag) {
    /** @type {[typeof ToppingLevelModal, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(ToppingLevelModal, new ToppingLevelModal({
        ...{ 'onSave': {} },
        ...{ 'onClose': {} },
        level: (__VLS_ctx.currentToppingLevel),
    }));
    const __VLS_42 = __VLS_41({
        ...{ 'onSave': {} },
        ...{ 'onClose': {} },
        level: (__VLS_ctx.currentToppingLevel),
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    let __VLS_44;
    let __VLS_45;
    let __VLS_46;
    const __VLS_47 = {
        onSave: (__VLS_ctx.handleSaveToppingLevel)
    };
    const __VLS_48 = {
        onClose: (__VLS_ctx.closeModals)
    };
    var __VLS_43;
}
if (__VLS_ctx.showProductToppingModalFlag) {
    /** @type {[typeof ProductToppingModal, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(ProductToppingModal, new ProductToppingModal({
        ...{ 'onSave': {} },
        ...{ 'onClose': {} },
        topping: (__VLS_ctx.currentProductTopping),
        products: (__VLS_ctx.products),
        toppingItems: (__VLS_ctx.toppingItems),
        toppingLevels: (__VLS_ctx.toppingLevels),
    }));
    const __VLS_50 = __VLS_49({
        ...{ 'onSave': {} },
        ...{ 'onClose': {} },
        topping: (__VLS_ctx.currentProductTopping),
        products: (__VLS_ctx.products),
        toppingItems: (__VLS_ctx.toppingItems),
        toppingLevels: (__VLS_ctx.toppingLevels),
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    let __VLS_52;
    let __VLS_53;
    let __VLS_54;
    const __VLS_55 = {
        onSave: (__VLS_ctx.handleSaveProductTopping)
    };
    const __VLS_56 = {
        onClose: (__VLS_ctx.closeModals)
    };
    var __VLS_51;
}
if (__VLS_ctx.showKeyboard && __VLS_ctx.activeInputRef) {
    /** @type {[typeof VirtualKeyboard, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(VirtualKeyboard, new VirtualKeyboard({
        ...{ 'onKeyPress': {} },
        ...{ 'onHide': {} },
        inputRef: (__VLS_ctx.activeInputRef),
        isNumberMode: (__VLS_ctx.isNumberMode),
    }));
    const __VLS_58 = __VLS_57({
        ...{ 'onKeyPress': {} },
        ...{ 'onHide': {} },
        inputRef: (__VLS_ctx.activeInputRef),
        isNumberMode: (__VLS_ctx.isNumberMode),
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    let __VLS_60;
    let __VLS_61;
    let __VLS_62;
    const __VLS_63 = {
        onKeyPress: (__VLS_ctx.handleKeyPress)
    };
    const __VLS_64 = {
        onHide: (__VLS_ctx.hideKeyboard)
    };
    var __VLS_59;
}
/** @type {__VLS_StyleScopedClasses['admin-back-div']} */ ;
/** @type {__VLS_StyleScopedClasses['refresh-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-image-upload-container']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-header']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-content']} */ ;
/** @type {__VLS_StyleScopedClasses['tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-button']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-button']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-button']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-button']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-button']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-button']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-button']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-content']} */ ;
/** @type {__VLS_StyleScopedClasses['manage-section']} */ ;
/** @type {__VLS_StyleScopedClasses['controls-row']} */ ;
/** @type {__VLS_StyleScopedClasses['search-filter']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['add-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-plus']} */ ;
/** @type {__VLS_StyleScopedClasses['refresh-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-sync-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['items-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['item-card']} */ ;
/** @type {__VLS_StyleScopedClasses['item-info']} */ ;
/** @type {__VLS_StyleScopedClasses['item-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['edit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-edit']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-trash-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['manage-section']} */ ;
/** @type {__VLS_StyleScopedClasses['controls-row']} */ ;
/** @type {__VLS_StyleScopedClasses['search-filter']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['category-select']} */ ;
/** @type {__VLS_StyleScopedClasses['add-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-plus']} */ ;
/** @type {__VLS_StyleScopedClasses['refresh-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-sync-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['items-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['item-card']} */ ;
/** @type {__VLS_StyleScopedClasses['item-info']} */ ;
/** @type {__VLS_StyleScopedClasses['item-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['edit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-edit']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-trash-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['manage-section']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-tab-button']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-tab-button']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-tab-button']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-items-section']} */ ;
/** @type {__VLS_StyleScopedClasses['controls-row']} */ ;
/** @type {__VLS_StyleScopedClasses['search-filter']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['add-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-plus']} */ ;
/** @type {__VLS_StyleScopedClasses['refresh-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-sync-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['items-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['item-card']} */ ;
/** @type {__VLS_StyleScopedClasses['item-info']} */ ;
/** @type {__VLS_StyleScopedClasses['item-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['edit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-edit']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-trash-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-levels-section']} */ ;
/** @type {__VLS_StyleScopedClasses['controls-row']} */ ;
/** @type {__VLS_StyleScopedClasses['search-filter']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['add-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-plus']} */ ;
/** @type {__VLS_StyleScopedClasses['refresh-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-sync-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['items-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['item-card']} */ ;
/** @type {__VLS_StyleScopedClasses['item-info']} */ ;
/** @type {__VLS_StyleScopedClasses['item-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['edit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-edit']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-trash-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['product-toppings-section']} */ ;
/** @type {__VLS_StyleScopedClasses['controls-row']} */ ;
/** @type {__VLS_StyleScopedClasses['search-filter']} */ ;
/** @type {__VLS_StyleScopedClasses['product-select']} */ ;
/** @type {__VLS_StyleScopedClasses['level-select']} */ ;
/** @type {__VLS_StyleScopedClasses['add-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-plus']} */ ;
/** @type {__VLS_StyleScopedClasses['refresh-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-sync-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['items-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['item-card']} */ ;
/** @type {__VLS_StyleScopedClasses['item-info']} */ ;
/** @type {__VLS_StyleScopedClasses['item-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['edit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-edit']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-trash-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['image-section']} */ ;
/** @type {__VLS_StyleScopedClasses['search-filter']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-trash-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['refresh-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-sync-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['items-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['item-card']} */ ;
/** @type {__VLS_StyleScopedClasses['item-info']} */ ;
/** @type {__VLS_StyleScopedClasses['image-section']} */ ;
/** @type {__VLS_StyleScopedClasses['controls-row']} */ ;
/** @type {__VLS_StyleScopedClasses['search-filter']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-trash-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['category-select']} */ ;
/** @type {__VLS_StyleScopedClasses['refresh-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-sync-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['items-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['item-card']} */ ;
/** @type {__VLS_StyleScopedClasses['item-info']} */ ;
/** @type {__VLS_StyleScopedClasses['manage-section']} */ ;
/** @type {__VLS_StyleScopedClasses['controls-row']} */ ;
/** @type {__VLS_StyleScopedClasses['search-filter']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['refresh-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-sync-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['invoice-table-container']} */ ;
/** @type {__VLS_StyleScopedClasses['invoice-table']} */ ;
/** @type {__VLS_StyleScopedClasses['column-header']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-input']} */ ;
/** @type {__VLS_StyleScopedClasses['expand-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['invoice-details']} */ ;
/** @type {__VLS_StyleScopedClasses['items-table']} */ ;
/** @type {__VLS_StyleScopedClasses['toppings-section']} */ ;
/** @type {__VLS_StyleScopedClasses['toppings-table']} */ ;
/** @type {__VLS_StyleScopedClasses['image-section']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ImageUploader: ImageUploader,
            CategoryModal: CategoryModal,
            ProductModal: ProductModal,
            ToppingItemModal: ToppingItemModal,
            ToppingLevelModal: ToppingLevelModal,
            ProductToppingModal: ProductToppingModal,
            CustomerManagement: CustomerManagement,
            VirtualKeyboard: VirtualKeyboard,
            activeTab: activeTab,
            toppingSubTab: toppingSubTab,
            categories: categories,
            products: products,
            toppingItems: toppingItems,
            toppingLevels: toppingLevels,
            categorySearch: categorySearch,
            productSearch: productSearch,
            selectedProductCategory: selectedProductCategory,
            toppingItemSearch: toppingItemSearch,
            toppingLevelSearch: toppingLevelSearch,
            selectedProductForTopping: selectedProductForTopping,
            selectedLevelForTopping: selectedLevelForTopping,
            imageCategorySearch: imageCategorySearch,
            imageProductSearch: imageProductSearch,
            selectedImageCategory: selectedImageCategory,
            showCategoryModalFlag: showCategoryModalFlag,
            showProductModalFlag: showProductModalFlag,
            showToppingItemModalFlag: showToppingItemModalFlag,
            showToppingLevelModalFlag: showToppingLevelModalFlag,
            showProductToppingModalFlag: showProductToppingModalFlag,
            currentCategory: currentCategory,
            currentProduct: currentProduct,
            currentToppingItem: currentToppingItem,
            currentToppingLevel: currentToppingLevel,
            currentProductTopping: currentProductTopping,
            invoiceItems: invoiceItems,
            expandedInvoices: expandedInvoices,
            fromDate: fromDate,
            toDate: toDate,
            invoiceSearch: invoiceSearch,
            showKeyboard: showKeyboard,
            activeInputRef: activeInputRef,
            isNumberMode: isNumberMode,
            searchcategoryref: searchcategoryref,
            searchgoodsref: searchgoodsref,
            searchtopitemref: searchtopitemref,
            searchtoplevelref: searchtoplevelref,
            searchinvoiceref: searchinvoiceref,
            invoiceColumns: invoiceColumns,
            filteredCategories: filteredCategories,
            filteredProducts: filteredProducts,
            filteredToppingItems: filteredToppingItems,
            filteredToppingLevels: filteredToppingLevels,
            filteredProductToppings: filteredProductToppings,
            filteredImageCategories: filteredImageCategories,
            filteredImageProducts: filteredImageProducts,
            getCategoryName: getCategoryName,
            getToppingItemName: getToppingItemName,
            getLevelName: getLevelName,
            getItemName: getItemName,
            getGroupImage: getGroupImage,
            getGoodsImage: getGoodsImage,
            fetchCategories: fetchCategories,
            fetchProducts: fetchProducts,
            fetchToppingItems: fetchToppingItems,
            fetchToppingLevels: fetchToppingLevels,
            fetchProductToppings: fetchProductToppings,
            showCategoryModal: showCategoryModal,
            showProductModal: showProductModal,
            showToppingItemModal: showToppingItemModal,
            showToppingLevelModal: showToppingLevelModal,
            showProductToppingModal: showProductToppingModal,
            closeModals: closeModals,
            handleSaveCategory: handleSaveCategory,
            handleSaveProduct: handleSaveProduct,
            handleSaveToppingItem: handleSaveToppingItem,
            handleSaveToppingLevel: handleSaveToppingLevel,
            handleSaveProductTopping: handleSaveProductTopping,
            handleUploadSuccess: handleUploadSuccess,
            emptyCategorySearch: emptyCategorySearch,
            emptyProductSearch: emptyProductSearch,
            back: back,
            deleteItem: deleteItem,
            invoiceFilters: invoiceFilters,
            filteredInvoices: filteredInvoices,
            totalInvoicePrice: totalInvoicePrice,
            totalInvoiceDiscount: totalInvoiceDiscount,
            totalInvoiceTax: totalInvoiceTax,
            totalInvoicePayable: totalInvoicePayable,
            fetchInvoices: fetchInvoices,
            toggleInvoiceDetails: toggleInvoiceDetails,
            hasToppings: hasToppings,
            getToppings: getToppings,
            applyInvoiceFilters: applyInvoiceFilters,
            formatPrice: formatPrice,
            handleInputClick: handleInputClick,
            handleInputFocus: handleInputFocus,
            hideKeyboard: hideKeyboard,
            handleKeyPress: handleKeyPress,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
