import { ref, computed, onMounted, nextTick, watch, inject, toRaw } from 'vue';
import { getData, saveData, removeData } from '../services/storageService';
import { getCurrency, IsClubStat, OrderRegistrationStat, IsSalonOrderStat, IsTakeAwayOrderStat, GetIsCollapseCart, IsShowTables, IsShowDiscountCart, IsTableSelectionRequired, KeepSalonTableOpenAfterSubmit, ShowKioskOrderTypeSelector } from '../utilities';
import { sendToPOS, getCustomerData, sendInvoice, fetchCategories, fetchGoods, fetchToppingProducts, fetchToppings, fetchToppingLevels, fetchDiscountsCarts, useCustomerCredit, fetchCustomerCredit, checkStockLicense, checkStockGoods, fetchTables, fetchGoodsDiscounts } from '../services/apiService';
import { useToast } from 'vue-toastification';
import ScrollArrows from './ScrollArrows.vue';
import { useNow } from '@vueuse/core';
import Swal from 'sweetalert2';
const toast = useToast({
    position: 'top-right',
    style: {
        fontFamily: 'Vazirmatn-FD-Black'
    }
});
// داده‌های حالت
const groups = ref([]);
const goods = ref([]);
const tables = ref([]);
const goodsDiscounts = ref([]);
const loading = ref(true);
const selectedGroup = ref(null);
const isShowOrderRegisteration = ref(false);
const cartItems = ref([]);
const cartToppings = ref({});
const showToppingModal = ref(false);
const selectedGoods = ref(null);
const selectedToppings = ref([]);
const toppings = ref([]);
const toppingLevels = ref([]);
const toppingProducts = ref([]);
const CheckClub = ref(false);
const HamiClubUserData = ref();
const discount = ref(0);
const orderType = ref(null);
const isProcessing = ref(false);
const isCartCollapsed = ref(false);
const currencyUnit = ref(null);
const categoriesContainer = ref(null);
const goodsContainer = ref(null);
const checkIsSalon = ref(false);
const checkIsTakeAway = ref(false);
const CountOfConnections = ref(0);
const isShowTable = ref(false);
const selectedTableId = ref(0);
const tableSelectionRequired = ref(false);
const keepSalonTableOpenAfterSubmit = ref(false);
const showOrderTypeSelector = ref(false);
const orderTypeConfigError = ref(false);
const IsShowDiscountCartField = ref(false);
const HaveStockLicense = ref(false);
const goodsDiscountProducts = ref([]);
const goodsDiscountCustomers = ref([]);
const goodsDiscountTotal = computed(() => autoGoodsDiscount.value.amount); // تخفیف خودکار کالاها
// بخش اعتبار مشتریان
const customerCredit = ref(0);
const creditAmount = ref(0);
const paymentMethod = ref('pos');
const posAmount = ref(0);
// کیبورد
const showKeyboard = ref(false);
const showKeyboard2 = ref(false);
const showKeyboard3 = ref(false);
const showKeyboard4 = ref(false);
const showKeyboard5 = ref(false);
const phoneNumber = ref('');
const discountCart = ref('');
const selectedDiscountCard = ref(null);
const cartPanelRef = ref(null);
const emitter = inject('emitter');
// دریافت زمان حال
const now = useNow({ interval: 60000 });
// محاسبات
const currency = computed(() => currencyUnit.value ? "ریال" : "تومان");
const count = computed(() => cartItems.value?.length || 0);
const activeTables = computed(() => tables.value.filter(table => table && table.IsActive !== false));
const shouldUseTableSelection = computed(() => orderType.value === "2" &&
    (isShowTable.value || tableSelectionRequired.value || keepSalonTableOpenAfterSubmit.value));
const keepTableOpenForSubmit = computed(() => orderType.value === "2" && keepSalonTableOpenAfterSubmit.value);
const requiresTableSelection = computed(() => orderType.value === "2" &&
    (tableSelectionRequired.value || keepTableOpenForSubmit.value));
const canCheckout = computed(() => Boolean(orderType.value) &&
    !orderTypeConfigError.value &&
    !isProcessing.value &&
    (!requiresTableSelection.value || Number(selectedTableId.value) > 0));
const filteredGoods = computed(() => {
    const currentDay = now.value.getDay();
    const currentTime = now.value.getHours() * 100 + now.value.getMinutes();
    if (!selectedGroup.value) {
        return goods.value.filter(item => isItemAvailableNow(item, currentDay, currentTime) && item.IsActive);
    }
    return goods.value.filter(item => Number(item.GoodsGroupId) === Number(selectedGroup.value.GroupId) &&
        isItemAvailableNow(item, currentDay, currentTime) &&
        item.IsActive === true);
});
async function getCustomerCredit() {
    const phoneInput = document.getElementById('PhoneNumber');
    const phone = phoneInput.value.trim();
    if (!phone || !/^(\+98|0)?9\d{9}$/.test(phone)) {
        toast.error('شماره تلفن معتبر نیست');
        return;
    }
    const result = await fetchCustomerCredit(phone);
    if (result.status && result.Credit > 0) {
        customerCredit.value = result.Credit;
        creditAmount.value = Math.min(customerCredit.value, totalPrice.value);
        HamiClubUserData.value = { CustomerId: result.UID, UserPhone: phone };
        toast.success(`اعتبار شما: ${customerCredit.value}`);
    }
    else {
        toast.error(result.message || 'اعتبار صفر است');
    }
}
// توابع بررسی اعتبار مشتری
function updateCreditUsage() {
    if (!useCredit.value) {
        creditAmount.value = 0;
    }
    else {
        creditAmount.value = Math.min(customerCredit.value, totalPrice.value);
    }
    calculatePaymentSummary();
}
function updatePayment() {
    if (paymentMethod.value === 'full') {
        cashAmount.value = 0;
        posAmount.value = totalPrice.value - creditAmount.value;
    }
    calculatePaymentSummary();
}
function updatePartialPayment() {
    // بررسی که مبلغ اعتبار از اعتبار مشتری بیشتر نباشد
    if (creditAmount.value > customerCredit.value) {
        creditAmount.value = customerCredit.value;
        toast.error('مبلغ اعتبار نمی‌تواند بیشتر از اعتبار شما باشد');
    }
    if ((posAmount.value + creditAmount.value) > totalPrice.value) {
        posAmount.value = totalPrice.value - creditAmount.value;
    }
    // بررسی که مجموع مبالغ وارد شده از مبلغ کل فاکتور بیشتر نباشد
    const totalPaid = Number(cashAmount.value) + Number(posAmount.value) + Number(creditAmount.value);
    if (totalPaid > totalPrice.value) {
        // اگر مجموع بیشتر از مبلغ فاکتور بود، مبالغ را تنظیم کنید
        const remaining = totalPrice.value - (Number(cashAmount.value) + Number(posAmount.value));
        if (remaining >= 0) {
            creditAmount.value = Math.min(remaining, customerCredit.value);
        }
        else {
            // اگر مجموع نقدی و کارتخوان از مبلغ فاکتور بیشتر شد
            const excess = Math.abs(remaining);
            if (Number(cashAmount.value) >= excess) {
                cashAmount.value = Number(cashAmount.value) - excess;
            }
            else {
                const remainingExcess = excess - Number(cashAmount.value);
                cashAmount.value = 0;
                posAmount.value = Number(posAmount.value) - remainingExcess;
            }
            creditAmount.value = 0;
        }
        toast.error('مجموع مبالغ پرداختی نمی‌تواند بیشتر از مبلغ فاکتور باشد');
    }
    calculatePaymentSummary();
}
function calculatePaymentSummary() {
    const CashNum = Number(cashAmount.value);
    const Posnum = Number(posAmount.value);
    const CreditNum = Number(creditAmount.value);
    // بررسی مجدد که مبلغ اعتبار از اعتبار مشتری بیشتر نباشد
    if (CreditNum > customerCredit.value) {
        creditAmount.value = customerCredit.value;
        toast.error('مبلغ نمیتواند بیشتر از اعتبار شما باشد');
    }
    var totalPaid = CashNum + Posnum + CreditNum;
    remainingAmount.value = Math.max(0, totalPrice.value - totalPaid);
}
/////////////////////
const totalPrice = computed(() => {
    let basePrice = 0;
    let totalPacking = 0;
    let totalTaxValue = 0;
    cartItems.value.forEach(cartItem => {
        // محاسبه مبلغ پایه
        const itemBasePrice = cartItem.item.GoodsPrice * cartItem.quantity;
        // محاسبه مجموع قیمت تاپینگ‌ها
        const toppings = getToppingsForCartItem(cartItem.id);
        const toppingsPrice = toppings.reduce((sum, topping) => sum + (topping.Price || 0) * (topping.Count || 1), 0);
        // محاسبه تخفیف کالا
        const discountAmount = cartItem.goodsDiscount?.discountAmount || 0;
        // محاسبه مبلغ قابل مالیات
        const taxableAmount = (itemBasePrice + toppingsPrice) - discountAmount;
        // اگر مبلغ قابل مالیات منفی شد، صفر در نظر بگیرید
        if (taxableAmount > 0) {
            // محاسبه مالیات برای این آیتم
            const tax = taxableAmount * ((cartItem.item.TaxPercent + cartItem.item.DutyPercent) / 100);
            totalTaxValue += tax;
        }
        // محاسبه مبلغ نهایی آیتم (پایه + تاپینگ‌ها - تخفیف)
        basePrice += (itemBasePrice + toppingsPrice) - discountAmount;
        // هزینه بسته‌بندی
        if (orderType.value === "3" && cartItem.item.PackingPrice) {
            totalPacking += cartItem.item.PackingPrice * cartItem.quantity;
        }
    });
    // اعمال تخفیف باشگاه مشتریان
    const afterDiscount = basePrice + totalPacking - discount.value - goodsDiscountTotal.value;
    const finalAmount = afterDiscount + totalTaxValue;
    return finalAmount > 0 ? finalAmount : 0;
});
// محاسبه کل هزینه بسته‌بندی
const totalPackingPrice = computed(() => {
    if (orderType.value !== "3")
        return 0;
    return cartItems.value.reduce((total, cartItem) => {
        return total + (cartItem.item.PackingPrice || 0) * cartItem.quantity;
    }, 0);
});
const props = defineProps({
    connectionId: {
        type: Number,
        default: 0
    }
});
// توابع
onMounted(async () => {
    loading.value = true;
    isShowOrderRegisteration.value = OrderRegistrationStat();
    CheckClub.value = IsClubStat();
    currencyUnit.value = getCurrency();
    checkIsSalon.value = IsSalonOrderStat();
    checkIsTakeAway.value = IsTakeAwayOrderStat();
    isShowTable.value = IsShowTables();
    tableSelectionRequired.value = IsTableSelectionRequired();
    keepSalonTableOpenAfterSubmit.value = KeepSalonTableOpenAfterSubmit();
    showOrderTypeSelector.value = ShowKioskOrderTypeSelector();
    IsShowDiscountCartField.value = IsShowDiscountCart();
    HaveStockLicense.value = await checkStockLicense();
    setInitialOrderType();
    if (orderTypeConfigError.value) {
        toast.error('نوع سفارش را اصلاح کنید');
    }
    emitter.on('cart-updated', updateCart);
    updateCart();
    // بررسی بسته یا باز بودن سبد خرید به صورت پیش فرض
    isCartCollapsed.value = await GetIsCollapseCart();
    // بارگذاری اطلاعات کالاها و ...
    await loadData(props.connectionId);
    try {
        const [categoryData, goodsData, toppingData, levelData, productData, cartData, toppingsData, tableData, discountData, discountProductData, discountCustomerData] = await Promise.all([
            getData('category'),
            getData('goods'),
            getData('topping'),
            getData('toppinglevel'),
            getData('toppingproducts'),
            getData('cart'),
            getData('cartToppings'),
            getData('tables'),
            getData('discounts'),
            getData('discountProducts'),
            getData('discountCustomers')
        ]);
        groups.value = Array.isArray(categoryData) ? categoryData : categoryData?.GoodsGroup || [];
        goods.value = Array.isArray(goodsData) ? goodsData : Object.values(goodsData);
        toppings.value = toppingData || [];
        toppingLevels.value = levelData || [];
        toppingProducts.value = productData || [];
        cartItems.value = Array.isArray(cartData) ? cartData : [];
        cartToppings.value = toppingsData && typeof toppingsData === 'object' && !Array.isArray(toppingsData)
            ? JSON.parse(JSON.stringify(toppingsData))
            : {};
        tables.value = normalizeTables(tableData);
        goodsDiscounts.value = Array.isArray(discountData) ? discountData : [];
        goodsDiscountProducts.value = Array.isArray(discountProductData) ? discountProductData : [];
        goodsDiscountCustomers.value = Array.isArray(discountCustomerData) ? discountCustomerData : [];
    }
    catch (error) {
        console.error('خطا در دریافت داده:', error);
        toast.error('خطا در دریافت داده');
    }
    finally {
        loading.value = false;
    }
});
watch(orderType, (value) => {
    if (value !== "2") {
        selectedTableId.value = 0;
    }
});
async function updateCart() {
    await getData('cart').then(data => {
        cartItems.value = Array.isArray(data) ? data : [];
    });
}
function selectGroup(group) {
    // فقط کالاهای این گروه را فیلتر کن
    filteredGoods.value = goods.value.filter(item => Number(item.GoodsGroupId) === Number(group.GroupId));
    // برای هایلایت کردن گروه انتخاب شده
    selectedGroup.value = group;
    // اسکرول به بالای لیست کالاها
    scrollToGoodsTop();
}
function scrollToGoodsTop() {
    nextTick(() => {
        setTimeout(() => {
            const container = goodsContainer.value;
            if (container) {
                if (container.scrollHeight > container.clientHeight) {
                    container.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                }
                else {
                    // اگر محتوا کوتاه است، به پایین اسکرول نکنید
                }
            }
        }, 150);
    });
}
watch(selectedGroup, (newVal) => {
    if (newVal) {
        scrollToGoodsTop();
    }
});
function getGroupImage(groupId) {
    const version = new Date().toISOString().slice(0, 16).replace(/[^0-9]/g, "");
    if (props.connectionId == 0) {
        return `/img/groups/${groupId}.png?v=${version}`;
    }
    else {
        return `/img/groups_${props.connectionId}/${groupId}.png?v=${version}`;
    }
}
function getGoodsImage(goodsId) {
    const version = new Date().toISOString().slice(0, 16).replace(/[^0-9]/g, "");
    if (props.connectionId == 0) {
        return `/img/goods/${goodsId}.png?v=${version}`;
    }
    else {
        return `/img/goods_${props.connectionId}/${goodsId}.png?v=${version}`;
    }
}
function handleImageError(event) {
    event.target.src = event.target.className.includes('group')
        ? '/img/groups/default.png'
        : '/img/goods/default.png';
}
// توابع سبد خرید (همانند قبل)
async function addToCart(item) {
    if (hasToppings(item)) {
        showToppingsModal(item);
    }
    else {
        const existingItemIndex = cartItems.value.findIndex(cartItem => cartItem.item.GoodsId === item.GoodsId);
        if (existingItemIndex >= 0) {
            cartItems.value[existingItemIndex].quantity++;
            // اضافه کردن هایلایت موقت
            cartItems.value[existingItemIndex].highlight = true;
            setTimeout(() => {
                cartItems.value[existingItemIndex].highlight = false;
            }, 2000);
        }
        else {
            const newItem = {
                id: Date.now().toString(),
                item: JSON.parse(JSON.stringify(item)),
                quantity: 1,
                highlight: true // اضافه کردن پرچم هایلایت
            };
            cartItems.value.push(newItem);
            setTimeout(() => {
                newItem.highlight = false;
            }, 2000);
        }
        saveCart();
    }
    clearCustomerDiscountState();
}
async function removeFromCart(index) {
    const cartItem = cartItems.value[index];
    await removeToppingsFromCartItem(cartItem.id);
    cartItems.value.splice(index, 1);
    await saveCart();
}
// سایر توابع سبد خرید و تاپینگ‌ها همانند قبل
function toggleCartCollapse() {
    isCartCollapsed.value = !isCartCollapsed.value;
}
function resetCart() {
    cartItems.value = [];
    cartToppings.value = {};
    discount.value = 0;
    HamiClubUserData.value = null;
    selectedTableId.value = 0;
    selectedDiscountCard.value = null;
    discountCart.value = '';
    saveCart();
}
// مبلغ مالیات
const totalTax = computed(() => {
    return cartItems.value.reduce((total, cartItem) => {
        // محاسبه مبلغ پایه (قیمت کالا * تعداد)
        const itemBasePrice = cartItem.item.GoodsPrice * cartItem.quantity;
        // محاسبه مجموع قیمت تاپینگ‌ها
        const toppings = getToppingsForCartItem(cartItem.id);
        const toppingsPrice = toppings.reduce((sum, topping) => sum + (topping.Price || 0) * (topping.Count || 1), 0);
        // محاسبه مبلغ تخفیف (اعمال تخفیف کالا اگر وجود دارد)
        const discountAmount = cartItem.goodsDiscount?.discountAmount || 0;
        // محاسبه مبلغ قابل مالیات: (قیمت پایه + تاپینگ‌ها - تخفیف)
        const taxableAmount = (itemBasePrice + toppingsPrice) - discountAmount;
        // اگر مبلغ قابل مالیات منفی شد، صفر در نظر بگیرید
        if (taxableAmount <= 0)
            return total;
        // محاسبه مالیات (مالیات + عوارض)
        const taxes = taxableAmount * ((cartItem.item.TaxPercent + cartItem.item.DutyPercent) / 100);
        return total + taxes;
    }, 0);
});
async function increaseQuantity(index) {
    cartItems.value[index].quantity++;
    await saveCart();
    discount.value = 0;
    clearCustomerDiscountState();
}
async function decreaseQuantity(index) {
    if (cartItems.value[index].quantity > 1) {
        cartItems.value[index].quantity--;
        await saveCart();
    }
    else {
        await removeFromCart(index);
    }
    discount.value = 0;
    clearCustomerDiscountState();
}
// کم و زیاد کردن آیتم در قسمت نمایش آیتم ها
// کاهش تعداد کالا
function decreaseCartQuantity(item) {
    const existingIndex = cartItems.value.findIndex(cartItem => cartItem.item.GoodsId === item.GoodsId);
    if (existingIndex !== -1) {
        if (cartItems.value[existingIndex].quantity > 1) {
            cartItems.value[existingIndex].quantity--;
        }
        else {
            cartItems.value.splice(existingIndex, 1);
        }
        saveCart();
    }
    clearCustomerDiscountState();
    discount.value = 0;
}
// بررسی وجود کالا در سبد خرید
function isInCart(item) {
    return cartItems.value.some(cartItem => cartItem.item.GoodsId === item.GoodsId);
}
// دریافت تعداد کالا در سبد خرید
function getCartQuantity(item) {
    const cartItem = cartItems.value.find(cartItem => cartItem.item.GoodsId === item.GoodsId);
    return cartItem ? cartItem.quantity : 0;
}
async function saveCart() {
    try {
        // تبدیل ساختار تاپینگ‌ها قبل از ذخیره
        const normalizedCartToppings = {};
        for (const key in cartToppings.value) {
            normalizedCartToppings[key] = cartToppings.value[key].flat();
        }
        await Promise.all([
            saveData('cart', JSON.parse(JSON.stringify(cartItems.value))),
            saveData('cartToppings', JSON.parse(JSON.stringify(normalizedCartToppings)))
        ]);
    }
    catch (error) {
        console.error('خطا در ذخیره سبد خرید:', error);
    }
}
////////////////////////////////////////////////////////
// تابع برای تبدیل Proxyها به شیء ساده و حذف فیلدهای غیرضروری
function deepToRaw(obj) {
    if (!obj || typeof obj !== 'object')
        return obj;
    // اگر Proxy باشد، به raw تبدیل می‌کنیم
    const rawObj = toRaw(obj) || obj;
    // اگر آرایه باشد، تک‌تک آیتم‌ها را پردازش می‌کنیم
    if (Array.isArray(rawObj)) {
        return rawObj.map(item => deepToRaw(item));
    }
    // اگر شیء باشد، تمام فیلدها را پردازش می‌کنیم
    const result = {};
    for (const key in rawObj) {
        // فیلدهای غیرضروری را نادیده می‌گیریم (مثل applicableItems)
        if (key === 'applicableItems' || key === '_handler' || key === '_isReadonly')
            continue;
        // فیلدهای دیگر را پردازش می‌کنیم
        result[key] = deepToRaw(rawObj[key]);
    }
    return result;
}
// آماده‌سازی customerData
const prepareCustomerData = (data) => {
    if (!data)
        return null;
    return deepToRaw(data);
};
function normalizeTables(data) {
    if (Array.isArray(data))
        return data;
    if (!data || typeof data !== 'object')
        return [];
    return data.tables || data.Tables || data.diningTables || data.DiningTables || [];
}
function isTableOccupied(table) {
    return table?.IsOccupied === true && Number(table.TableId) !== Number(selectedTableId.value);
}
function tableOptionTitle(table) {
    const title = table.TableTitle || table.Title || `میز ${table.TableId}`;
    const code = table.TableCode ? ` (${table.TableCode})` : '';
    const group = table.GroupTitle ? ` - ${table.GroupTitle}` : '';
    const occupied = isTableOccupied(table) ? ' - اشغال' : '';
    return `${title}${code}${group}${occupied}`;
}
function configuredOrderType() {
    if (checkIsSalon.value === true && checkIsTakeAway.value === false)
        return "2";
    if (checkIsTakeAway.value === true && checkIsSalon.value === false)
        return "3";
    return null;
}
function setInitialOrderType() {
    orderTypeConfigError.value = false;
    const configuredType = configuredOrderType();
    if (showOrderTypeSelector.value) {
        orderType.value = configuredType;
        return;
    }
    if (!configuredType) {
        orderType.value = null;
        orderTypeConfigError.value = true;
        return;
    }
    orderType.value = configuredType;
}
async function checkout() {
    if (orderTypeConfigError.value) {
        toast.error('نوع سفارش را اصلاح کنید');
        return;
    }
    if (!orderType.value) {
        toast.error('لطفاً نوع سفارش را انتخاب کنید');
        return;
    }
    if (requiresTableSelection.value && Number(selectedTableId.value) <= 0) {
        toast.error('برای سفارش سالن باید میز را انتخاب کنید');
        return;
    }
    if (Number(selectedTableId.value) > 0) {
        const selected = activeTables.value.find(table => Number(table.TableId) === Number(selectedTableId.value));
        if (!selected) {
            toast.error('میز انتخاب شده در لیست میزهای فعال وجود ندارد');
            return;
        }
        if (isTableOccupied(selected)) {
            toast.error('میز انتخاب شده اشغال است');
            return;
        }
    }
    const overlay = document.getElementById('loader-overlay');
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    isProcessing.value = true;
    try {
        const payableAmount = Math.round(totalPrice.value);
        const taxAmount = Math.round(totalTax.value);
        const packingAmount = orderType.value === "3" ? Math.round(totalPackingPrice.value) : 0;
        const discountAmount = Math.round(totalDiscountApplied.value);
        const skipPaymentForTable = keepTableOpenForSubmit.value;
        let invoicePosAmount = 0;
        let invoiceCreditAmount = 0;
        // --- بررسی روش پرداخت ---
        if (skipPaymentForTable) {
            posAmount.value = 0;
            creditAmount.value = 0;
        }
        else if (paymentMethod.value === 'credit') {
            // بررسی شماره تلفن و اعتبار
            if (!HamiClubUserData.value?.UserPhone) {
                toast.error('ابتدا شماره تلفن خود را وارد کنید و اعتبار را بررسی کنید');
                return;
            }
            // محدود کردن مبلغ اعتبار
            if (creditAmount.value > customerCredit.value) {
                creditAmount.value = customerCredit.value;
            }
            if (creditAmount.value > payableAmount) {
                creditAmount.value = payableAmount;
            }
            // مبلغ باقی مانده برای کارت
            invoiceCreditAmount = Math.round(creditAmount.value);
            invoicePosAmount = Math.max(0, payableAmount - invoiceCreditAmount);
            posAmount.value = invoicePosAmount;
        }
        else if (paymentMethod.value === 'pos') {
            // کارت: کل مبلغ از کارت
            invoicePosAmount = payableAmount;
            posAmount.value = invoicePosAmount;
            creditAmount.value = 0; // هیچ اعتبار استفاده نمیشه
        }
        // --- بررسی موجودی کالاها ---
        if (HaveStockLicense.value?.status) {
            const stockCheckList = cartItems.value.map(item => ({
                GoodsId: item.item.GoodsId,
                Quantity: item.quantity
            }));
            const stockData = await checkStockGoods(stockCheckList);
            if (!stockData.status) {
                toast.error('خطا در بررسی موجودی کالاها');
                return;
            }
            const unavailable = stockData.data.filter(x => !x.HaveInventory);
            if (unavailable.length > 0) {
                unavailable.forEach(item => {
                    toast.error(`کالای "${item.GoodsName}" فقط ${item.CurrentStock} عدد موجود است`);
                });
                return;
            }
        }
        // --- پرداخت کارت ---
        if (!skipPaymentForTable && invoicePosAmount > 0) {
            const posDeviceAmount = currencyUnit.value === false ? invoicePosAmount * 10 : invoicePosAmount;
            const posResult = await sendToPOS(posDeviceAmount);
            if (!posResult.status || posResult.status !== 'ok') {
                toast.error(posResult.message || 'خطا در پرداخت کارت');
                return;
            }
        }
        // --- آماده‌سازی فاکتور ---
        const PayDet = {
            PosPrice: skipPaymentForTable ? 0 : invoicePosAmount,
            CashPrice: 0,
            CreditPrice: skipPaymentForTable ? 0 : invoiceCreditAmount
        };
        if (HamiClubUserData.value) {
            HamiClubUserData.value.totalDiscount = discountAmount;
            if (selectedDiscountCard.value) {
                HamiClubUserData.value.DiscountCardId = selectedDiscountCard.value.DiscountCardId;
                HamiClubUserData.value.DiscountCardNumber = selectedDiscountCard.value.CardNumber || discountCart.value;
                HamiClubUserData.value.DiscountCardUsedAmount = discountAmount;
            }
        }
        const SendInvoiceFinall = {
            customerData: prepareCustomerData(HamiClubUserData.value),
            items: deepToRaw(cartItems.value),
            toppings: deepToRaw(cartToppings.value),
            tax: taxAmount,
            packingFee: packingAmount,
            PayableAmount: payableAmount,
            CurrencyName: currency.value,
            InvoiceDiscount: discountAmount,
            saleinvoiceTypeId: Number(orderType.value),
            BranchId: props.connectionId,
            TableId: shouldUseTableSelection.value ? Number(selectedTableId.value || 0) : 1,
            KeepTableOpen: keepTableOpenForSubmit.value,
            SkipFinancialReceipt: skipPaymentForTable,
            IsSettled: !keepTableOpenForSubmit.value,
            PayDetails: PayDet
        };
        // --- ارسال فاکتور به سرور ---
        const invoiceResult = await sendInvoice(SendInvoiceFinall);
        if (!invoiceResult.status) {
            toast.error(invoiceResult.message || 'خطا در ثبت فاکتور');
            return;
        }
        // --- کسر اعتبار ---
        if (!skipPaymentForTable && paymentMethod.value === 'credit' && invoiceCreditAmount > 0) {
            const creditResult = await useCustomerCredit({
                SaleInvoiceId: invoiceResult.SID,
                CustomerPhone: HamiClubUserData.value.UserPhone,
                TotalDebt: invoiceCreditAmount,
                CreditAmount: invoiceCreditAmount
            });
            if (!creditResult.status) {
                toast.error(creditResult.message || 'خطا در استفاده از اعتبار');
                return;
            }
        }
        toast.success(`${skipPaymentForTable ? 'ثبت سفارش موفق،' : 'پرداخت موفق،'} ${invoiceResult.message}`);
        // --- ریست و برگشت ---
        resetCart();
        handleBack();
        setInitialOrderType();
    }
    catch (err) {
        console.error('خطا در checkout:', err);
        toast.error('خطا در پرداخت یا ثبت فاکتور');
    }
    finally {
        isProcessing.value = false;
        overlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}
// بررسی و اضافه کردن تاپینگ
// بررسی وجود تاپینگ برای کالا
function hasToppings(item) {
    return toppings.value.some(t => t.GoodsId === item.GoodsId);
}
// نمایش مودال تاپینگ‌ها
function showToppingsModal(item) {
    selectedGoods.value = item;
    selectedToppings.value = [];
    showToppingModal.value = true;
}
// اضافه/حذف تاپینگ
function toggleTopping(toppingProduct, level, action) {
    const existingIndex = selectedToppings.value.findIndex(t => t.ToppingProductId === toppingProduct.GoodsId);
    if (action === 'increase') {
        // بررسی محدودیت‌های سطح
        const levelToppings = selectedToppings.value.filter(t => t.LevelId === level.LevelId);
        if (levelToppings.length >= level.MaxCount && existingIndex === -1) {
            toast.error(`حداکثر ${level.MaxCount} آیتم برای این سطح مجاز است`);
            return;
        }
        // بررسی محدودیت‌های خود تاپینگ
        const currentCount = existingIndex !== -1
            ? selectedToppings.value[existingIndex].count
            : 0;
        if (currentCount >= toppingProduct.MaxCount) {
            toast.error(`حداکثر ${toppingProduct.MaxCount} عدد از این آیتم مجاز است`);
            return;
        }
        if (existingIndex >= 0) {
            selectedToppings.value[existingIndex].count++;
        }
        else {
            selectedToppings.value.push({
                ...toppingProduct,
                ToppingProductId: toppingProduct.GoodsId,
                ToppingId: toppingProduct.ToppingId,
                ToppingName: toppingProduct.GoodsName,
                GoodsTId: toppingProduct.GoodsSelectedId,
                LevelId: level.LevelId,
                LevelName: level.LevelTitle,
                count: 1
            });
        }
    }
    else if (action === 'decrease') {
        if (existingIndex >= 0) {
            if (selectedToppings.value[existingIndex].count > 1) {
                selectedToppings.value[existingIndex].count--;
            }
            else {
                selectedToppings.value.splice(existingIndex, 1);
            }
        }
    }
    else {
        // حالت کلیک ساده (toggle)
        if (existingIndex >= 0) {
            selectedToppings.value.splice(existingIndex, 1);
        }
        else {
            // بررسی محدودیت‌ها
            const levelToppings = selectedToppings.value.filter(t => t.LevelId === level.LevelId);
            if (levelToppings.length >= level.MaxCount) {
                toast.error(`حداکثر ${level.MaxCount} آیتم برای این سطح مجاز است`);
                return;
            }
            selectedToppings.value.push({
                ...toppingProduct,
                ToppingProductId: toppingProduct.GoodsId,
                ToppingId: toppingProduct.ToppingId,
                ToppingName: toppingProduct.GoodsName,
                GoodsTId: toppingProduct.GoodsId,
                LevelId: level.LevelId,
                LevelName: level.LevelTitle,
                count: 1
            });
        }
    }
}
// بررسی وجود تاپینگ در سبد خرید
function hasSameToppingsInCart(item, toppingsToCheck) {
    return cartItems.value.some(cartItem => {
        if (cartItem.item.GoodsId !== item.GoodsId)
            return false;
        const cartToppings = cartItem.toppings || [];
        if (cartToppings.length !== toppingsToCheck.length)
            return false;
        return cartToppings.every(ct => toppingsToCheck.some(st => st.ToppingProductId === ct.ToppingProductId));
    });
}
/* جدید */
// دریافت تاپینگ‌های یک آیتم سبد خرید
function getToppingsForCartItem(cartItemId) {
    if (!cartToppings.value || Array.isArray(cartToppings.value)) {
        cartToppings.value = {};
    }
    // تبدیل آرایه‌های تودرتو به آرایه ساده
    const toppings = cartToppings.value[cartItemId] || [];
    return Array.isArray(toppings[0]) ? toppings.flat() : toppings;
}
// اضافه کردن تاپینگ به یک آیتم سبد خرید
async function addToppingsToCartItem(cartItemId, toppings) {
    // ایجاد یک کپی جدید از شیء cartToppings
    const newCartToppings = {
        ...cartToppings.value,
        [cartItemId]: JSON.parse(JSON.stringify(toppings))
    };
    cartToppings.value = newCartToppings;
    await saveCart();
}
// حذف تاپینگ‌های یک آیتم سبد خرید
async function removeToppingsFromCartItem(cartItemId) {
    // تبدیل آرایه‌های تودرتو به آرایه ساده قبل از حذف
    const normalizedCartToppings = {};
    for (const key in cartToppings.value) {
        if (key !== cartItemId) {
            normalizedCartToppings[key] = cartToppings.value[key].flat();
        }
    }
    await saveData('cartToppings', normalizedCartToppings);
}
// اضافه کردن به سبد خرید با تاپینگ‌ها
async function addToCartWithToppings() {
    if (!selectedGoods.value)
        return;
    // دریافت لول‌های مربوط به این کالا
    const relevantLevels = getToppingLevels(selectedGoods.value);
    // بررسی فقط لول‌هایی که برای این کالا تاپینگ انتخاب شده
    const levelViolations = relevantLevels.filter(level => {
        // آیا برای این لول تاپینگ انتخاب شده؟
        const hasSelectedToppings = selectedToppings.value.some(t => t.LevelId === level.LevelId);
        // اگر تاپینگی انتخاب نشده و حداقل نیاز دارد
        if (!hasSelectedToppings && level.MinCount > 0) {
            return true;
        }
        // اگر تاپینگ انتخاب شده اما کمتر از حداقل است
        const levelToppings = selectedToppings.value.filter(t => t.LevelId === level.LevelId);
        if (hasSelectedToppings && levelToppings.length < level.MinCount) {
            return true;
        }
        return false;
    });
    if (levelViolations.length > 0) {
        const levelNames = levelViolations.map(l => l.LevelTitle).join('، ');
        toast.error(`لطفاً برای سطح‌های ${levelNames} حداقل ${levelViolations[0].MinCount} آیتم انتخاب کنید`);
        return;
    }
    const cartItemId = Date.now().toString();
    // تبدیل selectedToppings به فرمت مناسب برای ذخیره
    const toppingsToSave = selectedToppings.value.map(topping => ({
        ToppingProductId: topping.ToppingProductId,
        ToppingId: topping.ToppingId,
        GoodsName: topping.GoodsName,
        Price: topping.Price,
        LevelId: topping.LevelId,
        LevelName: topping.LevelName,
        Count: topping.count,
        GoodsId: topping.GoodsTId
    }));
    // بررسی وجود آیتم مشابه در سبد خرید
    const existingItemIndex = cartItems.value.findIndex(item => {
        if (item.item.GoodsId !== selectedGoods.value.GoodsId)
            return false;
        const itemToppings = getToppingsForCartItem(item.id);
        if (itemToppings.length !== toppingsToSave.length)
            return false;
        // مقایسه تاپینگ‌ها
        return itemToppings.every(t1 => toppingsToSave.some(t2 => t1.ToppingProductId === t2.ToppingProductId && t1.Count === t2.Count));
    });
    if (existingItemIndex >= 0) {
        cartItems.value[existingItemIndex].quantity++;
        // اضافه کردن هایلایت موقت
        cartItems.value[existingItemIndex].highlight = true;
        setTimeout(() => {
            cartItems.value[existingItemIndex].highlight = false;
        }, 2000);
    }
    else {
        const newItem = {
            id: cartItemId,
            item: JSON.parse(JSON.stringify(selectedGoods.value)),
            quantity: 1,
            highlight: true // اضافه کردن پرچم هایلایت
        };
        cartItems.value.push(newItem);
        setTimeout(() => {
            newItem.highlight = false;
        }, 2000);
        // فقط اگر تاپینگ وجود دارد ذخیره کنیم
        if (toppingsToSave.length > 0) {
            await addToppingsToCartItem(cartItemId, toppingsToSave);
        }
    }
    discount.value = 0;
    await saveCart();
    showToppingModal.value = false;
    selectedToppings.value = [];
}
// برای مودال
// دریافت سطوح تاپینگ برای کالا
function getToppingLevels(item) {
    if (!item || !toppings.value || !toppingLevels.value)
        return [];
    // دریافت لول‌های مرتبط با این کالا
    const goodsToppingLevels = [...new Set(toppings.value
            .filter(t => t.GoodsId === item.GoodsId)
            .map(t => t.LevelId))];
    return toppingLevels.value
        .filter(level => goodsToppingLevels.includes(level.LevelId))
        .sort((a, b) => a.Priority - b.Priority);
}
// دریافت محصولات تاپینگ برای سطح خاص
// در بخش توابع
function getToppingProducts(levelId, itemId) {
    if (!toppings.value || !toppingProducts.value)
        return [];
    // دریافت تمام تاپینگ‌های مربوط به این سطح
    const levelToppings = toppings.value.filter(t => t.LevelId === levelId && t.GoodsId === itemId);
    // ایجاد یک شیء برای گروه‌بندی تاپینگ‌ها بر اساس GoodsToppingId
    const groupedToppings = levelToppings.reduce((acc, topping) => {
        if (!acc[topping.GoodsToppingId]) {
            const product = toppingProducts.value.find(p => p.GoodsId === topping.GoodsToppingId);
            if (product) {
                acc[topping.GoodsToppingId] = {
                    ...product,
                    ToppingId: topping.ToppingId,
                    GoodsSelectedId: levelToppings.GoodsId,
                    MinCount: topping.MinCount,
                    MaxCount: topping.MaxCount,
                    Price: topping.Price,
                    count: 0 // مقدار پیش‌فرض برای تعداد انتخاب
                };
            }
        }
        return acc;
    }, {});
    return Object.values(groupedToppings);
}
// بررسی انتخاب بودن تاپینگ
function isToppingSelected(product) {
    return selectedToppings.value.some(t => t.ToppingProductId === product.GoodsId);
}
function getToppingCount(product) {
    const topping = selectedToppings.value.find(t => t.ToppingProductId === product.GoodsId);
    return topping ? topping.count : 0;
}
function isLocalDiscountActive(discountRow) {
    if (!discountRow || discountRow.IsActive === false || discountRow.CanUse === false)
        return false;
    const d = new Date();
    const today = convertPersianDigitsToEnglish(d.toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }));
    const startDate = discountRow.StartDate || discountRow.FromDate;
    const endDate = discountRow.EndDate || discountRow.ToDate || discountRow.ExpireDate;
    if ((startDate || endDate) && !isDateInRange(today, startDate, endDate))
        return false;
    const currentTime = d.getHours() * 100 + d.getMinutes();
    const fromTime = convertTimeToNumberDis(discountRow.StartTime || discountRow.FromTime);
    const toTime = convertTimeToNumberDis(discountRow.EndTime || discountRow.ToTime);
    if (fromTime && currentTime < fromTime)
        return false;
    if (toTime && currentTime > toTime)
        return false;
    return true;
}
function convertTimeToNumberDis(timeStr) {
    if (!timeStr)
        return 0;
    const cleaned = String(timeStr).replace(/\D/g, '');
    if (!cleaned)
        return 0;
    if (cleaned.length <= 2)
        return Number(cleaned) * 100;
    return Number(cleaned.slice(0, 2)) * 100 + Number(cleaned.slice(2, 4) || 0);
}
function discountIdOf(discountRow) {
    return Number(discountRow?.DiscountId ?? discountRow?.DiscountCodeId ?? discountRow?.GoodsDiscountId ?? 0);
}
function localDiscountProducts(discountRow) {
    const discountId = discountIdOf(discountRow);
    return Array.isArray(goodsDiscountProducts.value)
        ? goodsDiscountProducts.value.filter(dp => Number(dp.DiscountId) === discountId)
        : [];
}
function parseDiscountCustomerIds(value) {
    if (Array.isArray(value)) {
        return value.map(id => Number(id)).filter(id => Number.isFinite(id) && id > 0);
    }
    return String(value || '')
        .split(/[,،\n\r\t\s]+/)
        .map(id => Number(String(id).trim()))
        .filter(id => Number.isFinite(id) && id > 0);
}
function extractCustomerIdsFromDescription(description) {
    const text = String(description || '');
    const marker = '[CUSTOMER_DISCOUNT_IDS:';
    const start = text.toUpperCase().indexOf(marker);
    if (start < 0)
        return [];
    const valueStart = start + marker.length;
    const end = text.indexOf(']', valueStart);
    if (end < 0)
        return [];
    return parseDiscountCustomerIds(text.slice(valueStart, end));
}
function selectedKioskCustomerIds() {
    const customer = HamiClubUserData.value || {};
    const values = [
        customer.CustomerId,
        customer.UserId,
        customer.UID,
        customer.Id,
        customer.CustomerCode,
        customer.Code,
        customer.customerId,
        customer.userId,
        customer.uid,
        customer.id,
        customer.customerCode,
        selectedDiscountCard.value?.CustomerId,
        selectedDiscountCard.value?.UserId,
        selectedDiscountCard.value?.UID,
    ];
    return Array.from(new Set(values
        .map(value => Number(value))
        .filter(id => Number.isFinite(id) && id > 0)));
}
function localDiscountCustomerIds(discountRow) {
    const discountId = discountIdOf(discountRow);
    const directIds = [
        ...parseDiscountCustomerIds(discountRow?.CustomerIds),
        ...parseDiscountCustomerIds(discountRow?.customerIds),
        ...parseDiscountCustomerIds(discountRow?.CustomerIdsText),
        ...parseDiscountCustomerIds(discountRow?.CustomerId),
        ...parseDiscountCustomerIds(discountRow?.UserId),
        ...parseDiscountCustomerIds(discountRow?.UID),
        ...extractCustomerIdsFromDescription(discountRow?.Description)
    ];
    const relationIds = Array.isArray(goodsDiscountCustomers.value)
        ? goodsDiscountCustomers.value
            .filter(row => Number(row.DiscountId ?? row.DiscountCodeId ?? row.GoodsDiscountId) === discountId)
            .flatMap(row => parseDiscountCustomerIds(row.CustomerId ?? row.UserId ?? row.UID ?? row.CustomerCode))
        : [];
    const nestedIds = Array.isArray(discountRow?.DiscountCustomers)
        ? discountRow.DiscountCustomers.flatMap(row => parseDiscountCustomerIds(row.CustomerId ?? row.UserId ?? row.UID ?? row.CustomerCode))
        : [];
    return Array.from(new Set([...directIds, ...relationIds, ...nestedIds]));
}
function isLocalDiscountForSelectedCustomer(discountRow) {
    const customerIds = localDiscountCustomerIds(discountRow);
    if (customerIds.length === 0)
        return true;
    const selectedIds = selectedKioskCustomerIds();
    if (selectedIds.length === 0)
        return false;
    return selectedIds.some(id => customerIds.includes(id));
}
function isItemEligibleForLocalDiscount(cartItem, discountRow, products) {
    const useForAll = discountRow?.UseForAll === true || discountRow?.ApplyToAllGoods === true || products.length === 0;
    if (useForAll)
        return true;
    return products.some(dp => Number(dp.ProductCode ?? dp.GoodsId ?? dp.Goodsid) === Number(cartItem.item.GoodsId) ||
        String(dp.ProductCode ?? '') === String(cartItem.item.GoodsCode ?? ''));
}
function calculateLocalDiscountAmount(discountRow, amount) {
    const base = Number(amount || 0);
    if (base <= 0)
        return 0;
    const minBuy = Number(discountRow?.MinBuy ?? discountRow?.MinInvoiceAmount ?? 0);
    if (minBuy > 0 && base < minBuy)
        return 0;
    let value = 0;
    if (isPercentDiscountType(discountRow?.DiscountType)) {
        value = base * (normalizeDiscountValue(discountRow) / 100);
    }
    else {
        value = Math.min(normalizeDiscountValue(discountRow), base);
    }
    const maxDiscount = Number(discountRow?.DiscountMax ?? discountRow?.MaxDiscountAmount ?? 0);
    if (maxDiscount > 0)
        value = Math.min(value, maxDiscount);
    return Math.max(0, Math.round(value));
}
const autoGoodsDiscount = computed(() => {
    if (!Array.isArray(goodsDiscounts.value) || goodsDiscounts.value.length === 0 || cartItems.value.length === 0) {
        return { amount: 0, discount: null };
    }
    let best = { amount: 0, discount: null };
    for (const discountRow of goodsDiscounts.value) {
        if (!isLocalDiscountActive(discountRow))
            continue;
        if (!isLocalDiscountForSelectedCustomer(discountRow))
            continue;
        const products = localDiscountProducts(discountRow);
        const applicableItems = cartItems.value.filter(item => isItemEligibleForLocalDiscount(item, discountRow, products));
        if (!applicableItems.length)
            continue;
        const applicableBase = applicableItems.reduce((sum, item) => sum + lineBaseAmount(item), 0);
        const amount = calculateLocalDiscountAmount(discountRow, applicableBase);
        if (amount > best.amount)
            best = { amount, discount: discountRow };
    }
    return best;
});
//  اطلاعات بررسی و اعمال تخفیفات باشگاه مشتریان حامی //
const totalDiscountApplied = computed(() => {
    return Math.round(goodsDiscountTotal.value + discount.value);
});
function clearCustomerDiscountState() {
    discount.value = 0;
    selectedDiscountCard.value = null;
    discountCart.value = '';
    cartItems.value.forEach(item => {
        if (item.discount?.isCartDiscount || item.discount?.isCustomerDiscount) {
            delete item.discount;
        }
    });
    if (HamiClubUserData.value) {
        HamiClubUserData.value.usedDiscount = null;
        HamiClubUserData.value.totalDiscount = goodsDiscountTotal.value || 0;
        HamiClubUserData.value.DiscountCardId = 0;
        HamiClubUserData.value.DiscountCardNumber = '';
        HamiClubUserData.value.DiscountCardUsedAmount = 0;
    }
}
function lineBaseAmount(item) {
    const toppings = getToppingsForCartItem(item.id);
    const toppingsPrice = toppings.reduce((sum, topping) => sum + (topping.Price || 0) * (topping.Count || 1), 0);
    return ((item.item.GoodsPrice || 0) + toppingsPrice) * item.quantity;
}
function isPercentDiscountType(value) {
    return value === true || value === 1 || value === '1' || value === 'percent' || value === 'percentage';
}
function normalizeDiscountValue(discount) {
    return Number(discount?.DiscountValue ?? discount?.DiscountPercent ?? discount?.Percent ?? discount?.Price ?? discount?.DiscountAmount ?? 0);
}
function normalizeDiscountCardData(response) {
    const data = response?.data ?? response?.Data ?? response;
    if (!data || typeof data !== 'object')
        return null;
    return {
        ...data,
        DiscountCardId: Number(data.DiscountCardId ?? data.discountCardId ?? 0),
        CardNumber: String(data.CardNumber ?? data.cardNumber ?? discountCart.value ?? ''),
        Percent: Number(data.Percent ?? data.DiscountPercent ?? 0),
        Price: Number(data.Price ?? data.DiscountAmount ?? data.Balance ?? 0),
        MinBuy: Number(data.MinBuy ?? data.MinInvoiceAmount ?? 0),
        Goods: Array.isArray(data.Goods) ? data.Goods : [],
        IsActive: data.IsActive !== false
    };
}
function ensureCustomerDataForDiscount(extra = {}) {
    const current = HamiClubUserData.value || {};
    HamiClubUserData.value = {
        userName: current.userName || current.CustomerName || extra.CustomerName || 'مشتری تخفیف',
        UserPhone: current.UserPhone || current.CustomerPhone || extra.CustomerPhone || '',
        CustomerId: current.CustomerId || extra.CustomerId || 0,
        usedCredit: current.usedCredit || 0,
        usedDiscount: current.usedDiscount || null,
        totalDiscount: current.totalDiscount || 0,
        DiscountCardId: current.DiscountCardId || 0,
        DiscountCardNumber: current.DiscountCardNumber || '',
        DiscountCardUsedAmount: current.DiscountCardUsedAmount || 0,
        ...current,
        ...extra
    };
    return HamiClubUserData.value;
}
async function getHamiClubDetails() {
    try {
        // ریست کردن تخفیف‌های قبلی
        discount.value = 0;
        HamiClubUserData.value = null;
        const uPhone = document.getElementById('PhoneNumber');
        const phoneNumber = uPhone.value.trim();
        // اعتبارسنجی شماره تلفن
        if (!phoneNumber || !/^(\+98|0)?9\d{9}$/.test(phoneNumber)) {
            toast.error('لطفا شماره تماس معتبر وارد کنید (مثال: 09123456789)');
            return;
        }
        // استانداردسازی شماره تلفن
        const standardizedPhone = phoneNumber.startsWith('0') ? phoneNumber : `0${phoneNumber}`;
        // دریافت اطلاعات از API
        const resultHamiClub = await getCustomerData(standardizedPhone, props.connectionId);
        if (!resultHamiClub?.status) {
            toast.error(resultHamiClub?.message || 'خطا در دریافت اطلاعات از سرور');
            return;
        }
        const customerData = resultHamiClub.data.Result?.CustomerData;
        if (!customerData || customerData.CustomerId === 0) {
            HamiClubUserData.value = {
                userName: 'سایر',
                UserPhone: standardizedPhone
            };
            toast.error('اطلاعاتی برای این شماره یافت نشد');
            return;
        }
        // ذخیره اطلاعات پایه مشتری
        const userData = {
            userName: `${customerData.Firstname || ''} ${customerData.Lastname || ''}`.trim(),
            UserPhone: standardizedPhone,
            CustomerId: customerData.CustomerId,
            LevelTitle: customerData.LevelTitle,
            Point: customerData.Point,
            Credit: customerData.Credit,
            usedCredit: 0,
            usedDiscount: null,
            totalDiscount: 0
        };
        // اعمال اعتبار مشتری
        if (customerData.Credit > 0) {
            const creditAmount = Math.min(customerData.Credit, totalPrice.value);
            discount.value = creditAmount;
            userData.usedCredit = creditAmount;
            userData.totalDiscount = creditAmount;
            toast.success(`اعتبار شما به مبلغ ${creditAmount.toLocaleString()} ${currency.value} اعمال شد`);
            HamiClubUserData.value = userData;
            return;
        }
        // اعمال تخفیف‌های محصولات
        if (resultHamiClub.data.Result?.CustomerDiscountList?.length > 0) {
            const d = new Date();
            const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
            const s = d.toLocaleDateString('fa-IR', options);
            const today = convertPersianDigitsToEnglish(s);
            const validDiscounts = resultHamiClub.data.Result.CustomerDiscountList.filter(discount => {
                return (discount.IsActive &&
                    discount.CanUse &&
                    isDateInRange(today, discount.StartDate, discount.EndDate));
            });
            if (validDiscounts.length > 0) {
                const bestDiscount = findBestApplicableDiscount(validDiscounts, resultHamiClub.data.Result.CustomerDiscountProductsList || []);
                if (bestDiscount) {
                    const discountAmount = applyDiscountToCart(bestDiscount, resultHamiClub.data.Result.CustomerDiscountProductsList || []);
                    userData.totalDiscount = totalDiscountApplied.value;
                    userData.usedDiscount = bestDiscount;
                    if (discountAmount > 0) {
                        toast.success(`تخفیف ${bestDiscount.CodeTitle || ''} به مبلغ ${discountAmount.toLocaleString()} ${currency.value} اعمال شد`);
                    }
                    else {
                        toast.success('تخفیفی با توجه به اقلام شما یافت نشد');
                    }
                }
            }
            HamiClubUserData.value = userData;
            return;
        }
    }
    catch (error) {
        console.error('Error in getHamiClubDetails:', error);
        toast.error('خطایی در پردازش اطلاعات رخ داد');
    }
    finally {
        showKeyboard.value = false;
    }
}
function findBestApplicableDiscount(discounts, discountProducts) {
    const applicableDiscounts = discounts.map(discountRow => {
        const discountId = Number(discountRow?.DiscountId ?? discountRow?.DiscountCodeId ?? 0);
        const products = Array.isArray(discountProducts)
            ? discountProducts.filter(dp => Number(dp.DiscountId) === discountId)
            : [];
        const useForAll = discountRow?.UseForAll === true || discountRow?.ApplyToAllGoods === true || products.length === 0;
        let totalApplicablePrice = 0;
        const applicableItems = cartItems.value.filter(item => {
            const isApplicable = useForAll || products.some(p => Number(p.ProductCode ?? p.GoodsId ?? p.Goodsid) === Number(item.item.GoodsId) ||
                String(p.ProductCode ?? '') === String(item.item.GoodsCode ?? ''));
            if (isApplicable)
                totalApplicablePrice += lineBaseAmount(item);
            return isApplicable;
        });
        if (applicableItems.length === 0)
            return null;
        return {
            ...discountRow,
            applicableItems,
            totalApplicablePrice,
            discountValue: calculateDiscountValue(discountRow, totalApplicablePrice)
        };
    }).filter(Boolean);
    if (applicableDiscounts.length === 0)
        return null;
    return applicableDiscounts.reduce((best, current) => current.discountValue > best.discountValue ? current : best);
}
function calculateDiscountValue(discount, price) {
    const safePrice = Number(price || 0);
    if (!discount || safePrice <= 0)
        return 0;
    const minBuy = Number(discount.MinBuy ?? discount.MinInvoiceAmount ?? 0);
    if (minBuy > 0 && safePrice < minBuy)
        return 0;
    let amount = 0;
    if (isPercentDiscountType(discount.DiscountType)) {
        amount = safePrice * (normalizeDiscountValue(discount) / 100);
    }
    else {
        amount = Math.min(normalizeDiscountValue(discount), safePrice);
    }
    const maxDiscount = Number(discount.DiscountMax ?? discount.MaxDiscountAmount ?? 0);
    if (maxDiscount > 0)
        amount = Math.min(amount, maxDiscount);
    return Math.max(0, Math.round(amount));
}
function applyDiscountToCart(discountRow, discountProducts) {
    const discountId = Number(discountRow?.DiscountId ?? discountRow?.DiscountCodeId ?? 0);
    const applicableProducts = Array.isArray(discountProducts)
        ? discountProducts.filter(dp => Number(dp.DiscountId) === discountId)
        : [];
    const useForAll = discountRow?.UseForAll === true || discountRow?.ApplyToAllGoods === true || applicableProducts.length === 0;
    let totalApplicablePrice = 0;
    const applicableItems = cartItems.value.filter(item => {
        const isApplicable = useForAll || applicableProducts.some(dp => Number(dp.ProductCode ?? dp.GoodsId ?? dp.Goodsid) === Number(item.item.GoodsId) ||
            String(dp.ProductCode ?? '') === String(item.item.GoodsCode ?? ''));
        if (isApplicable)
            totalApplicablePrice += lineBaseAmount(item);
        return isApplicable;
    });
    if (applicableItems.length === 0 || totalApplicablePrice <= 0) {
        discount.value = 0;
        return 0;
    }
    const totalDiscountAmount = calculateDiscountValue(discountRow, totalApplicablePrice);
    applicableItems.forEach(item => {
        const itemBasePrice = lineBaseAmount(item);
        const itemDiscount = totalApplicablePrice > 0
            ? Math.round((itemBasePrice / totalApplicablePrice) * totalDiscountAmount)
            : 0;
        item.discount = {
            ...discountRow,
            discountValue: itemDiscount,
            originalPrice: itemBasePrice,
            finalPrice: Math.max(itemBasePrice - itemDiscount, 0),
            isCustomerDiscount: true
        };
    });
    discount.value = totalDiscountAmount;
    return totalDiscountAmount;
}
function convertPersianDigitsToEnglish(str) {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    return str.replace(/[۰-۹]/g, function (char) {
        const index = persianDigits.indexOf(char);
        return englishDigits[index];
    });
}
function persianToGregorian(persianDate) {
    if (!persianDate)
        return null;
    const [year, month, day] = persianDate.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return date;
}
function isDateInRange(date, startDate, endDate) {
    if (!date)
        return false;
    const current = new Date(date);
    const start = startDate ? persianToGregorian(startDate) : null;
    const end = endDate ? persianToGregorian(endDate) : null;
    return (!start || current >= start) && (!end || current <= end);
}
// انتهای اطلاعات بررسی و اعمال تخفیفات باشگاه مشتریان حامی //
//_______________________________//
function handleBack() {
    if (CountOfConnections.value > 1) {
        if (isShowOrderRegisteration) {
            emit('back');
        } // فقط اگر چند کانکشن داریم برگردیم
    }
    else {
        if (isShowOrderRegisteration) {
            emit('go-to-main');
        }
        // اگر یک کانکشن داریم یا در حالت scale هستیم، به صفحه اصلی برو    
    }
}
const emit = defineEmits(['back', 'go-to-main']);
// فیلتر زمانی نمایش کالاها
function isItemAvailableNow(item, currentDay, currentTime) {
    // تبدیل روزهای هفته به فرمت داده‌های شما
    const dayMap = {
        0: 'Sunday',
        1: 'Monday',
        2: 'Tuesday',
        3: 'Wednesday',
        4: 'Thursday',
        5: 'Friday',
        6: 'Saturday'
    };
    const currentDayName = dayMap[currentDay];
    // بررسی فعال بودن کالا در این روز
    if (!item[currentDayName])
        return false;
    // تبدیل زمان‌های شروع و پایان به فرمت عددی
    const fromTime = convertTimeToNumber(item[`FromTime${currentDayName}`]);
    const toTime = convertTimeToNumber(item[`ToTime${currentDayName}`]);
    // بررسی بازه زمانی
    return currentTime >= fromTime && currentTime <= toTime;
}
function convertTimeToNumber(timeStr) {
    if (!timeStr)
        return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 100 + minutes;
}
/// باکس سوالی برای برگشت و خالی کردن سبد خرید
function confirmResetCart() {
    Swal.fire({
        title: 'آیا مطمئن هستید؟',
        text: "آیا می‌خواهید تمام محتویات سبد خرید را پاک کنید؟",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'بله، پاک کن',
        cancelButtonText: 'انصراف',
        customClass: {
            confirmButton: 'swal-confirm-button',
            cancelButton: 'swal-cancel-button'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            resetCart();
            Swal.fire('پاک شد!', 'سبد خرید شما با موفقیت پاک شد.', 'success');
        }
    });
}
function confirmBack() {
    if (cartItems.value.length <= 0) {
        handleBack();
    }
    else {
        Swal.fire({
            title: 'آیا مطمئن هستید؟',
            text: "در صورت بازگشت سبد خرید خالی خواهد شد",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: '   بله   ',
            cancelButtonText: 'انصراف'
        }).then((result) => {
            if (result.isConfirmed) {
                resetCart();
                handleBack();
            }
        });
    }
}
// دریافت اطلاعات کالاها و دسته بندی ها
async function loadData(conId) {
    try {
        await Promise.all([
            removeData('category'),
            removeData('goods'),
            removeData('topping'),
            removeData('toppinglevel'),
            removeData('toppingproducts'),
            removeData('tables'),
            removeData('discounts'),
            removeData('discountProducts'),
            removeData('discountCustomers')
        ]);
        const [categories, goods, toppings, toppingLevels, toppingProducts, tables, discountsResponse] = await Promise.all([
            fetchCategories(conId).then(res => res.GoodsGroup || res),
            fetchGoods(conId).then(res => res.Goods || res),
            fetchToppings(conId).then(res => res.Goods || res),
            fetchToppingLevels(conId).then(res => res.ToppingLevel || res),
            fetchToppingProducts(conId).then(res => res.ToppingGoods || res),
            fetchTables(conId).then(res => normalizeTables(res)).catch(() => []),
            fetchGoodsDiscounts(conId).catch(() => ({ Discounts: [], DiscountProducts: [], CustomerDiscountProductsList: [], DiscountCustomers: [], CustomerDiscountCustomersList: [] }))
        ]);
        await Promise.all([
            saveData('category', categories),
            saveData('goods', goods),
            saveData('topping', toppings),
            saveData('toppinglevel', toppingLevels),
            saveData('toppingproducts', toppingProducts),
            saveData('tables', tables),
            saveData('discounts', Array.isArray(discountsResponse?.Discounts) ? discountsResponse.Discounts : []),
            saveData('discountProducts', Array.isArray(discountsResponse?.DiscountProducts) ? discountsResponse.DiscountProducts : (discountsResponse?.CustomerDiscountProductsList || [])),
            saveData('discountCustomers', Array.isArray(discountsResponse?.DiscountCustomers) ? discountsResponse.DiscountCustomers : (discountsResponse?.CustomerDiscountCustomersList || []))
        ]);
    }
    catch (error) {
        console.error("خطا در بارگذاری اطلاعات:", error);
    }
}
// تنظیمات کیبورد مجازی
const keyboardLayout = ref({
    'normal': [
        '1 2 3',
        '4 5 6',
        '7 8 9',
        '{enter} 0 {bksp}'
    ]
});
// توابع مدیریت کیبورد
const hideKeyboard = () => {
    showKeyboard.value = false;
};
const hideKeyboard2 = () => {
    showKeyboard2.value = false;
};
const hideKeyboard3 = () => {
    showKeyboard3.value = false;
};
const hideKeyboard4 = () => {
    showKeyboard4.value = false;
};
const hideKeyboard5 = () => {
    showKeyboard5.value = false;
};
const handleInputBlur = () => {
    // فقط اگر کیبورد نمایش داده نمی‌شود، آن را مخفی کنید
    if (!showKeyboard.value) {
        setTimeout(() => {
            showKeyboard.value = false;
        }, 200);
    }
};
const handleInputBlur2 = () => {
    // فقط اگر کیبورد نمایش داده نمی‌شود، آن را مخفی کنید
    if (!showKeyboard2.value) {
        setTimeout(() => {
            showKeyboard2.value = false;
        }, 200);
    }
};
const handleInputBlur3 = () => {
    // فقط اگر کیبورد نمایش داده نمی‌شود، آن را مخفی کنید
    if (!showKeyboard3.value) {
        setTimeout(() => {
            showKeyboard3.value = false;
        }, 200);
    }
};
const handleInputBlur4 = () => {
    // فقط اگر کیبورد نمایش داده نمی‌شود، آن را مخفی کنید
    if (!showKeyboard4.value) {
        setTimeout(() => {
            showKeyboard4.value = false;
        }, 200);
    }
};
const handleInputBlur5 = () => {
    // فقط اگر کیبورد نمایش داده نمی‌شود، آن را مخفی کنید
    if (!showKeyboard5.value) {
        setTimeout(() => {
            showKeyboard5.value = false;
        }, 200);
    }
};
const handleInputClick = () => {
    showKeyboard.value = true;
    showKeyboard2.value = false;
    showKeyboard3.value = false;
    showKeyboard4.value = false;
    showKeyboard5.value = false;
};
const handleInputClick2 = () => {
    showKeyboard2.value = true;
    showKeyboard.value = false;
    showKeyboard3.value = false;
    showKeyboard4.value = false;
    showKeyboard5.value = false;
};
const handleInputClick3 = () => {
    showKeyboard3.value = true;
    showKeyboard2.value = false;
    showKeyboard.value = false;
    showKeyboard4.value = false;
    showKeyboard5.value = false;
};
const handleInputClick4 = () => {
    showKeyboard4.value = true;
    showKeyboard2.value = false;
    showKeyboard3.value = false;
    showKeyboard.value = false;
    showKeyboard5.value = false;
};
const handleInputClick5 = () => {
    showKeyboard5.value = true;
    showKeyboard2.value = false;
    showKeyboard3.value = false;
    showKeyboard4.value = false;
    showKeyboard.value = false;
};
const handleInputFocus = () => {
    showKeyboard.value = true;
};
function handleKeyPress(key, event) {
    event.preventDefault(); // جلوگیری از رفتار پیش‌فرض
    event.stopPropagation(); // جلوگیری از انتشار رویداد
    const input = document.getElementById('PhoneNumber');
    if (key === '{bksp}') {
        input.value = input.value.slice(0, -1);
    }
    else if (key === '{enter}') {
        getCustomerCredit();
        showKeyboard.value = false;
        return;
    }
    else {
        if (input.value.length < 11) {
            input.value += key;
        }
    }
    // حفظ فوکوس روی فیلد ورودی
    if (input) {
        input.focus();
    }
}
function handleKeyPress2(key, event) {
    event.preventDefault();
    event.stopPropagation();
    if (key === '{bksp}') {
        discountCart.value = discountCart.value.slice(0, -1);
    }
    else if (key === '{enter}') {
        CheckDiscountCart();
    }
    else {
        if (discountCart.value.length < 30) {
            discountCart.value += key;
        }
    }
    // حفظ فوکوس روی فیلد ورودی
    const input = document.getElementById('discountCartField');
    if (input) {
        input.focus();
    }
}
////
function handleKeyPress3(key, event) {
    event.preventDefault();
    event.stopPropagation();
    if (key === '{bksp}') {
        // حذف آخرین کاراکتر از state
        cashAmount.value = Math.floor(cashAmount.value / 10);
    }
    else if (key === '{enter}') {
        showKeyboard3.value = false;
    }
    else {
        const num = Number(key);
        // اضافه کردن عدد جدید به state
        cashAmount.value = cashAmount.value * 10 + num;
    }
    updatePartialPayment();
}
function handleKeyPress4(key, event) {
    event.preventDefault();
    event.stopPropagation();
    if (key === '{bksp}') {
        // حذف آخرین کاراکتر از state
        posAmount.value = Math.floor(posAmount.value / 10);
    }
    else if (key === '{enter}') {
        showKeyboard4.value = false;
    }
    else {
        const num = Number(key);
        // اضافه کردن عدد جدید به state
        posAmount.value = posAmount.value * 10 + num;
    }
    updatePartialPayment();
}
function handleKeyPress5(key, event) {
    event.preventDefault();
    event.stopPropagation();
    if (key === '{bksp}') {
        // حذف آخرین کاراکتر از state
        creditAmount.value = Math.floor(creditAmount.value / 10);
    }
    else if (key === '{enter}') {
        showKeyboard5.value = false;
    }
    else {
        const num = Number(key);
        const newValue = creditAmount.value * 10 + num;
        // بررسی که مبلغ جدید از اعتبار مشتری بیشتر نباشد
        if (newValue <= customerCredit.value) {
            creditAmount.value = newValue;
        }
        else {
            // اگر بیشتر بود، مقدار را برابر با حداکثر اعتبار قرار دهید
            creditAmount.value = customerCredit.value;
            toast.error('مبلغ نمیتواند بیشتر از اعتبار شما باشد');
        }
    }
    updatePartialPayment();
}
/// بررسی کارت تخفیف حامی
async function CheckDiscountCart() {
    const discountCartValue = String(discountCart.value || document.getElementById('discountCartField')?.value || '').trim();
    if (discountCartValue.length < 1) {
        toast.error('لطفاً بارکد یا شماره کارت تخفیف را وارد نمائید.');
        return;
    }
    try {
        clearCustomerDiscountState();
        discountCart.value = discountCartValue;
        const ResultDiscountCart = await fetchDiscountsCarts(discountCartValue, props.connectionId);
        if (!ResultDiscountCart?.status) {
            toast.error(ResultDiscountCart?.message || 'خطا در دریافت اطلاعات از سرور');
            return;
        }
        const discountCartData = normalizeDiscountCardData(ResultDiscountCart);
        if (!discountCartData?.IsActive) {
            toast.error('کارت تخفیف مورد نظر یافت نشد یا فعال نیست');
            return;
        }
        const goodsRules = Array.isArray(discountCartData.Goods) ? discountCartData.Goods : [];
        const useForAllGoods = goodsRules.length === 0;
        let totalApplicablePrice = 0;
        const applicableCartItems = [];
        cartItems.value.forEach(item => {
            const isEligible = useForAllGoods || goodsRules.some(g => Number(g.Goodsid ?? g.GoodsId) === Number(item.item.GoodsId));
            if (isEligible) {
                applicableCartItems.push(item);
                totalApplicablePrice += lineBaseAmount(item);
            }
        });
        if (applicableCartItems.length === 0) {
            toast.error('هیچ یک از اقلام سبد خرید شامل تخفیف این کارت نمی‌شوند');
            return;
        }
        if (discountCartData.MinBuy > 0 && totalApplicablePrice < discountCartData.MinBuy) {
            toast.error(`حداقل مبلغ خرید برای استفاده از این کارت تخفیف ${discountCartData.MinBuy.toLocaleString()} ${currency.value} می‌باشد.`);
            return;
        }
        let totalDiscountAmount = 0;
        if (discountCartData.Percent > 0) {
            totalDiscountAmount = Math.round(totalApplicablePrice * (discountCartData.Percent / 100));
        }
        else if (discountCartData.Price > 0) {
            totalDiscountAmount = Math.min(discountCartData.Price, totalApplicablePrice);
        }
        else {
            toast.error('این کارت تخفیف معتبر نیست');
            return;
        }
        applicableCartItems.forEach(item => {
            const itemPrice = lineBaseAmount(item);
            const itemDiscount = totalApplicablePrice > 0
                ? Math.round((itemPrice / totalApplicablePrice) * totalDiscountAmount)
                : 0;
            item.discount = {
                discountId: discountCartData.DiscountCardId,
                discountPercent: discountCartData.Percent,
                discountAmount: itemDiscount,
                originalPrice: itemPrice,
                finalPrice: Math.max(itemPrice - itemDiscount, 0),
                isCartDiscount: true
            };
        });
        discount.value = Math.round(totalDiscountAmount);
        selectedDiscountCard.value = discountCartData;
        const customerData = ensureCustomerDataForDiscount({
            CustomerId: Number(discountCartData.CustomerId || 0),
            CustomerPhone: discountCartData.CustomerPhone || '',
            CustomerName: discountCartData.CustomerName || '',
            userName: discountCartData.CustomerName || 'مشتری کارت تخفیف',
            UserPhone: discountCartData.CustomerPhone || '',
            usedDiscount: {
                DiscountId: discountCartData.DiscountCardId,
                DiscountCardId: discountCartData.DiscountCardId,
                DiscountCart: discountCartValue,
                DiscountType: discountCartData.Percent > 0,
                DiscountValue: discountCartData.Percent > 0 ? discountCartData.Percent : discountCartData.Price,
                DiscountAmount: discount.value,
                IsCartDiscount: true
            },
            totalDiscount: totalDiscountApplied.value,
            DiscountCardId: discountCartData.DiscountCardId,
            DiscountCardNumber: discountCartValue,
            DiscountCardUsedAmount: discount.value
        });
        HamiClubUserData.value = customerData;
        await saveCart();
        toast.success(`تخفیف ${discount.value.toLocaleString()} ${currency.value} روی کالاهای مشمول اعمال شد`);
    }
    catch (error) {
        console.error('Error in CheckDiscountCart:', error);
        toast.error('خطایی در پردازش کارت تخفیف رخ داد');
    }
    finally {
        showKeyboard2.value = false;
        showKeyboard3.value = false;
        showKeyboard4.value = false;
        showKeyboard5.value = false;
        showKeyboard.value = false;
    }
}
function flyToCart(event) {
    const img = event?.currentTarget?.querySelector?.('img.goods-image');
    const cartEl = cartPanelRef.value;
    if (!img || !cartEl)
        return;
    const imgRect = img.getBoundingClientRect();
    const cartRect = cartEl.getBoundingClientRect();
    const clone = img.cloneNode(true);
    clone.classList.add('fly-clone');
    clone.style.left = imgRect.left + 'px';
    clone.style.top = imgRect.top + 'px';
    clone.style.width = imgRect.width + 'px';
    clone.style.height = imgRect.height + 'px';
    document.body.appendChild(clone);
    // مقصد: وسط سبد خرید (می‌تونی دقیق‌ترش کنی)
    const targetX = cartRect.left + cartRect.width * 0.15;
    const targetY = cartRect.top + cartRect.height * 0.35;
    requestAnimationFrame(() => {
        clone.style.transform = `translate(${targetX - imgRect.left}px, ${targetY - imgRect.top}px) scale(0.2)`;
        clone.style.opacity = '0.2';
    });
    clone.addEventListener('transitionend', () => clone.remove(), { once: true });
}
// wrapper: اول انیمیشن بعد addToCart اصلی شما
async function addToCartWithFly(event, item) {
    // اگر تاپینگ داشت، اول مودال (پرتاب نکنیم)
    if (hasToppings(item)) {
        showToppingsModal(item);
        return;
    }
    flyToCart(event);
    await addToCart(item);
}
/// فانکشن های کیبورد مجازی
// تنظیمات کیبورد مجازی
const hideKeyboardPager = () => {
    showKeyboard.value = false;
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "main-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "categories-panel" },
    ref: "categoriesContainer",
});
/** @type {typeof __VLS_ctx.categoriesContainer} */ ;
if (__VLS_ctx.categoriesContainer && !__VLS_ctx.loading && __VLS_ctx.groups.length) {
    /** @type {[typeof ScrollArrows, ]} */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(ScrollArrows, new ScrollArrows({
        containerRef: (__VLS_ctx.categoriesContainer),
        direction: "vertical",
    }));
    const __VLS_1 = __VLS_0({
        containerRef: (__VLS_ctx.categoriesContainer),
        direction: "vertical",
    }, ...__VLS_functionalComponentArgsRest(__VLS_0));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "categories-vertical" },
});
if (__VLS_ctx.loading) {
    for (const [i] of __VLS_getVForSourceType((10))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ('cat-skel-' + i),
            ...{ class: "category-item skeleton" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "category-image skeleton-box" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "category-name skeleton-line w-90" },
        });
    }
}
else {
    for (const [group] of __VLS_getVForSourceType((__VLS_ctx.groups))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    __VLS_ctx.selectGroup(group);
                } },
            key: (group.GroupId),
            ...{ class: "category-item" },
            ...{ class: ({ active: __VLS_ctx.selectedGroup?.GroupId === group.GroupId }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            ...{ onError: (__VLS_ctx.handleImageError) },
            src: (__VLS_ctx.getGroupImage(group.GroupCode)),
            ...{ class: "category-image" },
            alt: (group.GroupTitle),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "category-name" },
        });
        (group.GroupName);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cart-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cart-items-list" },
    });
    if (__VLS_ctx.count != 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "cart-total" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "cart-title" },
        });
        (__VLS_ctx.count);
        (__VLS_ctx.totalTax.toLocaleString());
        (__VLS_ctx.currency);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.br)({});
        if (__VLS_ctx.orderType === '3') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.totalPackingPrice.toLocaleString());
            (__VLS_ctx.currency);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.br)({});
        }
        (__VLS_ctx.totalDiscountApplied.toLocaleString());
        (__VLS_ctx.currency);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.br)({});
        (__VLS_ctx.totalPrice.toLocaleString());
        (__VLS_ctx.currency);
    }
    if (__VLS_ctx.count != 0 && __VLS_ctx.CheckClub) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "payment-method" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "radio",
            value: "pos",
        });
        (__VLS_ctx.paymentMethod);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "radio",
            value: "credit",
        });
        (__VLS_ctx.paymentMethod);
    }
    if (__VLS_ctx.paymentMethod === 'credit' && __VLS_ctx.count != 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "credit-box" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onFocus: (__VLS_ctx.handleInputFocus) },
            ...{ onBlur: (__VLS_ctx.handleInputBlur) },
            id: "PhoneNumber",
            type: "text",
            placeholder: "شماره تلفن",
            oninput: "\u0074\u0068\u0069\u0073\u002e\u0076\u0061\u006c\u0075\u0065\u0020\u003d\u0020\u0074\u0068\u0069\u0073\u002e\u0076\u0061\u006c\u0075\u0065\u002e\u0072\u0065\u0070\u006c\u0061\u0063\u0065\u0028\u002f\u005b\u005e\u0030\u002d\u0039\u002e\u005d\u002f\u0067\u002c\u0020\u0027\u0027\u0029\u002e\u0072\u0065\u0070\u006c\u0061\u0063\u0065\u0028\u002f\u0028\u005c\u002e\u002e\u002a\u0029\u005c\u002e\u002f\u0067\u002c\u0020\u0027\u0024\u0031\u0027\u0029\u003b",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.getCustomerCredit) },
        });
        if (__VLS_ctx.customerCredit > 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (__VLS_ctx.customerCredit.toLocaleString());
            (__VLS_ctx.currency);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "number",
                max: (Math.min(__VLS_ctx.customerCredit, __VLS_ctx.totalPrice)),
                placeholder: "مقدار استفاده از اعتبار",
            });
            (__VLS_ctx.creditAmount);
        }
    }
    if (__VLS_ctx.IsShowDiscountCartField && __VLS_ctx.count != 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "discount-card-box" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onFocus: (__VLS_ctx.handleInputClick2) },
            ...{ onBlur: (__VLS_ctx.handleInputBlur2) },
            id: "discountCartField",
            value: (__VLS_ctx.discountCart),
            type: "text",
            placeholder: "شماره/بارکد کارت تخفیف",
            oninput: "this.value = this.value.replace(/[^0-9A-Za-z؀-ۿ_-]/g, '');",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.CheckDiscountCart) },
        });
        if (__VLS_ctx.selectedDiscountCard) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.clearCustomerDiscountState) },
                ...{ class: "clear-discount-btn" },
            });
        }
        if (__VLS_ctx.selectedDiscountCard) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "discount-card-result" },
            });
            (__VLS_ctx.selectedDiscountCard.CardNumber || __VLS_ctx.selectedDiscountCard.DiscountCardId);
        }
    }
    if (__VLS_ctx.paymentMethod === 'pos' && __VLS_ctx.count != 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "hidden",
            max: (__VLS_ctx.totalPrice - __VLS_ctx.creditAmount),
            placeholder: "مبلغ کارت",
        });
        (__VLS_ctx.posAmount);
    }
    if (__VLS_ctx.orderTypeConfigError && __VLS_ctx.count != 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "kiosk-config-error" },
        });
    }
    if (__VLS_ctx.shouldUseTableSelection && __VLS_ctx.count != 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "table-selection kiosk-table-selection" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: "kiosk-table-select",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            id: "kiosk-table-select",
            ...{ class: "table-dropdown" },
            value: (__VLS_ctx.selectedTableId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (0),
        });
        for (const [table] of __VLS_getVForSourceType((__VLS_ctx.activeTables))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (table.TableId),
                value: (Number(table.TableId)),
                disabled: (__VLS_ctx.isTableOccupied(table)),
            });
            (__VLS_ctx.tableOptionTitle(table));
        }
        if (__VLS_ctx.requiresTableSelection) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        }
    }
    if (__VLS_ctx.showOrderTypeSelector && __VLS_ctx.count != 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "kiosk-order-type-selector" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "kiosk-option-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "kiosk-order-type-buttons" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!(__VLS_ctx.showOrderTypeSelector && __VLS_ctx.count != 0))
                        return;
                    __VLS_ctx.orderType = '2';
                } },
            type: "button",
            ...{ class: ({ active: __VLS_ctx.orderType === '2' }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!(__VLS_ctx.showOrderTypeSelector && __VLS_ctx.count != 0))
                        return;
                    __VLS_ctx.orderType = '3';
                } },
            type: "button",
            ...{ class: ({ active: __VLS_ctx.orderType === '3' }) },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cart-actions-fixed" },
    });
    if (__VLS_ctx.count != 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.checkout) },
            ...{ class: "checkout-btn" },
            disabled: (!__VLS_ctx.canCheckout),
        });
        (__VLS_ctx.keepTableOpenForSubmit ? 'ثبت سفارش' : 'پرداخت');
    }
    if (__VLS_ctx.count != 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.confirmResetCart) },
            ...{ class: "reset-cart-btn" },
        });
    }
    if ((__VLS_ctx.isShowOrderRegisteration || __VLS_ctx.CountOfConnections > 1)) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.confirmBack) },
            ...{ class: "back-button2" },
        });
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "goods-panel" },
    ref: "goodsContainer",
});
/** @type {typeof __VLS_ctx.goodsContainer} */ ;
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "goods-grid" },
    });
    for (const [i] of __VLS_getVForSourceType((12))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ('goods-skel-' + i),
            ...{ class: "goods-item skeleton" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "goods-image skeleton-box" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "skeleton-line w-70" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "skeleton-line w-90" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "skeleton-line w-40" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "skeleton-btn" },
        });
    }
}
else {
    const __VLS_3 = {}.TransitionGroup;
    /** @type {[typeof __VLS_components.TransitionGroup, typeof __VLS_components.transitionGroup, typeof __VLS_components.TransitionGroup, typeof __VLS_components.transitionGroup, ]} */ ;
    // @ts-ignore
    const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({
        name: "goods",
        tag: "div",
        ...{ class: "goods-grid" },
    }));
    const __VLS_5 = __VLS_4({
        name: "goods",
        tag: "div",
        ...{ class: "goods-grid" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_4));
    __VLS_6.slots.default;
    if (__VLS_ctx.filteredGoods.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: "empty",
            ...{ class: "empty-message" },
        });
    }
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.filteredGoods))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    __VLS_ctx.addToCartWithFly($event, item);
                } },
            key: (item.GoodsId),
            ...{ class: "goods-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            ...{ onError: (__VLS_ctx.handleImageError) },
            src: (__VLS_ctx.getGoodsImage(item.GoodsCode)),
            ...{ class: "goods-image" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (item.GoodsName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({});
        (item.GoodsDescription);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (item.GoodsPrice.toLocaleString());
        (__VLS_ctx.currency);
        if (__VLS_ctx.isInCart(item)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "quantity-control" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!(__VLS_ctx.isInCart(item)))
                            return;
                        __VLS_ctx.decreaseCartQuantity(item);
                    } },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.getCartQuantity(item));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!(__VLS_ctx.isInCart(item)))
                            return;
                        __VLS_ctx.addToCartWithFly($event, item);
                    } },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "add-btn" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!!(__VLS_ctx.isInCart(item)))
                            return;
                        __VLS_ctx.addToCartWithFly($event, item);
                    } },
                ...{ class: "add-to-cart-btn" },
            });
        }
    }
    var __VLS_6;
}
if (__VLS_ctx.goodsContainer && !__VLS_ctx.loading && __VLS_ctx.filteredGoods.length) {
    /** @type {[typeof ScrollArrows, ]} */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(ScrollArrows, new ScrollArrows({
        containerRef: (__VLS_ctx.goodsContainer),
        direction: "vertical",
    }));
    const __VLS_8 = __VLS_7({
        containerRef: (__VLS_ctx.goodsContainer),
        direction: "vertical",
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
    ...{ class: "cart-panel" },
    ref: "cartPanelRef",
});
/** @type {typeof __VLS_ctx.cartPanelRef} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cart-items-list" },
});
if (__VLS_ctx.count === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "empty-cart-centered" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cart-items" },
    });
    for (const [cartItem, index] of __VLS_getVForSourceType((__VLS_ctx.cartItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (cartItem.id),
            ...{ class: "cart-item-summary" },
            ...{ class: ({ highlight: cartItem.highlight }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            ...{ onError: (__VLS_ctx.handleImageError) },
            src: (__VLS_ctx.getGoodsImage(cartItem.item.GoodsCode)),
            ...{ class: "cart-item-image" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "cart-item-details" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "cart-item-name" },
        });
        (cartItem.item.GoodsName);
        if (__VLS_ctx.getToppingsForCartItem(cartItem.id).length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "cart-item-toppings" },
            });
            for (const [t] of __VLS_getVForSourceType((__VLS_ctx.getToppingsForCartItem(cartItem.id)))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    key: (`${cartItem.id}-${t.ToppingProductId}-${t.LevelId}`),
                    ...{ class: "topping-badge" },
                });
                ((t.Count || 1));
                (t.GoodsName);
            }
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "price-display" },
        });
        ((cartItem.item.GoodsPrice * cartItem.quantity).toLocaleString());
        (__VLS_ctx.currency);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "cart-item-quantity" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.count === 0))
                        return;
                    __VLS_ctx.decreaseQuantity(index);
                } },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (cartItem.quantity);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.count === 0))
                        return;
                    __VLS_ctx.increaseQuantity(index);
                } },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.count === 0))
                        return;
                    __VLS_ctx.removeFromCart(index);
                } },
            ...{ class: "remove-item" },
        });
    }
}
if (__VLS_ctx.showToppingModal) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-overlay" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "topping-modal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.selectedGoods?.GoodsName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showToppingModal))
                    return;
                __VLS_ctx.showToppingModal = false;
            } },
        ...{ class: "close-modal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-content-wrapper" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "topping-levels" },
    });
    for (const [level] of __VLS_getVForSourceType((__VLS_ctx.getToppingLevels(__VLS_ctx.selectedGoods)))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (level.LevelId),
            ...{ class: "topping-level" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        (level.LevelTitle);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (level.MinCount);
        (level.MaxCount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "topping-products" },
        });
        for (const [product] of __VLS_getVForSourceType((__VLS_ctx.getToppingProducts(level.LevelId, __VLS_ctx.selectedGoods.GoodsId)))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.showToppingModal))
                            return;
                        __VLS_ctx.toggleTopping(product, level);
                    } },
                key: (product.GoodsId),
                ...{ class: "topping-product" },
                ...{ class: ({ selected: __VLS_ctx.isToppingSelected(product) }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "topping-product-info" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "topping-product-name" },
            });
            (product.GoodsName);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "topping-product-price" },
            });
            (product.Price.toLocaleString());
            (__VLS_ctx.currency);
            if (__VLS_ctx.isToppingSelected(product)) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "topping-quantity-control" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.showToppingModal))
                                return;
                            if (!(__VLS_ctx.isToppingSelected(product)))
                                return;
                            __VLS_ctx.toggleTopping(product, level, 'decrease');
                        } },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "topping-quantity" },
                });
                (__VLS_ctx.getToppingCount(product));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.showToppingModal))
                                return;
                            if (!(__VLS_ctx.isToppingSelected(product)))
                                return;
                            __VLS_ctx.toggleTopping(product, level, 'increase');
                        } },
                });
            }
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "selected-toppings-footer" },
    });
    if (__VLS_ctx.selectedToppings.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "selected-toppings" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "selected-toppings-list" },
        });
        for (const [topping] of __VLS_getVForSourceType((__VLS_ctx.selectedToppings))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (topping.ToppingProductId),
                ...{ class: "selected-topping-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "selected-topping-quantity" },
            });
            (topping.count);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (topping.GoodsName);
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-footer" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showToppingModal))
                    return;
                __VLS_ctx.showToppingModal = false;
            } },
        ...{ class: "cancel-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.addToCartWithToppings) },
        ...{ class: "confirm-btn" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    id: "loader-overlay",
    ...{ style: {} },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "loader-pay" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "spinner-pay" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
if (__VLS_ctx.showKeyboard) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "simple-keyboard visible" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.hideKeyboardPager) },
        ...{ class: "keyboard-close-btn" },
    });
    for (const [row, i] of __VLS_getVForSourceType((__VLS_ctx.keyboardLayout.normal))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "keyboard-row" },
            key: (i),
        });
        for (const [key] of __VLS_getVForSourceType((row.split(' ')))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.showKeyboard))
                            return;
                        __VLS_ctx.handleKeyPress(key, $event);
                    } },
                key: (key),
                'data-action': (key === '{bksp}' ? 'bksp' : null || key === '{enter}' ? 'enter' : null),
            });
            (key === '{bksp}' ? '⌫' : key && key === '{enter}' ? 'ثبت' : key);
        }
    }
}
/** @type {__VLS_StyleScopedClasses['main-container']} */ ;
/** @type {__VLS_StyleScopedClasses['layout']} */ ;
/** @type {__VLS_StyleScopedClasses['categories-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['categories-vertical']} */ ;
/** @type {__VLS_StyleScopedClasses['category-item']} */ ;
/** @type {__VLS_StyleScopedClasses['skeleton']} */ ;
/** @type {__VLS_StyleScopedClasses['category-image']} */ ;
/** @type {__VLS_StyleScopedClasses['skeleton-box']} */ ;
/** @type {__VLS_StyleScopedClasses['category-name']} */ ;
/** @type {__VLS_StyleScopedClasses['skeleton-line']} */ ;
/** @type {__VLS_StyleScopedClasses['w-90']} */ ;
/** @type {__VLS_StyleScopedClasses['category-item']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['category-image']} */ ;
/** @type {__VLS_StyleScopedClasses['category-name']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-body']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-items-list']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-total']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-title']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-method']} */ ;
/** @type {__VLS_StyleScopedClasses['credit-box']} */ ;
/** @type {__VLS_StyleScopedClasses['discount-card-box']} */ ;
/** @type {__VLS_StyleScopedClasses['clear-discount-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['discount-card-result']} */ ;
/** @type {__VLS_StyleScopedClasses['kiosk-config-error']} */ ;
/** @type {__VLS_StyleScopedClasses['table-selection']} */ ;
/** @type {__VLS_StyleScopedClasses['kiosk-table-selection']} */ ;
/** @type {__VLS_StyleScopedClasses['table-dropdown']} */ ;
/** @type {__VLS_StyleScopedClasses['kiosk-order-type-selector']} */ ;
/** @type {__VLS_StyleScopedClasses['kiosk-option-title']} */ ;
/** @type {__VLS_StyleScopedClasses['kiosk-order-type-buttons']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-actions-fixed']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['reset-cart-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['back-button2']} */ ;
/** @type {__VLS_StyleScopedClasses['goods-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['goods-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['goods-item']} */ ;
/** @type {__VLS_StyleScopedClasses['skeleton']} */ ;
/** @type {__VLS_StyleScopedClasses['goods-image']} */ ;
/** @type {__VLS_StyleScopedClasses['skeleton-box']} */ ;
/** @type {__VLS_StyleScopedClasses['skeleton-line']} */ ;
/** @type {__VLS_StyleScopedClasses['w-70']} */ ;
/** @type {__VLS_StyleScopedClasses['skeleton-line']} */ ;
/** @type {__VLS_StyleScopedClasses['w-90']} */ ;
/** @type {__VLS_StyleScopedClasses['skeleton-line']} */ ;
/** @type {__VLS_StyleScopedClasses['w-40']} */ ;
/** @type {__VLS_StyleScopedClasses['skeleton-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['goods-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-message']} */ ;
/** @type {__VLS_StyleScopedClasses['goods-item']} */ ;
/** @type {__VLS_StyleScopedClasses['goods-image']} */ ;
/** @type {__VLS_StyleScopedClasses['quantity-control']} */ ;
/** @type {__VLS_StyleScopedClasses['add-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['add-to-cart-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-items-list']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-cart-centered']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-items']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-item-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['highlight']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-item-image']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-item-details']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-item-name']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-item-toppings']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['price-display']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-item-quantity']} */ ;
/** @type {__VLS_StyleScopedClasses['remove-item']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-header']} */ ;
/** @type {__VLS_StyleScopedClasses['close-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-content-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-levels']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-level']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-products']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-product']} */ ;
/** @type {__VLS_StyleScopedClasses['selected']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-product-info']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-product-name']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-product-price']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-quantity-control']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-quantity']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-toppings-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-toppings']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-toppings-list']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-topping-item']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-topping-quantity']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['cancel-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['confirm-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['loader-pay']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-pay']} */ ;
/** @type {__VLS_StyleScopedClasses['simple-keyboard']} */ ;
/** @type {__VLS_StyleScopedClasses['visible']} */ ;
/** @type {__VLS_StyleScopedClasses['keyboard-close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['keyboard-row']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            $props: __VLS_makeOptional(props),
            ...props,
            $emit: emit,
            ScrollArrows: ScrollArrows,
            groups: groups,
            loading: loading,
            selectedGroup: selectedGroup,
            isShowOrderRegisteration: isShowOrderRegisteration,
            cartItems: cartItems,
            showToppingModal: showToppingModal,
            selectedGoods: selectedGoods,
            selectedToppings: selectedToppings,
            CheckClub: CheckClub,
            orderType: orderType,
            categoriesContainer: categoriesContainer,
            goodsContainer: goodsContainer,
            CountOfConnections: CountOfConnections,
            selectedTableId: selectedTableId,
            showOrderTypeSelector: showOrderTypeSelector,
            orderTypeConfigError: orderTypeConfigError,
            IsShowDiscountCartField: IsShowDiscountCartField,
            customerCredit: customerCredit,
            creditAmount: creditAmount,
            paymentMethod: paymentMethod,
            posAmount: posAmount,
            showKeyboard: showKeyboard,
            discountCart: discountCart,
            selectedDiscountCard: selectedDiscountCard,
            cartPanelRef: cartPanelRef,
            currency: currency,
            count: count,
            activeTables: activeTables,
            shouldUseTableSelection: shouldUseTableSelection,
            keepTableOpenForSubmit: keepTableOpenForSubmit,
            requiresTableSelection: requiresTableSelection,
            canCheckout: canCheckout,
            filteredGoods: filteredGoods,
            getCustomerCredit: getCustomerCredit,
            totalPrice: totalPrice,
            totalPackingPrice: totalPackingPrice,
            selectGroup: selectGroup,
            getGroupImage: getGroupImage,
            getGoodsImage: getGoodsImage,
            handleImageError: handleImageError,
            removeFromCart: removeFromCart,
            totalTax: totalTax,
            increaseQuantity: increaseQuantity,
            decreaseQuantity: decreaseQuantity,
            decreaseCartQuantity: decreaseCartQuantity,
            isInCart: isInCart,
            getCartQuantity: getCartQuantity,
            isTableOccupied: isTableOccupied,
            tableOptionTitle: tableOptionTitle,
            checkout: checkout,
            toggleTopping: toggleTopping,
            getToppingsForCartItem: getToppingsForCartItem,
            addToCartWithToppings: addToCartWithToppings,
            getToppingLevels: getToppingLevels,
            getToppingProducts: getToppingProducts,
            isToppingSelected: isToppingSelected,
            getToppingCount: getToppingCount,
            totalDiscountApplied: totalDiscountApplied,
            clearCustomerDiscountState: clearCustomerDiscountState,
            confirmResetCart: confirmResetCart,
            confirmBack: confirmBack,
            keyboardLayout: keyboardLayout,
            handleInputBlur: handleInputBlur,
            handleInputBlur2: handleInputBlur2,
            handleInputClick2: handleInputClick2,
            handleInputFocus: handleInputFocus,
            handleKeyPress: handleKeyPress,
            CheckDiscountCart: CheckDiscountCart,
            addToCartWithFly: addToCartWithFly,
            hideKeyboardPager: hideKeyboardPager,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {
            $props: __VLS_makeOptional(props),
            ...props,
            $emit: emit,
        };
    },
});
; /* PartiallyEnd: #4569/main.vue */
