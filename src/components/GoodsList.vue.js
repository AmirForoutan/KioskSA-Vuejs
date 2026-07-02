import { ref, computed, onMounted, inject, watch } from 'vue';
import { getData, saveData } from '../services/storageService';
import { getCurrency, IsClubStat, IsSalonOrderStat, IsTakeAwayOrderStat } from '../utilities';
import { sendToPOS, getCustomerData, sendInvoice } from '../services/apiService';
import { useToast } from 'vue-toastification';
import Swal from 'sweetalert2';
const cart = inject('cart');
const orderType = ref(null); // 2 برای همینجا میخورم، 3 برای با خودم میبرم
const isProcessing = ref(false); // برای غیرفعال کردن دکمه‌ها هنگام پردازش
//بررسی ارز مالی
const currencyUnit = ref(null);
const curreny = computed(() => {
    return currencyUnit.value ? "ریال" : "تومان";
});
const props = defineProps({
    group: {
        type: Object,
        required: true
    },
    connectionId: {
        type: Number,
        default: 0
    }
});
const emit = defineEmits(['go-back']);
const goods = ref([]);
const loading = ref(false);
const cartItems = ref(cart?.value?.items || []);
const showCart = ref(false);
const getCartItem = ref([]);
const cartInitialized = ref(false);
const showToppingModal = ref(false);
const selectedGoods = ref(null);
const toppings = ref([]);
const toppingLevels = ref([]);
const toppingProducts = ref([]);
const selectedToppings = ref([]);
const cartToppings = ref({});
const CheckHamiClub = ref(false);
const HamiClubUserData = ref();
const discount = ref(0);
const checkIsSalon = ref(false);
const checkIsTakeAway = ref(false);
const toast = useToast();
// دریافت کالاها
onMounted(async () => {
    loading.value = true;
    currencyUnit.value = await getCurrency();
    CheckHamiClub.value = await IsClubStat();
    checkIsSalon.value = await IsSalonOrderStat();
    checkIsTakeAway.value = await IsTakeAwayOrderStat();
    if (checkIsSalon) {
        orderType.value = "2";
    }
    if (checkIsTakeAway) {
        orderType.value = "3";
    }
    try {
        // دریافت اطلاعات کالاها و تاپینگ‌ها
        const [toppingData, levelData, productData, allGoods, cartData, toppingsData] = await Promise.all([
            getData('topping'),
            getData('toppinglevel'),
            getData('toppingproducts'),
            getData('goods'),
            getData('cart'),
            getData('cartToppings')
        ]);
        // اضافه کردن watcher برای تغییرات سبد خرید
        watch(() => cart?.value?.items, (newItems) => {
            cartItems.value = newItems || [];
        }, { deep: true });
        toppings.value = toppingData || [];
        toppingLevels.value = levelData || [];
        toppingProducts.value = productData || [];
        cartToppings.value = (toppingsData && typeof toppingsData === 'object' && !Array.isArray(toppingsData))
            ? JSON.parse(JSON.stringify(toppingsData))
            : {};
        loading.value = true;
        // اعتبارسنجی داده‌ها
        if (!allGoods) {
            console.error('داده‌ای برای کالاها یافت نشد');
            goods.value = [];
            return;
        }
        // تبدیل به آرایه اگر object است
        let goodsArray = Array.isArray(allGoods) ? allGoods : Object.values(allGoods);
        cartItems.value = Array.isArray(cartData) ? cartData : [];
        // فیلتر کردن کالاها
        goods.value = goodsArray.filter(item => {
            if (!item || typeof item !== 'object')
                return false;
            return Number(item.GoodsGroupId) === Number(props.group.GroupId);
        });
    }
    catch (error) {
        console.error('خطا در دریافت کالاها و تاپینگ ها:', error);
        goods.value = [];
        cartItems.value = [];
    }
    finally {
        loading.value = false;
        cartInitialized.value = true;
    }
});
// دریافت سبد خرید
const checkCart = computed(() => {
    cartItems.value = getCartItem.value;
});
//دریافت تعداد کالاهای سبد خرید
const count = computed(() => {
    if (!cartInitialized.value)
        return '...';
    return cartItems.value?.length || 0;
});
// محاسبات
const filteredGoods = computed(() => {
    if (loading.value)
        return []; // در حال لودینگ
    return goods.value;
});
//مبلغ قابل پرداخت
const totalPrice = computed(() => {
    return cartItems.value.reduce((total, cartItem) => {
        const toppings = getToppingsForCartItem(cartItem.id);
        const toppingsPrice = toppings.reduce((sum, topping) => sum + (topping.Price || 0), 0);
        const itemTotal = (cartItem.item.GoodsPrice + toppingsPrice) * cartItem.quantity;
        const taxes = itemTotal * ((cartItem.item.TaxPercent + cartItem.item.DutyPercent) / 100);
        return total + itemTotal + taxes;
    }, 0);
});
// مبلغ مالیات
const totalTax = computed(() => {
    return cartItems.value.reduce((total, cartItem) => {
        const toppings = getToppingsForCartItem(cartItem.id);
        const toppingsPrice = toppings.reduce((sum, topping) => sum + (topping.Price || 0), 0);
        const itemTotal = (cartItem.item.GoodsPrice + toppingsPrice) * cartItem.quantity;
        const taxes = itemTotal * ((cartItem.item.TaxPercent + cartItem.item.DutyPercent) / 100);
        return total + taxes;
    }, 0);
});
// توابع سبد خرید
function addToCart(item) {
    if (hasToppings(item)) {
        showToppingsModal(item);
    }
    else {
        // بررسی وجود آیتم در سبد خرید
        const existingItemIndex = cartItems.value.findIndex(cartItem => cartItem.item.GoodsId === item.GoodsId);
        if (existingItemIndex >= 0) {
            // اگر آیتم وجود دارد، تعداد را افزایش می‌دهیم
            cartItems.value[existingItemIndex].quantity++;
        }
        else {
            // اگر آیتم وجود ندارد، جدید اضافه می‌کنیم
            cartItems.value.push({
                id: Date.now().toString(), // یک ID منحصر به فرد ایجاد می‌کنیم
                item: JSON.parse(JSON.stringify(item)),
                quantity: 1
            });
        }
        // ذخیره تغییرات در localStorage
        saveCart();
    }
}
async function removeFromCart(index) {
    const cartItem = cartItems.value[index];
    await removeToppingsFromCartItem(cartItem.id);
    cartItems.value.splice(index, 1);
    await saveCart();
}
async function increaseQuantity(index) {
    cartItems.value[index].quantity++;
    await saveCart();
}
async function decreaseQuantity(index) {
    if (cartItems.value[index].quantity > 1) {
        cartItems.value[index].quantity--;
        await saveCart();
    }
    else {
        await removeFromCart(index);
    }
}
//بررسی وجود آیتم مشابه در سبد خرید
function hasSameItemInCart(item, toppingsToCheck) {
    return cartItems.value.some(cartItem => {
        if (cartItem.item.GoodsId !== item.GoodsId)
            return false;
        const cartItemToppings = getToppingsForCartItem(cartItem.id);
        if (cartItemToppings.length !== toppingsToCheck.length)
            return false;
        return cartItemToppings.every(ct => toppingsToCheck.some(st => st.ToppingProductId === ct.ToppingProductId));
    });
}
// کم و زیاد کردن آیتم در قسمت نمایش آیتم ها
// افزایش تعداد کالا
function increaseCartQuantity(item) {
    const existingItem = cartItems.value.find(cartItem => cartItem.item.GoodsId === item.GoodsId);
    if (existingItem) {
        existingItem.quantity++;
    }
    else {
        cartItems.value.push({
            item,
            quantity: 1
        });
    }
    saveCart();
}
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
        // به‌روزرسانی state مرکزی
        if (cart) {
            cart.value = {
                items: [...cartItems.value],
                toppings: { ...normalizedCartToppings }
            };
        }
    }
    catch (error) {
        console.error('خطا در ذخیره سبد خرید:', error);
    }
}
function toggleCart() {
    showCart.value = !showCart.value;
}
async function checkout() {
    if (!orderType.value) {
        toast.error('لطفاً نوع سفارش را انتخاب کنید');
        return;
    }
    isProcessing.value = true;
    const overlay = document.getElementById('loader-overlay');
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    const payablePrice = currencyUnit.value ? totalPrice.value : totalPrice.value * 10;
    if (payablePrice < 0) {
        toast.error('مبلغ قابل پرداخت نامعتبر است');
        isProcessing.value = false;
        overlay.style.display = 'none';
        document.body.style.overflow = 'auto';
        return;
    }
    /// Check Invoice If be 0 Just Print It and dont send it to POS
    else if (payablePrice === 0) {
        const SendInvoiceFinall = {
            customerData: HamiClubUserData.value ?? null,
            items: cartItems.value,
            toppings: cartToppings.value,
            tax: totalTax.value,
            packingFee: orderType.value === "3" ? totalPackingPrice.value : 0, // اضافه کردن این خط
            PayableAmount: totalPrice.value,
            CurrencyName: curreny.value,
            InvoiceDiscount: discount.value,
            saleinvoiceTypeId: orderType.value,
            BranchId: props.connectionId
        };
        const checkResult = await sendInvoice(SendInvoiceFinall);
        toast.success('پرداخت موفق، ' + checkResult.message);
        // ریست فرم
        handleBack();
        resetCart();
        emit('go-back');
        return;
    }
    try {
        const checkPay = await sendToPOS(payablePrice);
        if (checkPay.status == "ok") {
            const SendInvoiceFinall = {
                customerData: HamiClubUserData.value ?? null,
                items: cartItems.value,
                toppings: cartToppings.value,
                tax: totalTax.value,
                packingFee: orderType.value === "3" ? totalPackingPrice.value : 0, // اضافه کردن این خط
                PayableAmount: totalPrice.value,
                CurrencyName: curreny.value,
                InvoiceDiscount: discount.value,
                saleinvoiceTypeId: orderType.value,
                BranchId: props.connectionId
            };
            const checkResult = await sendInvoice(SendInvoiceFinall);
            toast.success('پرداخت موفق، ' + checkResult.message);
            // ریست فرم
            handleBack();
            resetCart();
            emit('go-back');
        }
        else {
            toast.error(checkPay.message);
        }
    }
    catch (error) {
        console.error('خطا در پرداخت:', error);
        toast.error('خطا در پرداخت');
    }
    finally {
        isProcessing.value = false;
        overlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}
// بقیه توابع بدون تغییر...
function goBack() {
    router.push({ name: 'Categories' });
}
// در GoodsList.vue
function getGoodsImage(groupId) {
    const version = new Date().toISOString().slice(0, 16).replace(/[^0-9]/g, "");
    return `/img/goods/${groupId}.png?v=${version}`;
}
function handleImageError(event) {
    event.target.src = event.target.className.includes('group')
        ? '/img/groups/default.png'
        : '/img/goods/default.png';
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
    // اگر cartToppings.value یک شیء نباشد، آن را به شیء تبدیل می‌کنیم
    if (!cartToppings.value || Array.isArray(cartToppings.value)) {
        cartToppings.value = {};
    }
    return cartToppings.value[cartItemId] || [];
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
    delete cartToppings.value[cartItemId];
    await saveData('cartToppings', cartToppings.value);
}
/* انتهای جدید */
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
    const toppingsToSave = selectedToppings.value.flatMap(topping => {
        return Array(topping.count).fill({
            ToppingProductId: topping.ToppingProductId,
            ToppingId: topping.ToppingId,
            GoodsName: topping.GoodsName,
            Price: topping.Price,
            LevelId: topping.LevelId,
            LevelName: topping.LevelName,
            Count: topping.count,
            GoodsId: topping.GoodsTId
        });
    });
    // بررسی وجود آیتم مشابه در سبد خرید
    const existingItemIndex = cartItems.value.findIndex(item => {
        if (item.item.GoodsId !== selectedGoods.value.GoodsId)
            return false;
        const itemToppings = getToppingsForCartItem(item.id);
        if (itemToppings.length !== toppingsToSave.length)
            return false;
        // مقایسه تاپینگ‌ها
        return itemToppings.every(t1 => toppingsToSave.some(t2 => t1.ToppingProductId === t2.ToppingProductId));
    });
    if (existingItemIndex >= 0) {
        cartItems.value[existingItemIndex].quantity++;
    }
    else {
        cartItems.value.push({
            id: cartItemId,
            item: JSON.parse(JSON.stringify(selectedGoods.value)),
            quantity: 1
        });
        // فقط اگر تاپینگ وجود دارد ذخیره کنیم
        if (toppingsToSave.length > 0) {
            await addToppingsToCartItem(cartItemId, toppingsToSave);
        }
    }
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
    return toppingLevels.value.filter(level => goodsToppingLevels.includes(level.LevelId));
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
//  اطلاعات بررسی و اعمال تخفیفات باشگاه مشتریان حامی //
const totalDiscountApplied = ref(0); // متغیر جدید برای جمع کل تخفیفات
async function getHamiClubDetails() {
    try {
        // ریست کردن تخفیف‌های قبلی
        totalDiscountApplied.value = 0;
        discount.value = 0;
        const uPhone = document.getElementById('userPhone');
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
        if (!customerData) {
            HamiClubUserData.value = {
                userName: 'سایر',
                UserPhone: standardizedPhone
            };
            toast.error('اطلاعاتی برای این شماره در باشگاه مشتریان یافت نشد');
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
            Discounts: resultHamiClub.data.Result?.CustomerDiscountList || [],
            usedCredit: 0,
            usedDiscount: null,
            totalDiscount: 0
        };
        // اعمال اعتبار مشتری
        if (customerData.Credit > 0) {
            const creditAmount = Math.min(customerData.Credit, totalPrice.value);
            totalDiscountApplied.value += creditAmount;
            discount.value = creditAmount;
            userData.usedCredit = creditAmount;
            userData.totalDiscount = creditAmount;
            toast.success(`اعتبار شما به مبلغ ${creditAmount.toLocaleString()} ${curreny.value} اعمال شد`);
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
                    toast.success(`تخفیف ${bestDiscount.CodeTitle || ''} به مبلغ ${discountAmount.toLocaleString()} ${curreny.value} اعمال شد`);
                }
            }
            HamiClubUserData.value = userData;
        }
    }
    catch (error) {
        console.error('Error in getHamiClubDetails:', error);
        toast.error('خطایی در پردازش اطلاعات رخ داد');
    }
}
function findBestApplicableDiscount(discounts, discountProducts) {
    const applicableDiscounts = discounts.map(discount => {
        const products = discountProducts.filter(dp => dp.DiscountId === discount.DiscountId);
        // پیدا کردن آیتم‌های سبد خرید که شامل محصولات تخفیف‌دار هستند
        const applicableItems = cartItems.value.filter(item => {
            return products.some(p => Number(p.ProductCode) === item.item.GoodsCode);
        });
        if (applicableItems.length === 0)
            return null;
        // محاسبه قیمت کل قابل تخفیف (شامل قیمت پایه + تاپینگ‌ها)
        const totalApplicablePrice = applicableItems.reduce((sum, item) => {
            const toppings = getToppingsForCartItem(item.id);
            const toppingsPrice = toppings.reduce((sum, topping) => sum + (topping.Price || 0), 0);
            return sum + ((item.item.GoodsPrice + toppingsPrice) * item.quantity);
        }, 0);
        return {
            ...discount,
            applicableItems,
            totalApplicablePrice,
            discountValue: calculateDiscountValue(discount, totalApplicablePrice)
        };
    }).filter(Boolean);
    if (applicableDiscounts.length === 0)
        return null;
    // انتخاب تخفیف با بیشترین مقدار
    return applicableDiscounts.reduce((best, current) => current.discountValue > best.discountValue ? current : best);
}
function calculateDiscountValue(discount, price) {
    if (discount.DiscountType === false) { // درصدی
        return price * (discount.DiscountValue / 100);
    }
    else if (discount.DiscountType === true) { // مبلغی
        return Math.min(discount.DiscountValue, price);
    }
    return 0;
}
function applyDiscountToCart(discount, discountProducts) {
    const applicableProducts = discountProducts.filter(dp => dp.DiscountId === discount.DiscountId);
    let totalDiscountAmount = 0;
    cartItems.value.forEach(item => {
        const isApplicable = applicableProducts.some(dp => Number(dp.ProductCode) === item.item.GoodsCode);
        if (isApplicable) {
            const itemBasePrice = item.item.GoodsPrice * item.quantity;
            const discountValue = discount.DiscountType === false ? // درصدی
                itemBasePrice * (discount.DiscountValue / 100) :
                Math.min(discount.DiscountValue, itemBasePrice); // مبلغی
            totalDiscountAmount += discountValue;
            // ذخیره اطلاعات تخفیف برای نمایش
            item.discount = {
                ...discount,
                discountValue,
                originalPrice: itemBasePrice,
                finalPrice: itemBasePrice - discountValue
            };
        }
    });
    // به روزرسانی تخفیف کل
    discount.value = totalDiscountAmount;
    totalDiscountApplied.value = totalDiscountAmount;
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
// بررسی آیا کالاهایی با هزینه بسته‌بندی وجود دارند
const hasPackingItems = computed(() => {
    return cartItems.value.some(cartItem => cartItem.item.PackingPrice);
});
// محاسبه کل هزینه بسته‌بندی
const totalPackingPrice = computed(() => {
    if (orderType.value !== "3")
        return 0;
    return cartItems.value.reduce((total, cartItem) => {
        return total + (cartItem.item.PackingPrice || 0) * cartItem.quantity;
    }, 0);
});
function handleBack() {
    emit('go-back');
}
function resetCart() {
    cartItems.value = [];
    cartToppings.value = {};
    if (cart) {
        cart.value = {
            items: [],
            toppings: {}
        };
    }
    saveCart();
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
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "goods-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cart-header2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.$emit('go-back');
        } },
    ...{ class: "back-button" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.toggleCart) },
    ...{ class: "cart-indicator" },
});
(__VLS_ctx.count);
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "loader-container" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "loader" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "loader-text" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "groupHeader" },
    });
    (props.group.GroupName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "goods-grid" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.filteredGoods))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    __VLS_ctx.addToCart(item);
                } },
            key: (item.GoodsId),
            ...{ class: "goods-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img, __VLS_intrinsicElements.img)({
            ...{ onError: (__VLS_ctx.handleImageError) },
            src: (__VLS_ctx.getGoodsImage(item.GoodsCode)),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (item.GoodsName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({});
        (item.GoodsDescription);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (item.GoodsPrice.toLocaleString());
        (__VLS_ctx.curreny);
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
                        __VLS_ctx.addToCart(item);
                    } },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!!(__VLS_ctx.isInCart(item)))
                            return;
                        __VLS_ctx.addToCart(item);
                    } },
                ...{ class: "add-to-cart-btn" },
            });
        }
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    dir: "rtl",
    ...{ class: "cart-sidebar" },
    ...{ class: ({ active: __VLS_ctx.showCart }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cart-header2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.toggleCart) },
    ...{ class: "close-cart" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
if (__VLS_ctx.count === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "empty-cart" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    for (const [cartItem, index] of __VLS_getVForSourceType((__VLS_ctx.cartItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (cartItem.id),
            ...{ class: "cart-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "cart-item-details" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "item-name" },
        });
        (cartItem.item.GoodsName);
        if (__VLS_ctx.getToppingsForCartItem(cartItem.id).length > 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "cart-item-toppings" },
            });
            for (const [topping, tIndex] of __VLS_getVForSourceType((__VLS_ctx.getToppingsForCartItem(cartItem.id)))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: (tIndex),
                    ...{ class: "topping-badge" },
                });
                (topping.GoodsName);
                (topping.Price.toLocaleString());
            }
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "quantity-control quantity-control2" },
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "price-display" },
        });
        ((cartItem.item.GoodsPrice * cartItem.quantity).toLocaleString());
        (__VLS_ctx.curreny);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.count === 0))
                        return;
                    __VLS_ctx.removeFromCart(index);
                } },
            ...{ class: "remove-item" },
        });
    }
    if (__VLS_ctx.CheckHamiClub) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "clubDiv" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            type: "text",
            id: "userPhone",
            maxlength: "11",
            oninput: "\u0074\u0068\u0069\u0073\u002e\u0076\u0061\u006c\u0075\u0065\u0020\u003d\u0020\u0074\u0068\u0069\u0073\u002e\u0076\u0061\u006c\u0075\u0065\u002e\u0072\u0065\u0070\u006c\u0061\u0063\u0065\u0028\u002f\u005b\u005e\u0030\u002d\u0039\u002e\u005d\u002f\u0067\u002c\u0020\u0027\u0027\u0029\u002e\u0072\u0065\u0070\u006c\u0061\u0063\u0065\u0028\u002f\u0028\u005c\u002e\u002e\u002a\u0029\u005c\u002e\u002f\u0067\u002c\u0020\u0027\u0024\u0031\u0027\u0029\u003b",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.getHamiClubDetails) },
        });
    }
    if (__VLS_ctx.count != 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "cart-total" },
        });
        (__VLS_ctx.totalTax.toLocaleString());
        (__VLS_ctx.curreny);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.br, __VLS_intrinsicElements.br)({});
        if (__VLS_ctx.orderType === '3' && __VLS_ctx.hasPackingItems) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.totalPackingPrice.toLocaleString());
            (__VLS_ctx.curreny);
        }
        if (__VLS_ctx.orderType === '3' && __VLS_ctx.hasPackingItems) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.br, __VLS_intrinsicElements.br)({});
        }
        (__VLS_ctx.totalDiscountApplied);
        (__VLS_ctx.curreny);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.br, __VLS_intrinsicElements.br)({});
        (__VLS_ctx.totalPrice.toLocaleString());
        (__VLS_ctx.curreny);
    }
    if (__VLS_ctx.count != 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "radio-inputs radio-inputs2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "radio" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            type: "radio",
            name: "radio",
            value: "2",
            checked: (__VLS_ctx.checkIsSalon),
            disabled: (__VLS_ctx.isProcessing),
        });
        (__VLS_ctx.orderType);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "name" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "radio" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            type: "radio",
            name: "radio",
            value: "3",
            checked: (__VLS_ctx.checkIsTakeAway),
            disabled: (__VLS_ctx.isProcessing),
        });
        (__VLS_ctx.orderType);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "name" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.checkout) },
        ...{ class: "checkout-btn" },
        disabled: (!__VLS_ctx.orderType || __VLS_ctx.isProcessing),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.confirmResetCart) },
        ...{ class: "reset-cart-btn" },
    });
}
if (__VLS_ctx.showCart) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.toggleCart) },
        ...{ class: "cart-overlay" },
    });
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
            (__VLS_ctx.curreny);
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
/** @type {__VLS_StyleScopedClasses['goods-container']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-header2']} */ ;
/** @type {__VLS_StyleScopedClasses['back-button']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['loader-container']} */ ;
/** @type {__VLS_StyleScopedClasses['loader']} */ ;
/** @type {__VLS_StyleScopedClasses['loader-text']} */ ;
/** @type {__VLS_StyleScopedClasses['groupHeader']} */ ;
/** @type {__VLS_StyleScopedClasses['goods-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['goods-item']} */ ;
/** @type {__VLS_StyleScopedClasses['quantity-control']} */ ;
/** @type {__VLS_StyleScopedClasses['add-to-cart-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-header2']} */ ;
/** @type {__VLS_StyleScopedClasses['close-cart']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-cart']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-item']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-item-details']} */ ;
/** @type {__VLS_StyleScopedClasses['item-name']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-item-toppings']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['quantity-control']} */ ;
/** @type {__VLS_StyleScopedClasses['quantity-control2']} */ ;
/** @type {__VLS_StyleScopedClasses['price-display']} */ ;
/** @type {__VLS_StyleScopedClasses['remove-item']} */ ;
/** @type {__VLS_StyleScopedClasses['clubDiv']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-total']} */ ;
/** @type {__VLS_StyleScopedClasses['radio-inputs']} */ ;
/** @type {__VLS_StyleScopedClasses['radio-inputs2']} */ ;
/** @type {__VLS_StyleScopedClasses['radio']} */ ;
/** @type {__VLS_StyleScopedClasses['name']} */ ;
/** @type {__VLS_StyleScopedClasses['radio']} */ ;
/** @type {__VLS_StyleScopedClasses['name']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['reset-cart-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-header']} */ ;
/** @type {__VLS_StyleScopedClasses['close-modal']} */ ;
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
/** @type {__VLS_StyleScopedClasses['selected-toppings']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-toppings-list']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-topping-item']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-topping-quantity']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['cancel-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['confirm-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['loader-pay']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-pay']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            $props: __VLS_makeOptional(props),
            ...props,
            $emit: emit,
            orderType: orderType,
            isProcessing: isProcessing,
            curreny: curreny,
            loading: loading,
            cartItems: cartItems,
            showCart: showCart,
            showToppingModal: showToppingModal,
            selectedGoods: selectedGoods,
            selectedToppings: selectedToppings,
            CheckHamiClub: CheckHamiClub,
            checkIsSalon: checkIsSalon,
            checkIsTakeAway: checkIsTakeAway,
            count: count,
            filteredGoods: filteredGoods,
            totalPrice: totalPrice,
            totalTax: totalTax,
            addToCart: addToCart,
            removeFromCart: removeFromCart,
            increaseQuantity: increaseQuantity,
            decreaseQuantity: decreaseQuantity,
            decreaseCartQuantity: decreaseCartQuantity,
            isInCart: isInCart,
            getCartQuantity: getCartQuantity,
            toggleCart: toggleCart,
            checkout: checkout,
            getGoodsImage: getGoodsImage,
            handleImageError: handleImageError,
            toggleTopping: toggleTopping,
            getToppingsForCartItem: getToppingsForCartItem,
            addToCartWithToppings: addToCartWithToppings,
            getToppingLevels: getToppingLevels,
            getToppingProducts: getToppingProducts,
            isToppingSelected: isToppingSelected,
            getToppingCount: getToppingCount,
            totalDiscountApplied: totalDiscountApplied,
            getHamiClubDetails: getHamiClubDetails,
            hasPackingItems: hasPackingItems,
            totalPackingPrice: totalPackingPrice,
            confirmResetCart: confirmResetCart,
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
