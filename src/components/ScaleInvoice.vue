<template>
  <!-- Made By Amirreza Foroutan For HamiPOS +989120496824-->
  <div class="scale-invoice-container" @click="handleContainerClick">
    <div class="branch-logo">
      <img src="/img/branchlogo.png" alt="Branch Logo">
    </div>
    <div class="barcode-input-container">
      <button class="reset-barcode" @click="resetbarcode" title="پاک کردن فیلد بارکد">
        <i class="fa fa-refresh" style="font-size:30px;color:red"></i>
      </button>
      <input type="text" v-model="barcode" @keyup.enter="fetchInvoice" placeholder="بارکد فاکتور را وارد کنید"
        id="txtBarcodeInput" ref="barcodeInput" autofocus />
      <button @click="fetchInvoice" class="fetch-button">
        دریافت فاکتور
      </button>
      <button @click="$emit('back')" v-if="ShowOrderRegisteration" class="back-button">
        بازگشت
      </button>
    </div>

    <div v-if="loading" class="loading">
      <div class="loader"></div>
      <div>در حال دریافت اطلاعات فاکتور...</div>
    </div>

    <div v-if="invoiceItems.length > 0" class="invoice-items">
      <h3>اقلام فاکتور:</h3>
      <table class="invoice-item">
        <thead>
          <tr>
            <th>نام کالا</th>
            <th>فی</th>
            <th>مقدار</th>
            <th>جمع</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in invoiceItems" :key="index">
            <td>{{ item.ProductName }}</td>
            <td>{{ formatPrice(item.Price) }} {{ curreny }}</td>
            <td>{{ item.Quantity }}</td>
            <td>{{ formatPrice(item.GoodsSumItem) }} {{ curreny }}</td>
          </tr>
        </tbody>
      </table>
      <div class="total-price">
        مجموع: {{ formatPrice(totalPrice) }} {{ curreny }} <br>
        مالیات: {{ formatPrice(totalTax) }} {{ curreny }} <br>
        مبلغ قابل پرداخت: {{ formatPrice(payable) }} {{ curreny }}
      </div>
      <button @click="processPayment" class="pay-button">
        پرداخت
      </button>
    </div>
  </div>

  <div id="loader-overlay" style="display: none;">
    <div class="loader-pay">
      <div class="spinner-pay"></div>
      <p>منتظر پاسخ از دستگاه پوز...</p>
    </div>
  </div>
  <div class="flasher-container">
    <label>"جهت مشاهده و تسویه فاکتور، کارت یا بارکد خود را مقابل پویشگر قرار دهید"</label>
    <div class="animated-arrow-container" v-if="!invoiceItems.length">
      <svg class="animated-arrow" width="580" height="180" viewBox="0 0 24 24" fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path d="M14 5L21 12M21 12L14 19M21 12H3" stroke="#ff5722" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round" />
      </svg>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { getScaleInvoice, sendToPOS, sendInvoicescale, fetchScaleCategories, fetchScaleGoods, sendInvoice } from '../services/apiService';
import { getData, removeData, saveData } from '../services/storageService';
import { getCurrency, GetIsAutoPayInScale, GetIsMultiInvoiceInScale, OrderRegistrationStat } from '../utilities';
import { useToast } from 'vue-toastification'

const barcode = ref('');
const invoiceItems = ref([]);
const loading = ref(false);
const loadingPOS = ref(false);
const error = ref('');
const barcodeInput = ref(null);
const groups = ref([])
const goods = ref([])
const IsAutoPay = ref(false)
const IsMultiInvoice = ref(false)
const ShowOrderRegisteration = ref(false)

const toast = useToast()
//بررسی ارز مالی
const currencyUnit = ref(null)
const curreny = computed(() => {
  return currencyUnit.value ? "ریال" : "تومان";
});
const props = 0;

onMounted(async () => {
  currencyUnit.value = await getCurrency();
  ShowOrderRegisteration.value = await OrderRegistrationStat()

  if (barcodeInput.value) {
    barcodeInput.value.focus();
  }

  IsAutoPay.value = await GetIsAutoPayInScale()
  IsMultiInvoice.value = await GetIsMultiInvoiceInScale()

  await loadData(0)

  try {
    const [categoryData, goodsData] = await Promise.all([
      getData('category'),
      getData('goods')
    ])

    groups.value = Array.isArray(categoryData) ? categoryData : categoryData?.GoodsGroup || []
    goods.value = Array.isArray(goodsData) ? goodsData : Object.values(goodsData)
  } catch (error) {
    console.error('خطا در دریافت داده:', error)
    toast.error('خطا در دریافت داده')
  }

  document.addEventListener('touchstart', handleContainerClick, { passive: true });
});

onUnmounted(() => {
  document.removeEventListener('touchstart', handleContainerClick);
});

//جمع ایتم ها
const totalPrice = computed(() => {
  return invoiceItems.value.reduce((sum, item) => sum + (item.Price * item.Quantity), 0);
});

// مبلغ مالیات
const totalTax = computed(() => {
  return invoiceItems.value.reduce((total, cartItem) => {
    const itemTotal = cartItem.Price * cartItem.Quantity;
    const taxes = itemTotal * (cartItem.GoodsTax / 100);

    return total + taxes;
  }, 0);
});

// جمع فاکتور
const payable = computed(() => {
  return invoiceItems.value.reduce((total, cartItem) => {
    const itemTotal = cartItem.Price * cartItem.Quantity;
    const taxes = itemTotal * (cartItem.GoodsTax / 100);

    return total + taxes + itemTotal;
  }, 0);
});

async function fetchInvoice() {
  if (!barcode.value.trim()) {
    toast.error('لطفاً بارکد فاکتور را وارد کنید');
    error.value = 'لطفاً بارکد فاکتور را وارد کنید';
    barcodeInput.value.focus()
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    const response = await getScaleInvoice(barcode.value);

    if (response && response.status && response.items) {
      // تطبیق با کالاهای موجود در سیستم
      const allGoods = await getData('goods');

      // پردازش آیتم‌های دریافتی از سرور
      const processedItems = response.items.map(item => {
        const matchedGood = allGoods.find(g => g.GoodsCode === item.PluId);

        if (!matchedGood) {
          toast.error(`کالای با کد ${item.PluId} یافت نشد!`);
        }

        return {
          PluId: item.PluId,
          ProductId: matchedGood?.GoodsId || null,
          ProductName: matchedGood ? matchedGood.GoodsName : `کالای ناشناخته (${item.PluId})`,
          Price: matchedGood ? matchedGood.GoodsPrice : 0,
          Quantity: item.Amount,
          GoodsTax: matchedGood ? matchedGood.TaxPercent + matchedGood.DutyPercent : 0,
          GoodsSumItem: item.Amount * (matchedGood?.GoodsPrice || 0)
        };
      });

      // منطق اضافه کردن یا جایگزینی بر اساس IsMultiInvoice
      if (IsMultiInvoice.value) {
        // حالت چند فاکتوری: آیتم‌ها به لیست موجود اضافه می‌شوند
        invoiceItems.value = [...invoiceItems.value, ...processedItems];
      } else {
        // حالت تک فاکتوری: لیست موجود جایگزین می‌شود
        invoiceItems.value = processedItems;
      }

    } else {
      toast.error(response?.message || 'فاکتوری با این بارکد یافت نشد');
      error.value = 'فاکتوری با این بارکد یافت نشد یا ساختار داده نامعتبر است';
    }
  } catch (err) {
    console.error('خطا در دریافت فاکتور:', err);
    toast.error('خطا در دریافت اطلاعات فاکتور');
    error.value = 'خطا در دریافت اطلاعات فاکتور';
  } finally {
    loading.value = false;
    if (IsAutoPay.value) {
      await processPayment();
    }
    barcodeInput.value?.select();
    barcodeInput.value.focus()
  }

  barcodeInput.value.focus()
}

async function processPayment() {
  if (invoiceItems.value.length === 0) return;
  const overlay = document.getElementById('loader-overlay');
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  loadingPOS.value = true;
  try {
    if (!currencyUnit) {
      payable.value = payable.value * 10;
    }
    const response = await sendToPOS(payable.value);
    if (response.status == 'ok') {
      toast.success('پرداخت با موفقیت انجام شد');
      const SendInvoiceFinall = {
        Items: invoiceItems.value,
        Tax: totalTax.value,
        SumItems: totalPrice.value,
        PayableAmount: payable.value,
        CurrencyName: curreny.value
      }
      const resultPrint = await sendInvoicescale(SendInvoiceFinall);
      if (resultPrint.status == true) {
        invoiceItems.value = [];
        barcode.value = '';
        barcodeInput.value.focus()
        overlay.style.display = 'none';
        document.body.style.overflow = 'auto';
      } else {
        toast.error('متاسفانه در چاپ فاکتور مشکلی بوجود آمده است، لطفا با مدیریت بررسی نمائید.');
        overlay.style.display = 'none';
        document.body.style.overflow = 'auto';
        return;
      }

    } else {
      toast.error(response.message || 'خطا در انجام پرداخت')
      error.value = response.message || 'خطا در انجام پرداخت';
    }
    barcodeInput.value.focus()
    overlay.style.display = 'none';
    document.body.style.overflow = 'auto';
  } catch (err) {
    console.error('خطا در پرداخت:', err);
    toast.error('خطا در انجام پرداخت')
    error.value = 'خطا در انجام پرداخت';
  } finally {
    loadingPOS.value = false;
    overlay.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
}

function formatPrice(price) {
  return new Intl.NumberFormat('fa-IR').format(price);
}

function resetbarcode() {
  barcode.value = '';
  barcodeInput.value.focus();
  invoiceItems.value = '';
}

async function loadData(conId) {

  try {
    await Promise.all([
      removeData('category'),
      removeData('goods')
    ])

    const [categories, goods, toppings, toppingLevels, toppingProducts] = await Promise.all([
      fetchScaleCategories(conId).then(res => res.GoodsGroup || res),
      fetchScaleGoods(conId).then(res => res.Goods || res)
    ])

    await Promise.all([
      saveData('category', categories),
      saveData('goods', goods)
    ])
  } catch (error) {
    console.error("خطا در بارگذاری اطلاعات:", error)
  }
}

function handleContainerClick(event) {
  // لیست کلاس‌های دکمه‌هایی که نمی‌خواهیم فوکوس کنند
  const excludedClasses = [
    'reset-barcode',
    'fetch-button',
    'back-button',
    'pay-button',
    'fa', // برای آیکون Font Awesome
    'fa-refresh' // آیکون خاص ریفرش
  ];

  // بررسی کنید که آیا المان کلیک شده یا والدینش یکی از دکمه‌های استثنا هستند
  const isExcluded = excludedClasses.some(className => {
    const closestElement = event.target.closest(`.${className}`);
    return closestElement !== null ||
      event.target.classList.contains(className) ||
      event.target.tagName === 'BUTTON';
  });

  if (!isExcluded && barcodeInput.value) {
    barcodeInput.value.focus();
  }
}
</script>
