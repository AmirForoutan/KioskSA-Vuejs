<template>
  <div class="goods-container">
    <!-- Header با سبد خرید -->
    <div class="cart-header2">
      <button @click="$emit('go-back')" class="back-button">
        بازگشت &larr;
      </button>
      <button class="cart-indicator" @click="toggleCart">
        🛒 سبد خرید ({{ count }})
      </button>
    </div>

    <!-- لیست کالاها -->
    <div v-if="loading" class="loader-container">
      <div class="loader"></div>
      <div class="loader-text">در حال بارگذاری ...</div>
    </div>

    <div v-else>
      <div class="groupHeader">{{ props.group.GroupName }}</div>
      <div class="goods-grid">
        <div v-for="item in filteredGoods" :key="item.GoodsId" class="goods-item" @click.stop="addToCart(item)">
          <img :src="getGoodsImage(item.GoodsCode)" @error="handleImageError">
          <h3>{{ item.GoodsName }}</h3>
          <h5>{{ item.GoodsDescription }}</h5>
          <p>{{ item.GoodsPrice.toLocaleString() }} {{ curreny }}</p>

          <div class="quantity-control" v-if="isInCart(item)">
            <button @click.stop="decreaseCartQuantity(item)">-</button>
            <span>{{ getCartQuantity(item) }}</span>
            <button @click.stop="addToCart(item)">+</button>
          </div>
          <button v-else class="add-to-cart-btn" @click.stop="addToCart(item)">
            افزودن
          </button>
        </div>
      </div>
    </div>

    <!-- سایدبار سبد خرید -->
    <div dir="rtl" class="cart-sidebar" :class="{ active: showCart }">
      <div class="cart-header2">
        <button @click="toggleCart" class="close-cart">&times;</button>
        <h3>سبد خرید شما</h3>
      </div>

      <div v-if="count === 0" class="empty-cart">
        سبد خرید خالی است
      </div>

      <div v-else>
        <div v-for="(cartItem, index) in cartItems" :key="cartItem.id" class="cart-item">
          <div class="cart-item-details">
            <span class="item-name">{{ cartItem.item.GoodsName }}</span>
            <div v-if="getToppingsForCartItem(cartItem.id).length > 0" class="cart-item-toppings">
              <div v-for="(topping, tIndex) in getToppingsForCartItem(cartItem.id)" :key="tIndex" class="topping-badge">
                {{ topping.GoodsName }} (+{{ topping.Price.toLocaleString() }})
              </div>
            </div>
          </div>

          <div class="quantity-control quantity-control2">
            <button @click.stop="decreaseQuantity(index)">-</button>
            <span>{{ cartItem.quantity }}</span>
            <button @click.stop="increaseQuantity(index)">+</button>
          </div>

          <div class="price-display">
            {{ (cartItem.item.GoodsPrice * cartItem.quantity).toLocaleString() }} {{ curreny }}
          </div>

          <button @click.stop="removeFromCart(index)" class="remove-item">&times;</button>
        </div>
        <div v-if="CheckHamiClub" class="clubDiv">
          <span>استعلام شماره تلفن از باشگاه مشتریان</span>
          <input type="text" id="userPhone" maxlength="11"
            oninput="this.value = this.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');">
          <button @click.stop="getHamiClubDetails">بررسی و اعمال</button>
        </div>
        <div v-if="count != 0" class="cart-total">
          مالیات: {{ totalTax.toLocaleString() }} {{ curreny }}
          <br>
          <span v-if="orderType === '3' && hasPackingItems">هزینه بسته‌بندی: {{ totalPackingPrice.toLocaleString() }}
            {{ curreny }}</span>
          <span v-if="orderType === '3' && hasPackingItems"><br></span>
          تخفیف: {{ totalDiscountApplied }} {{ curreny }}
          <br>
          مجموع: {{ totalPrice.toLocaleString() }} {{ curreny }}
        </div>
        <div v-if="count != 0" class="radio-inputs radio-inputs2">
          <label class="radio">
            <input type="radio" name="radio" v-model="orderType" value="2" :checked="checkIsSalon"
              :disabled="isProcessing">
            <span class="name">همینجا میخورم</span>
          </label>
          <label class="radio">
            <input type="radio" name="radio" v-model="orderType" value="3" :checked="checkIsTakeAway"
              :disabled="isProcessing">
            <span class="name">با خودم میبرم</span>
          </label>
        </div>
        <button class="checkout-btn" @click="checkout" :disabled="!orderType || isProcessing">
          پرداخت
        </button>
        <button @click="confirmResetCart" class="reset-cart-btn">خالی کردن سبد خرید</button>
      </div>
    </div>
    <!-- Overlay برای سبد خرید -->
    <div v-if="showCart" class="cart-overlay" @click="toggleCart"></div>

    <!-- مودال تاپینگ‌ها -->
    <div v-if="showToppingModal" class="modal-overlay">
      <div class="topping-modal">
        <div class="modal-header">
          <h3>انتخاب افزودنی‌ها برای {{ selectedGoods?.GoodsName }}</h3>
          <button @click="showToppingModal = false" class="close-modal">&times;</button>
        </div>

        <div class="topping-levels">
          <div v-for="level in getToppingLevels(selectedGoods)" :key="level.LevelId" class="topping-level">
            <h4>
              {{ level.LevelTitle }}
              <small>(حداقل {{ level.MinCount }} - حداکثر {{ level.MaxCount }})</small>
            </h4>

            <div class="topping-products">
              <div v-for="product in getToppingProducts(level.LevelId, selectedGoods.GoodsId)" :key="product.GoodsId"
                class="topping-product" :class="{ selected: isToppingSelected(product) }"
                @click="toggleTopping(product, level)">
                <div class="topping-product-info">
                  <div class="topping-product-name">{{ product.GoodsName }}</div>
                  <div class="topping-product-price">+{{ product.Price.toLocaleString() }} {{ curreny }}</div>
                </div>

                <div class="topping-quantity-control" v-if="isToppingSelected(product)">
                  <button @click.stop="toggleTopping(product, level, 'decrease')">-</button>
                  <span class="topping-quantity">{{ getToppingCount(product) }}</span>
                  <button @click.stop="toggleTopping(product, level, 'increase')">+</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="selected-toppings" v-if="selectedToppings.length > 0">
          <h4>افزودنی‌های انتخاب شده:</h4>
          <div class="selected-toppings-list">
            <div v-for="topping in selectedToppings" :key="topping.ToppingProductId" class="selected-topping-item">
              <span class="selected-topping-quantity"> {{ topping.count }}x </span>
              <span> {{ topping.GoodsName }} </span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="showToppingModal = false" class="cancel-btn">انصراف</button>
          <button @click="addToCartWithToppings" class="confirm-btn">تایید و افزودن به سبد</button>
        </div>
      </div>
    </div>
  </div>

  <div id="loader-overlay" style="display: none;">
    <div class="loader-pay">
      <div class="spinner-pay"></div>
      <p>منتظر پاسخ از دستگاه پوز...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, watch } from 'vue'
import { getData, saveData } from '../services/storageService'
import { getCurrency, IsClubStat, IsSalonOrderStat, IsTakeAwayOrderStat } from '../utilities'
import { sendToPOS, getCustomerData, sendInvoice } from '../services/apiService'
import { useToast } from 'vue-toastification'
import Swal from 'sweetalert2';

const cart = inject('cart')
const orderType = ref(null); // 2 برای همینجا میخورم، 3 برای با خودم میبرم
const isProcessing = ref(false); // برای غیرفعال کردن دکمه‌ها هنگام پردازش

//بررسی ارز مالی
const currencyUnit = ref(null)
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
})

const emit = defineEmits(['go-back'])

const goods = ref([])
const loading = ref(false)
const cartItems = ref(cart?.value?.items || [])
const showCart = ref(false)
const getCartItem = ref([])
const cartInitialized = ref(false);
const showToppingModal = ref(false)
const selectedGoods = ref(null)
const toppings = ref([])
const toppingLevels = ref([])
const toppingProducts = ref([])
const selectedToppings = ref([])
const cartToppings = ref({})
const CheckHamiClub = ref(false)
const HamiClubUserData = ref()
const discount = ref(0)
const checkIsSalon = ref(false)
const checkIsTakeAway = ref(false)

const toast = useToast()

// دریافت کالاها
onMounted(async () => {

  loading.value = true;
  currencyUnit.value = await getCurrency();
  CheckHamiClub.value = await IsClubStat();
  checkIsSalon.value = await IsSalonOrderStat()
  checkIsTakeAway.value = await IsTakeAwayOrderStat()
  if (checkIsSalon) {
    orderType.value = "2"
  } if (checkIsTakeAway) {
    orderType.value = "3"
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
      cartItems.value = newItems || []
    }, { deep: true })

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
      if (!item || typeof item !== 'object') return false;
      return Number(item.GoodsGroupId) === Number(props.group.GroupId);
    });

  } catch (error) {
    console.error('خطا در دریافت کالاها و تاپینگ ها:', error);
    goods.value = [];
    cartItems.value = [];
  } finally {
    loading.value = false;
    cartInitialized.value = true;
  }
});

// دریافت سبد خرید

const checkCart = computed(() => {
  cartItems.value = getCartItem.value
})


//دریافت تعداد کالاهای سبد خرید
const count = computed(() => {
  if (!cartInitialized.value) return '...';
  return cartItems.value?.length || 0;
});

// محاسبات
const filteredGoods = computed(() => {
  if (loading.value) return []  // در حال لودینگ
  return goods.value
})

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
  } else {
    // بررسی وجود آیتم در سبد خرید
    const existingItemIndex = cartItems.value.findIndex(
      cartItem => cartItem.item.GoodsId === item.GoodsId
    );

    if (existingItemIndex >= 0) {
      // اگر آیتم وجود دارد، تعداد را افزایش می‌دهیم
      cartItems.value[existingItemIndex].quantity++;
    } else {
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
  } else {
    await removeFromCart(index);
  }
}
//بررسی وجود آیتم مشابه در سبد خرید
function hasSameItemInCart(item, toppingsToCheck) {
  return cartItems.value.some(cartItem => {
    if (cartItem.item.GoodsId !== item.GoodsId) return false;

    const cartItemToppings = getToppingsForCartItem(cartItem.id);
    if (cartItemToppings.length !== toppingsToCheck.length) return false;

    return cartItemToppings.every(ct =>
      toppingsToCheck.some(st =>
        st.ToppingProductId === ct.ToppingProductId
      )
    );
  });
}

// کم و زیاد کردن آیتم در قسمت نمایش آیتم ها
// افزایش تعداد کالا
function increaseCartQuantity(item) {
  const existingItem = cartItems.value.find(cartItem => cartItem.item.GoodsId === item.GoodsId);
  if (existingItem) {
    existingItem.quantity++;
  } else {
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
    } else {
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
      }
    }
  } catch (error) {
    console.error('خطا در ذخیره سبد خرید:', error);
  }
}

function toggleCart() {
  showCart.value = !showCart.value
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
    }
    const checkResult = await sendInvoice(SendInvoiceFinall)
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
      }

      const checkResult = await sendInvoice(SendInvoiceFinall)
      toast.success('پرداخت موفق، ' + checkResult.message);

      // ریست فرم
      handleBack();
      resetCart();

      emit('go-back');
    } else {
      toast.error(checkPay.message);
    }
  } catch (error) {
    console.error('خطا در پرداخت:', error);
    toast.error('خطا در پرداخت');
  } finally {
    isProcessing.value = false;
    overlay.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
}

// بقیه توابع بدون تغییر...
function goBack() {
  router.push({ name: 'Categories' })
}

// در GoodsList.vue
function getGoodsImage(groupId) {
  const version = new Date().toISOString().slice(0, 16).replace(/[^0-9]/g, "");

  return `/img/goods/${groupId}.png?v=${version}`
}

function handleImageError(event) {
  event.target.src = event.target.className.includes('group')
    ? '/img/groups/default.png'
    : '/img/goods/default.png'
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
  const existingIndex = selectedToppings.value.findIndex(
    t => t.ToppingProductId === toppingProduct.GoodsId
  );

  if (action === 'increase') {
    // بررسی محدودیت‌های سطح
    const levelToppings = selectedToppings.value.filter(
      t => t.LevelId === level.LevelId
    );

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
    } else {
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
  } else if (action === 'decrease') {
    if (existingIndex >= 0) {
      if (selectedToppings.value[existingIndex].count > 1) {
        selectedToppings.value[existingIndex].count--;
      } else {
        selectedToppings.value.splice(existingIndex, 1);
      }
    }
  } else {
    // حالت کلیک ساده (toggle)
    if (existingIndex >= 0) {
      selectedToppings.value.splice(existingIndex, 1);
    } else {
      // بررسی محدودیت‌ها
      const levelToppings = selectedToppings.value.filter(
        t => t.LevelId === level.LevelId
      );

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
    if (cartItem.item.GoodsId !== item.GoodsId) return false;

    const cartToppings = cartItem.toppings || [];
    if (cartToppings.length !== toppingsToCheck.length) return false;

    return cartToppings.every(ct =>
      toppingsToCheck.some(st =>
        st.ToppingProductId === ct.ToppingProductId
      )
    );
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
  if (!selectedGoods.value) return;

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
    if (item.item.GoodsId !== selectedGoods.value.GoodsId) return false;

    const itemToppings = getToppingsForCartItem(item.id);
    if (itemToppings.length !== toppingsToSave.length) return false;

    // مقایسه تاپینگ‌ها
    return itemToppings.every(t1 =>
      toppingsToSave.some(t2 =>
        t1.ToppingProductId === t2.ToppingProductId
      )
    );
  });

  if (existingItemIndex >= 0) {
    cartItems.value[existingItemIndex].quantity++;
  } else {
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
  if (!item || !toppings.value || !toppingLevels.value) return [];

  // دریافت لول‌های مرتبط با این کالا
  const goodsToppingLevels = [...new Set(
    toppings.value
      .filter(t => t.GoodsId === item.GoodsId)
      .map(t => t.LevelId)
  )];

  return toppingLevels.value.filter(level =>
    goodsToppingLevels.includes(level.LevelId)
  );
}

// دریافت محصولات تاپینگ برای سطح خاص
// در بخش توابع

function getToppingProducts(levelId, itemId) {
  if (!toppings.value || !toppingProducts.value) return [];

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
  return selectedToppings.value.some(
    t => t.ToppingProductId === product.GoodsId
  );
}

function getToppingCount(product) {
  const topping = selectedToppings.value.find(
    t => t.ToppingProductId === product.GoodsId
  );
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
      const today = convertPersianDigitsToEnglish(s)

      const validDiscounts = resultHamiClub.data.Result.CustomerDiscountList.filter(discount => {
        return (
          discount.IsActive &&
          discount.CanUse &&
          isDateInRange(today, discount.StartDate, discount.EndDate)
        );
      });

      if (validDiscounts.length > 0) {
        const bestDiscount = findBestApplicableDiscount(
          validDiscounts,
          resultHamiClub.data.Result.CustomerDiscountProductsList || []
        );

        if (bestDiscount) {
          const discountAmount = applyDiscountToCart(
            bestDiscount,
            resultHamiClub.data.Result.CustomerDiscountProductsList || []
          );

          userData.totalDiscount = totalDiscountApplied.value;
          userData.usedDiscount = bestDiscount;

          toast.success(`تخفیف ${bestDiscount.CodeTitle || ''} به مبلغ ${discountAmount.toLocaleString()} ${curreny.value} اعمال شد`);
        }
      }
      HamiClubUserData.value = userData;
    }

  } catch (error) {
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

    if (applicableItems.length === 0) return null;

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

  if (applicableDiscounts.length === 0) return null;

  // انتخاب تخفیف با بیشترین مقدار
  return applicableDiscounts.reduce((best, current) =>
    current.discountValue > best.discountValue ? current : best
  );
}

function calculateDiscountValue(discount, price) {
  if (discount.DiscountType === false) { // درصدی
    return price * (discount.DiscountValue / 100);
  } else if (discount.DiscountType === true) { // مبلغی
    return Math.min(discount.DiscountValue, price);
  }
  return 0;
}

function applyDiscountToCart(discount, discountProducts) {
  const applicableProducts = discountProducts.filter(
    dp => dp.DiscountId === discount.DiscountId
  );

  let totalDiscountAmount = 0;

  cartItems.value.forEach(item => {
    const isApplicable = applicableProducts.some(
      dp => Number(dp.ProductCode) === item.item.GoodsCode
    );

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
  if (!persianDate) return null;

  const [year, month, day] = persianDate.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  return date;
}

function isDateInRange(date, startDate, endDate) {
  if (!date) return false;

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
  if (orderType.value !== "3") return 0;

  return cartItems.value.reduce((total, cartItem) => {
    return total + (cartItem.item.PackingPrice || 0) * cartItem.quantity;
  }, 0);
});

function handleBack() {
  emit('go-back')
}

function resetCart() {
  cartItems.value = []
  cartToppings.value = {}
  if (cart) {
    cart.value = {
      items: [],
      toppings: {}
    }
  }
  saveCart()
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
      Swal.fire(
        'پاک شد!',
        'سبد خرید شما با موفقیت پاک شد.',
        'success'
      )
    }
  })
}
</script>
