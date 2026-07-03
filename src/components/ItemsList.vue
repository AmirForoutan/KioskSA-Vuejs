<template>
  <!-- Made By Amirreza Foroutan For HamiPOS +989120496824 -->
  <div class="main-container">

    <!-- محتوای اصلی -->
    <div class="layout">

      <!-- ستون چپ: دسته‌بندی -->
      <aside class="categories-panel" ref="categoriesContainer">
        <ScrollArrows v-if="categoriesContainer && !loading && groups.length" :container-ref="categoriesContainer"
          direction="vertical" />

        <div class="categories-vertical">
          <!-- Skeleton دسته‌بندی -->
          <template v-if="loading">
            <div v-for="i in 10" :key="'cat-skel-' + i" class="category-item skeleton">
              <div class="category-image skeleton-box"></div>
              <div class="category-name skeleton-line w-90"></div>
            </div>
          </template>

          <!-- دسته‌بندی واقعی -->
          <template v-else>
            <div v-for="group in groups" :key="group.GroupId" @click="selectGroup(group)" class="category-item"
              :class="{ active: selectedGroup?.GroupId === group.GroupId }">
              <img :src="getGroupImage(group.GroupCode)" @error="handleImageError" class="category-image"
                :alt="group.GroupTitle" />
              <div class="category-name">{{ group.GroupName }}</div>
            </div>

            <div class="cart-body">
              <div class="cart-items-list">

                <!-- خلاصه مبالغ (همون کد فعلی‌ات) -->
                <div v-if="count != 0" class="cart-total">
                  <div class="cart-title">سبد خرید ({{ count }})</div>
                  مالیات: {{ totalTax.toLocaleString() }} {{ currency }}
                  <br />
                  <span v-if="orderType === '3'">هزینه بسته‌بندی: {{ totalPackingPrice.toLocaleString() }} {{ currency
                  }}<br /></span>
                  تخفیف: {{ totalDiscountApplied.toLocaleString() }} {{ currency }}
                  <br />
                  مجموع: {{ totalPrice.toLocaleString() }} {{ currency }}
                </div>

                <div class="payment-method" v-if="count != 0 && CheckClub">
                  <label>
                    <input type="radio" value="pos" v-model="paymentMethod" /> کارت
                  </label>
                  <label>
                    <input type="radio" value="credit" v-model="paymentMethod" /> اعتباری
                  </label>
                </div>

                <!-- اگر اعتباری انتخاب شد، شماره تلفن و مبلغ اعتبار را نمایش بده -->
                <div v-if="paymentMethod === 'credit' && count != 0" class="credit-box">
                  <input id="PhoneNumber" type="text" placeholder="شماره تلفن" @focus="handleInputFocus"
                    @blur="handleInputBlur"
                    oninput="this.value = this.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');" />
                  <button @click="getCustomerCredit">بررسی اعتبار</button>

                  <div v-if="customerCredit > 0">
                    <p>اعتبار شما: {{ customerCredit.toLocaleString() }} {{ currency }}</p>
                    <input type="number" v-model.number="creditAmount" :max="Math.min(customerCredit, totalPrice)"
                      placeholder="مقدار استفاده از اعتبار" />
                  </div>
                </div>

                <div v-if="IsShowDiscountCartField && count != 0" class="discount-card-box">
                  <input id="discountCartField" v-model="discountCart" type="text" placeholder="شماره/بارکد کارت تخفیف"
                    @focus="handleInputClick2" @blur="handleInputBlur2"
                    oninput="this.value = this.value.replace(/[^0-9A-Za-z؀-ۿ_-]/g, '');" />
                  <button @click="CheckDiscountCart">بررسی و اعمال کارت تخفیف</button>
                  <button v-if="selectedDiscountCard" class="clear-discount-btn" @click="clearCustomerDiscountState">
                    حذف تخفیف
                  </button>
                  <div v-if="selectedDiscountCard" class="discount-card-result">
                    کارت {{ selectedDiscountCard.CardNumber || selectedDiscountCard.DiscountCardId }} اعمال شد
                  </div>
                </div>

                <!-- اگر کارت انتخاب شد، مبلغ کارت -->
                <div v-if="paymentMethod === 'pos' && count != 0" style="display: none;">
                  <input type="hidden" v-model.number="posAmount" :max="totalPrice - creditAmount"
                    placeholder="مبلغ کارت" />
                </div>

                <div v-if="orderTypeConfigError && count != 0" class="kiosk-config-error">
                  نوع سفارش را اصلاح کنید
                </div>

                <div v-if="shouldUseTableSelection && count != 0" class="table-selection kiosk-table-selection">
                  <label for="kiosk-table-select">میز سالن</label>
                  <select id="kiosk-table-select" class="table-dropdown" v-model.number="selectedTableId">
                    <option :value="0">انتخاب میز</option>
                    <option v-for="table in activeTables" :key="table.TableId" :value="Number(table.TableId)"
                      :disabled="isTableOccupied(table)">
                      {{ tableOptionTitle(table) }}
                    </option>
                  </select>
                  <small v-if="requiresTableSelection">انتخاب میز برای سفارش سالن الزامی است.</small>
                  <small v-else>در صورت نیاز، میز سفارش را انتخاب کنید.</small>
                </div>

                <div v-if="showOrderTypeSelector && count != 0" class="kiosk-order-type-selector">
                  <div class="kiosk-option-title">نوع سفارش</div>
                  <div class="kiosk-order-type-buttons">
                    <button type="button" :class="{ active: orderType === '2' }" @click="orderType = '2'">سالن</button>
                    <button type="button" :class="{ active: orderType === '3' }" @click="orderType = '3'">حضوری</button>
                  </div>
                </div>

                <div class="cart-actions-fixed">
                  <button v-if="count != 0" @click="checkout" class="checkout-btn" :disabled="!canCheckout">
                    {{ keepTableOpenForSubmit ? 'ثبت سفارش' : 'پرداخت' }}
                  </button>

                  <button v-if="count != 0" @click="confirmResetCart" class="reset-cart-btn">
                    خالی کردن سبد خرید
                  </button>

                  <button v-if="(isShowOrderRegisteration || CountOfConnections > 1)" @click="confirmBack"
                    class="back-button2">
                    بازگشت
                  </button>
                </div>
              </div>
            </div>

          </template>
        </div>
      </aside>

      <!-- وسط/راست: کالاها -->
      <main class="goods-panel" ref="goodsContainer">

        <!-- Skeleton کالاها -->
        <div v-if="loading" class="goods-grid">
          <div v-for="i in 12" :key="'goods-skel-' + i" class="goods-item skeleton">
            <div class="goods-image skeleton-box"></div>
            <div class="skeleton-line w-70"></div>
            <div class="skeleton-line w-90"></div>
            <div class="skeleton-line w-40"></div>
            <div class="skeleton-btn"></div>
          </div>
        </div>

        <!-- کالاها با انیمیشن -->
        <transition-group v-else name="goods" tag="div" class="goods-grid">
          <div v-if="filteredGoods.length === 0" key="empty" class="empty-message">
            هیچ کالایی در حال حاضر موجود نیست.
          </div>

          <div v-for="item in filteredGoods" :key="item.GoodsId" class="goods-item"
            @click.stop="addToCartWithFly($event, item)">
            <img :src="getGoodsImage(item.GoodsCode)" @error="handleImageError" class="goods-image" />
            <h3>{{ item.GoodsName }}</h3>
            <h5>{{ item.GoodsDescription }}</h5>
            <p>{{ item.GoodsPrice.toLocaleString() }} {{ currency }}</p>

            <div class="quantity-control" v-if="isInCart(item)">
              <button @click.stop="decreaseCartQuantity(item)">-</button>
              <span>{{ getCartQuantity(item) }}</span>
              <button @click.stop="addToCartWithFly($event, item)">+</button>
            </div>
            <div class="add-btn" v-else>
              <button class="add-to-cart-btn" @click.stop="addToCartWithFly($event, item)">افزودن</button>
            </div>
          </div>
        </transition-group>
        <ScrollArrows v-if="goodsContainer && !loading && filteredGoods.length" :container-ref="goodsContainer"
          direction="vertical" />
      </main>

      <!-- پایین: سبد خرید -->
      <footer class="cart-panel" ref="cartPanelRef">

        <!-- لیست آیتم‌های سبد خرید -->
        <div class="cart-items-list">
          <div v-if="count === 0" class="empty-cart-centered">
            سبد خرید خالی می باشد
          </div>

          <div v-else class="cart-items">
            <div v-for="(cartItem, index) in cartItems" :key="cartItem.id" class="cart-item-summary"
              :class="{ highlight: cartItem.highlight }">
              <img :src="getGoodsImage(cartItem.item.GoodsCode)" @error="handleImageError" class="cart-item-image" />

              <div class="cart-item-details">
                <div class="cart-item-name">
                  {{ cartItem.item.GoodsName }}
                </div>

                <!-- ✅ تاپینگ‌های این آیتم -->
                <div class="cart-item-toppings" v-if="getToppingsForCartItem(cartItem.id).length">
                  <span v-for="t in getToppingsForCartItem(cartItem.id)"
                    :key="`${cartItem.id}-${t.ToppingProductId}-${t.LevelId}`" class="topping-badge">
                    {{ (t.Count || 1) }}× {{ t.GoodsName }}
                  </span>
                </div>

                <!-- نمایش قیمت آیتم -->
                <div class="price-display">
                  {{ (cartItem.item.GoodsPrice * cartItem.quantity).toLocaleString() }} {{ currency }}
                </div>
              </div>

              <!-- کنترل تعداد -->
              <div class="cart-item-quantity">
                <button @click="decreaseQuantity(index)">-</button>
                <span>{{ cartItem.quantity }}</span>
                <button @click="increaseQuantity(index)">+</button>
              </div>

              <button class="remove-item" @click="removeFromCart(index)">×</button>
            </div>
          </div>
        </div>

      </footer>
    </div>

    <!-- مودال تاپینگ‌ها -->
    <div v-if="showToppingModal" class="modal-overlay">
      <div class="topping-modal">
        <div class="modal-header">
          <h3>انتخاب افزودنی‌ها برای {{ selectedGoods?.GoodsName }}</h3>
          <button @click="showToppingModal = false" class="close-modal">&times;</button>
        </div>

        <div class="modal-content-wrapper">
          <div class="topping-levels">
            <!-- محتوای تاپینگ‌ها اینجا قرار می‌گیرد -->
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
                    <div class="topping-product-price">+{{ product.Price.toLocaleString() }} {{ currency }}</div>
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

          <div class="selected-toppings-footer">
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
    </div>
  </div>
  <div id="loader-overlay" style="display: none;">
    <div class="loader-pay">
      <div class="spinner-pay"></div>
      <p>لطفا منتظر بمانید...</p>
    </div>
  </div>


  <div v-if="showKeyboard" class="simple-keyboard visible">
    <div class="keyboard-close-btn" @click="hideKeyboardPager">X</div>
    <div class="keyboard-row" v-for="(row, i) in keyboardLayout.normal" :key="i">
      <button v-for="key in row.split(' ')" :key="key" @click="handleKeyPress(key, $event)"
        :data-action="key === '{bksp}' ? 'bksp' : null || key === '{enter}' ? 'enter' : null">
        {{ key === '{bksp}' ? '⌫' : key && key === '{enter}' ? 'ثبت' : key }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch, inject, toRaw } from 'vue'
import { getData, saveData, removeData } from '../services/storageService'
import {
  getCurrency, IsClubStat, OrderRegistrationStat, IsSalonOrderStat, IsTakeAwayOrderStat,
  GetIsCollapseCart, IsShowTables, IsShowDiscountCart,
  IsTableSelectionRequired, KeepSalonTableOpenAfterSubmit, ShowKioskOrderTypeSelector
} from '../utilities'
import {
  sendToPOS, getCustomerData, sendInvoice, fetchCategories, fetchGoods, fetchToppingProducts,
  fetchToppings, fetchToppingLevels, fetchDiscountsCarts, useCustomerCredit, fetchCustomerCredit,
  checkStockLicense, checkStockGoods, fetchTables, fetchGoodsDiscounts
} from '../services/apiService'
import { useToast } from 'vue-toastification';
import ScrollArrows from './ScrollArrows.vue';
import { useNow } from '@vueuse/core';
import Swal from 'sweetalert2';

const toast = useToast({
  position: 'top-right',
  style: {
    fontFamily: 'Vazirmatn-FD-Black'
  }
})

// داده‌های حالت
const groups = ref([])
const goods = ref([])
const tables = ref([])
const goodsDiscounts = ref([])
const loading = ref(true)
const selectedGroup = ref(null)
const isShowOrderRegisteration = ref(false)
const cartItems = ref([])
const cartToppings = ref({})
const showToppingModal = ref(false)
const selectedGoods = ref(null)
const selectedToppings = ref([])
const toppings = ref([])
const toppingLevels = ref([])
const toppingProducts = ref([])
const CheckClub = ref(false)
const HamiClubUserData = ref()
const discount = ref(0)
const orderType = ref(null)
const isProcessing = ref(false)
const isCartCollapsed = ref(false)
const currencyUnit = ref(null)
const categoriesContainer = ref(null);
const goodsContainer = ref(null);
const checkIsSalon = ref(false)
const checkIsTakeAway = ref(false)
const CountOfConnections = ref(0);
const isShowTable = ref(false)
const selectedTableId = ref(0);
const tableSelectionRequired = ref(false);
const keepSalonTableOpenAfterSubmit = ref(false);
const showOrderTypeSelector = ref(false);
const orderTypeConfigError = ref(false);
const IsShowDiscountCartField = ref(false);
const HaveStockLicense = ref(false);

const goodsDiscountProducts = ref([])
const goodsDiscountCustomers = ref([])

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

const cartPanelRef = ref(null)

const emitter = inject('emitter');

// دریافت زمان حال
const now = useNow({ interval: 60000 });

// محاسبات
const currency = computed(() => currencyUnit.value ? "ریال" : "تومان")
const count = computed(() => cartItems.value?.length || 0)
const activeTables = computed(() => tables.value.filter(table => table && table.IsActive !== false));
const shouldUseTableSelection = computed(() =>
  orderType.value === "2" &&
  (isShowTable.value || tableSelectionRequired.value || keepSalonTableOpenAfterSubmit.value)
);
const keepTableOpenForSubmit = computed(() =>
  orderType.value === "2" && keepSalonTableOpenAfterSubmit.value
);
const requiresTableSelection = computed(() =>
  orderType.value === "2" &&
  (tableSelectionRequired.value || keepTableOpenForSubmit.value)
);
const canCheckout = computed(() =>
  Boolean(orderType.value) &&
  !orderTypeConfigError.value &&
  !isProcessing.value &&
  (!requiresTableSelection.value || Number(selectedTableId.value) > 0)
);

const filteredGoods = computed(() => {
  const currentDay = now.value.getDay();
  const currentTime = now.value.getHours() * 100 + now.value.getMinutes();

  if (!selectedGroup.value) {
    return goods.value.filter(item => isItemAvailableNow(item, currentDay, currentTime) && item.IsActive);
  }

  return goods.value.filter(item =>
    Number(item.GoodsGroupId) === Number(selectedGroup.value.GroupId) &&
    isItemAvailableNow(item, currentDay, currentTime) &&
    item.IsActive === true
  );
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
  } else {
    toast.error(result.message || 'اعتبار صفر است');
  }
}

// توابع بررسی اعتبار مشتری
function updateCreditUsage() {
  if (!useCredit.value) {
    creditAmount.value = 0;
  } else {
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
    } else {
      // اگر مجموع نقدی و کارتخوان از مبلغ فاکتور بیشتر شد
      const excess = Math.abs(remaining);

      if (Number(cashAmount.value) >= excess) {
        cashAmount.value = Number(cashAmount.value) - excess;
      } else {
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
  if (orderType.value !== "3") return 0;

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
  loading.value = true
  isShowOrderRegisteration.value = OrderRegistrationStat()
  CheckClub.value = IsClubStat()
  currencyUnit.value = getCurrency()
  checkIsSalon.value = IsSalonOrderStat()
  checkIsTakeAway.value = IsTakeAwayOrderStat()
  isShowTable.value = IsShowTables()
  tableSelectionRequired.value = IsTableSelectionRequired()
  keepSalonTableOpenAfterSubmit.value = KeepSalonTableOpenAfterSubmit()
  showOrderTypeSelector.value = ShowKioskOrderTypeSelector()
  IsShowDiscountCartField.value = IsShowDiscountCart()
  HaveStockLicense.value = await checkStockLicense()

  setInitialOrderType()
  if (orderTypeConfigError.value) {
    toast.error('نوع سفارش را اصلاح کنید');
  }

  emitter.on('cart-updated', updateCart);
  updateCart();

  // بررسی بسته یا باز بودن سبد خرید به صورت پیش فرض
  isCartCollapsed.value = await GetIsCollapseCart()

  // بارگذاری اطلاعات کالاها و ...
  await loadData(props.connectionId)
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
    ])

    groups.value = Array.isArray(categoryData) ? categoryData : categoryData?.GoodsGroup || []
    goods.value = Array.isArray(goodsData) ? goodsData : Object.values(goodsData)
    toppings.value = toppingData || []
    toppingLevels.value = levelData || []
    toppingProducts.value = productData || []
    cartItems.value = Array.isArray(cartData) ? cartData : []
    cartToppings.value = toppingsData && typeof toppingsData === 'object' && !Array.isArray(toppingsData)
      ? JSON.parse(JSON.stringify(toppingsData))
      : {}
    tables.value = normalizeTables(tableData)
    goodsDiscounts.value = Array.isArray(discountData) ? discountData : []
    goodsDiscountProducts.value = Array.isArray(discountProductData) ? discountProductData : []
    goodsDiscountCustomers.value = Array.isArray(discountCustomerData) ? discountCustomerData : []

  } catch (error) {
    console.error('خطا در دریافت داده:', error)
    toast.error('خطا در دریافت داده')
  } finally {
    loading.value = false
  }
})

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
  filteredGoods.value = goods.value.filter(item =>
    Number(item.GoodsGroupId) === Number(group.GroupId)
  );

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
        } else {
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
    return `/img/groups/${groupId}.png?v=${version}`
  } else {
    return `/img/groups_${props.connectionId}/${groupId}.png?v=${version}`
  }
}

function getGoodsImage(goodsId) {
  const version = new Date().toISOString().slice(0, 16).replace(/[^0-9]/g, "");

  if (props.connectionId == 0) {
    return `/img/goods/${goodsId}.png?v=${version}`
  } else {
    return `/img/goods_${props.connectionId}/${goodsId}.png?v=${version}`
  }
}

function handleImageError(event) {
  event.target.src = event.target.className.includes('group')
    ? '/img/groups/default.png'
    : '/img/goods/default.png'
}

// توابع سبد خرید (همانند قبل)
async function addToCart(item) {
  if (hasToppings(item)) {
    showToppingsModal(item)
  } else {
    const existingItemIndex = cartItems.value.findIndex(
      cartItem => cartItem.item.GoodsId === item.GoodsId
    )

    if (existingItemIndex >= 0) {
      cartItems.value[existingItemIndex].quantity++
      // اضافه کردن هایلایت موقت
      cartItems.value[existingItemIndex].highlight = true
      setTimeout(() => {
        cartItems.value[existingItemIndex].highlight = false
      }, 2000)
    } else {
      const newItem = {
        id: Date.now().toString(),
        item: JSON.parse(JSON.stringify(item)),
        quantity: 1,
        highlight: true // اضافه کردن پرچم هایلایت
      }
      cartItems.value.push(newItem)
      setTimeout(() => {
        newItem.highlight = false
      }, 2000)
    }
    saveCart()
  }
  clearCustomerDiscountState();
}

async function removeFromCart(index) {
  const cartItem = cartItems.value[index]
  await removeToppingsFromCartItem(cartItem.id)
  cartItems.value.splice(index, 1)
  await saveCart()
}

// سایر توابع سبد خرید و تاپینگ‌ها همانند قبل

function toggleCartCollapse() {
  isCartCollapsed.value = !isCartCollapsed.value
}

function resetCart() {
  cartItems.value = []
  cartToppings.value = {}
  discount.value = 0;
  HamiClubUserData.value = null
  selectedTableId.value = 0
  selectedDiscountCard.value = null
  discountCart.value = ''
  saveCart()
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
    if (taxableAmount <= 0) return total;

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
  } else {
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
    } else {
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
  } catch (error) {
    console.error('خطا در ذخیره سبد خرید:', error);
  }
}

////////////////////////////////////////////////////////

// تابع برای تبدیل Proxyها به شیء ساده و حذف فیلدهای غیرضروری
function deepToRaw(obj) {
  if (!obj || typeof obj !== 'object') return obj;

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
    if (key === 'applicableItems' || key === '_handler' || key === '_isReadonly') continue;

    // فیلدهای دیگر را پردازش می‌کنیم
    result[key] = deepToRaw(rawObj[key]);
  }
  return result;
}

// آماده‌سازی customerData
const prepareCustomerData = (data) => {
  if (!data) return null;
  return deepToRaw(data);
};

function normalizeTables(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
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
  if (checkIsSalon.value === true && checkIsTakeAway.value === false) return "2";
  if (checkIsTakeAway.value === true && checkIsSalon.value === false) return "3";
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
    } else if (paymentMethod.value === 'credit') {
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

    } else if (paymentMethod.value === 'pos') {
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

  } catch (err) {
    console.error('خطا در checkout:', err);
    toast.error('خطا در پرداخت یا ثبت فاکتور');
  } finally {
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
    if (item.item.GoodsId !== selectedGoods.value.GoodsId) return false;

    const itemToppings = getToppingsForCartItem(item.id);
    if (itemToppings.length !== toppingsToSave.length) return false;

    // مقایسه تاپینگ‌ها
    return itemToppings.every(t1 =>
      toppingsToSave.some(t2 =>
        t1.ToppingProductId === t2.ToppingProductId && t1.Count === t2.Count
      )
    );
  });

  if (existingItemIndex >= 0) {
    cartItems.value[existingItemIndex].quantity++;
    // اضافه کردن هایلایت موقت
    cartItems.value[existingItemIndex].highlight = true
    setTimeout(() => {
      cartItems.value[existingItemIndex].highlight = false
    }, 2000)
  } else {
    const newItem = {
      id: cartItemId,
      item: JSON.parse(JSON.stringify(selectedGoods.value)),
      quantity: 1,
      highlight: true // اضافه کردن پرچم هایلایت
    }
    cartItems.value.push(newItem)
    setTimeout(() => {
      newItem.highlight = false
    }, 2000)
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
  if (!item || !toppings.value || !toppingLevels.value) return [];

  // دریافت لول‌های مرتبط با این کالا
  const goodsToppingLevels = [...new Set(
    toppings.value
      .filter(t => t.GoodsId === item.GoodsId)
      .map(t => t.LevelId)
  )];

  return toppingLevels.value
    .filter(level => goodsToppingLevels.includes(level.LevelId))
    .sort((a, b) => a.Priority - b.Priority
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


function isLocalDiscountActive(discountRow) {
  if (!discountRow || discountRow.IsActive === false || discountRow.CanUse === false) return false;

  const d = new Date();
  const today = convertPersianDigitsToEnglish(d.toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }));

  const startDate = discountRow.StartDate || discountRow.FromDate;
  const endDate = discountRow.EndDate || discountRow.ToDate || discountRow.ExpireDate;
  if ((startDate || endDate) && !isDateInRange(today, startDate, endDate)) return false;

  const currentTime = d.getHours() * 100 + d.getMinutes();
  const fromTime = convertTimeToNumberDis(discountRow.StartTime || discountRow.FromTime);
  const toTime = convertTimeToNumberDis(discountRow.EndTime || discountRow.ToTime);
  if (fromTime && currentTime < fromTime) return false;
  if (toTime && currentTime > toTime) return false;

  return true;
}


function convertTimeToNumberDis(timeStr) {
  if (!timeStr) return 0;
  const cleaned = String(timeStr).replace(/\D/g, '');
  if (!cleaned) return 0;
  if (cleaned.length <= 2) return Number(cleaned) * 100;
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
  if (start < 0) return [];

  const valueStart = start + marker.length;
  const end = text.indexOf(']', valueStart);
  if (end < 0) return [];

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

  return Array.from(new Set(
    values
      .map(value => Number(value))
      .filter(id => Number.isFinite(id) && id > 0)
  ));
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
  if (customerIds.length === 0) return true;

  const selectedIds = selectedKioskCustomerIds();
  if (selectedIds.length === 0) return false;

  return selectedIds.some(id => customerIds.includes(id));
}

function isItemEligibleForLocalDiscount(cartItem, discountRow, products) {
  const useForAll = discountRow?.UseForAll === true || discountRow?.ApplyToAllGoods === true || products.length === 0;
  if (useForAll) return true;

  return products.some(dp =>
    Number(dp.ProductCode ?? dp.GoodsId ?? dp.Goodsid) === Number(cartItem.item.GoodsId) ||
    String(dp.ProductCode ?? '') === String(cartItem.item.GoodsCode ?? '')
  );
}

function calculateLocalDiscountAmount(discountRow, amount) {
  const base = Number(amount || 0);
  if (base <= 0) return 0;

  const minBuy = Number(discountRow?.MinBuy ?? discountRow?.MinInvoiceAmount ?? 0);
  if (minBuy > 0 && base < minBuy) return 0;

  let value = 0;
  if (isPercentDiscountType(discountRow?.DiscountType)) {
    value = base * (normalizeDiscountValue(discountRow) / 100);
  } else {
    value = Math.min(normalizeDiscountValue(discountRow), base);
  }

  const maxDiscount = Number(discountRow?.DiscountMax ?? discountRow?.MaxDiscountAmount ?? 0);
  if (maxDiscount > 0) value = Math.min(value, maxDiscount);
  return Math.max(0, Math.round(value));
}

const autoGoodsDiscount = computed(() => {
  if (!Array.isArray(goodsDiscounts.value) || goodsDiscounts.value.length === 0 || cartItems.value.length === 0) {
    return { amount: 0, discount: null };
  }

  let best = { amount: 0, discount: null };

  for (const discountRow of goodsDiscounts.value) {
    if (!isLocalDiscountActive(discountRow)) continue;
    if (!isLocalDiscountForSelectedCustomer(discountRow)) continue;

    const products = localDiscountProducts(discountRow);
    const applicableItems = cartItems.value.filter(item => isItemEligibleForLocalDiscount(item, discountRow, products));
    if (!applicableItems.length) continue;

    const applicableBase = applicableItems.reduce((sum, item) => sum + lineBaseAmount(item), 0);
    const amount = calculateLocalDiscountAmount(discountRow, applicableBase);

    if (amount > best.amount) best = { amount, discount: discountRow };
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
  if (!data || typeof data !== 'object') return null;
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
          if (discountAmount > 0) {
            toast.success(`تخفیف ${bestDiscount.CodeTitle || ''} به مبلغ ${discountAmount.toLocaleString()} ${currency.value} اعمال شد`);
          } else {
            toast.success('تخفیفی با توجه به اقلام شما یافت نشد');
          }
        }
      }
      HamiClubUserData.value = userData;
      return;
    }

  } catch (error) {
    console.error('Error in getHamiClubDetails:', error);
    toast.error('خطایی در پردازش اطلاعات رخ داد');
  } finally {
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
      const isApplicable = useForAll || products.some(p =>
        Number(p.ProductCode ?? p.GoodsId ?? p.Goodsid) === Number(item.item.GoodsId) ||
        String(p.ProductCode ?? '') === String(item.item.GoodsCode ?? '')
      );
      if (isApplicable) totalApplicablePrice += lineBaseAmount(item);
      return isApplicable;
    });

    if (applicableItems.length === 0) return null;

    return {
      ...discountRow,
      applicableItems,
      totalApplicablePrice,
      discountValue: calculateDiscountValue(discountRow, totalApplicablePrice)
    };
  }).filter(Boolean);

  if (applicableDiscounts.length === 0) return null;

  return applicableDiscounts.reduce((best, current) =>
    current.discountValue > best.discountValue ? current : best
  );
}

function calculateDiscountValue(discount, price) {
  const safePrice = Number(price || 0);
  if (!discount || safePrice <= 0) return 0;

  const minBuy = Number(discount.MinBuy ?? discount.MinInvoiceAmount ?? 0);
  if (minBuy > 0 && safePrice < minBuy) return 0;

  let amount = 0;
  if (isPercentDiscountType(discount.DiscountType)) {
    amount = safePrice * (normalizeDiscountValue(discount) / 100);
  } else {
    amount = Math.min(normalizeDiscountValue(discount), safePrice);
  }

  const maxDiscount = Number(discount.DiscountMax ?? discount.MaxDiscountAmount ?? 0);
  if (maxDiscount > 0) amount = Math.min(amount, maxDiscount);
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
    const isApplicable = useForAll || applicableProducts.some(dp =>
      Number(dp.ProductCode ?? dp.GoodsId ?? dp.Goodsid) === Number(item.item.GoodsId) ||
      String(dp.ProductCode ?? '') === String(item.item.GoodsCode ?? '')
    );
    if (isApplicable) totalApplicablePrice += lineBaseAmount(item);
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


function handleBack() {
  if (CountOfConnections.value > 1) {
    if (isShowOrderRegisteration) {
      emit('back')
    } // فقط اگر چند کانکشن داریم برگردیم
  } else {
    if (isShowOrderRegisteration) {
      emit('go-to-main')
    }
    // اگر یک کانکشن داریم یا در حالت scale هستیم، به صفحه اصلی برو    
  }
}

const emit = defineEmits(['back', 'go-to-main'])


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
  if (!item[currentDayName]) return false;

  // تبدیل زمان‌های شروع و پایان به فرمت عددی
  const fromTime = convertTimeToNumber(item[`FromTime${currentDayName}`]);
  const toTime = convertTimeToNumber(item[`ToTime${currentDayName}`]);

  // بررسی بازه زمانی
  return currentTime >= fromTime && currentTime <= toTime;
}

function convertTimeToNumber(timeStr) {
  if (!timeStr) return 0;
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
      Swal.fire(
        'پاک شد!',
        'سبد خرید شما با موفقیت پاک شد.',
        'success'
      )
    }
  })
}

function confirmBack() {
  if (cartItems.value.length <= 0) {
    handleBack();
  } else {
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
    })
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
    ])

    const [categories, goods, toppings, toppingLevels, toppingProducts, tables, discountsResponse] = await Promise.all([
      fetchCategories(conId).then(res => res.GoodsGroup || res),
      fetchGoods(conId).then(res => res.Goods || res),
      fetchToppings(conId).then(res => res.Goods || res),
      fetchToppingLevels(conId).then(res => res.ToppingLevel || res),
      fetchToppingProducts(conId).then(res => res.ToppingGoods || res),
      fetchTables(conId).then(res => normalizeTables(res)).catch(() => []),
      fetchGoodsDiscounts(conId).catch(() => ({ Discounts: [], DiscountProducts: [], CustomerDiscountProductsList: [], DiscountCustomers: [], CustomerDiscountCustomersList: [] }))
    ])

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
    ])
  } catch (error) {
    console.error("خطا در بارگذاری اطلاعات:", error)
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
  } else if (key === '{enter}') {
    showKeyboard3.value = false;
  } else {
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
  } else if (key === '{enter}') {
    showKeyboard4.value = false;
  } else {
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
  } else if (key === '{enter}') {
    showKeyboard5.value = false;
  } else {
    const num = Number(key);
    const newValue = creditAmount.value * 10 + num;

    // بررسی که مبلغ جدید از اعتبار مشتری بیشتر نباشد
    if (newValue <= customerCredit.value) {
      creditAmount.value = newValue;
    } else {
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
    } else if (discountCartData.Price > 0) {
      totalDiscountAmount = Math.min(discountCartData.Price, totalApplicablePrice);
    } else {
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

  } catch (error) {
    console.error('Error in CheckDiscountCart:', error);
    toast.error('خطایی در پردازش کارت تخفیف رخ داد');
  } finally {
    showKeyboard2.value = false;
    showKeyboard3.value = false;
    showKeyboard4.value = false;
    showKeyboard5.value = false;
    showKeyboard.value = false;
  }
}

function flyToCart(event) {
  const img = event?.currentTarget?.querySelector?.('img.goods-image')
  const cartEl = cartPanelRef.value
  if (!img || !cartEl) return

  const imgRect = img.getBoundingClientRect()
  const cartRect = cartEl.getBoundingClientRect()

  const clone = img.cloneNode(true)
  clone.classList.add('fly-clone')

  clone.style.left = imgRect.left + 'px'
  clone.style.top = imgRect.top + 'px'
  clone.style.width = imgRect.width + 'px'
  clone.style.height = imgRect.height + 'px'

  document.body.appendChild(clone)

  // مقصد: وسط سبد خرید (می‌تونی دقیق‌ترش کنی)
  const targetX = cartRect.left + cartRect.width * 0.15
  const targetY = cartRect.top + cartRect.height * 0.35

  requestAnimationFrame(() => {
    clone.style.transform = `translate(${targetX - imgRect.left}px, ${targetY - imgRect.top}px) scale(0.2)`
    clone.style.opacity = '0.2'
  })

  clone.addEventListener('transitionend', () => clone.remove(), { once: true })
}

// wrapper: اول انیمیشن بعد addToCart اصلی شما
async function addToCartWithFly(event, item) {
  // اگر تاپینگ داشت، اول مودال (پرتاب نکنیم)
  if (hasToppings(item)) {
    showToppingsModal(item)
    return
  }

  flyToCart(event)
  await addToCart(item)
}


/// فانکشن های کیبورد مجازی

// تنظیمات کیبورد مجازی

const hideKeyboardPager = () => {
  showKeyboard.value = false;
};


</script>