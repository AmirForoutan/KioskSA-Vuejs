<template>
  <div>
    <!-- حالت نمایش دسته‌بندی‌ها -->
    <div v-if="!selectedGroup">
      <button @click="confirmBack" v-if="isScaleOrder || selectedGroup" class="back-button2">
        بازگشت
      </button>
      <button @click="confirmResetCart" v-if="hasItemsInCart != 0" class="back-button2">
        خالی کردن سبد خرید
      </button>
      <div v-if="loading">
        <div class="loader-container">
          <div class="loader"></div>
          <div class="loader-text">در حال بارگذاری ...</div>
        </div>
      </div>
      <div v-else class="groups-grid">
        <div v-for="group in groups" :key="group.GroupId" @click="selectGroup(group)" class="groups-item">
          <img :src="getGroupImage(group.GroupCode)" @error="handleImageError"
            class="w-full groupimage h-32 object-contain mb-2" :alt="group.GroupTitle" />
          <div class="text-lg div_font">{{ group.GroupName }}</div>
        </div>
      </div>
    </div>

    <!-- حالت نمایش کالاهای دسته‌بندی انتخاب شده -->
    <GoodsList v-else :group="selectedGroup" @go-back="selectedGroup = null" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, inject } from 'vue'
import { getData, removeData, saveData } from '../services/storageService'
import GoodsList from './GoodsList.vue'
import { IsScaleOrderStat, GetResetTimer } from '../utilities'
import { fetchCategories, fetchGoods, fetchToppingProducts, fetchToppings, fetchToppingLevels, GetCountBranches } from '../services/apiService'
import { useToast } from 'vue-toastification';
import Swal from 'sweetalert2';

const groups = ref([])
const goods = ref([])
const toppings = ref([])
const toppingLevels = ref([])
const toppingProducts = ref([])
const loading = ref(true)
const selectedGroup = ref(null)
const isScaleOrder = ref(false)
const CountOfConnections = ref(0);
const connectionList = ref([]);
const cart = inject('cart')
const cartItems = computed(() => cart?.value?.items || [])
const cartToppings = computed(() => cart?.value?.toppings || {})

// دریافت شعبه انتخاب شده
const props = defineProps({
  connectionId: {
    type: Number,
    default: 0
  }
});

const toast = useToast({
  position: 'top-right',
  style: {
    fontFamily: 'Vazirmatn-FD-Black'
  }
})

const hasItemsInCart = computed(() => {
  return cartItems.value.length > 0
})

const resetCategories = () => {
  selectedGroup.value = null;
};

// expose متد به parent
defineExpose({
  resetCategories
});

onMounted(async () => {
  loading.value = true
  isScaleOrder.value = IsScaleOrderStat()

  const GetConnections = await GetCountBranches();
  if (GetConnections.status) {
    CountOfConnections.value = GetConnections.Count;
    connectionList.value = Object.entries(GetConnections.Names).map(([id, name]) => ({
      id: Number(id),
      name
    }));
  }
  await loadData(props.connectionId)
  try {
    const [categoryData, goodsData, toppingData, levelData, productData, cartData, toppingsData] = await Promise.all([
      getData('category'),
      getData('goods'),
      getData('topping'),
      getData('toppinglevel'),
      getData('toppingproducts'),
      getData('cart'),
      getData('cartToppings')
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
  } catch (error) {
    console.error('خطا در دریافت داده:', error)
    toast.error('خطا در دریافت داده')
  } finally {
    loading.value = false
  }
})

const emit = defineEmits(['back', 'go-to-main'])

function handleBack() {
  if (CountOfConnections.value > 1) {
    if (!isScaleOrder) {
      emit('back')
    } // فقط اگر چند کانکشن داریم برگردیم
  } else {
    if (!isScaleOrder) {
      emit('go-to-main')
    }
    selectedGroup.value = null // برای حالت عادی
    // اگر یک کانکشن داریم یا در حالت scale هستیم، به صفحه اصلی برو    
  }
}

function getGroupImage(groupId) {
  const version = new Date().toISOString().slice(0, 16).replace(/[^0-9]/g, "");

  if (props.connectionId == 0) {
    return `/img/groups/${groupId}.png?v=${version}`
  } else {
    return `/img/groups_${props.connectionId}/${groupId}.png?v=${version}`
  }
}

function handleImageError(event) {
  event.target.src = event.target.className.includes('group')
    ? '/img/groups/default.png'
    : '/img/goods/default.png'
}

function selectGroup(group) {
  selectedGroup.value = group
}

// دریافت اطلاعات کالاها و دسته بندی ها
async function loadData(conId) {

  try {
    await Promise.all([
      removeData('category'),
      removeData('goods'),
      removeData('topping'),
      removeData('toppinglevel'),
      removeData('toppingproducts')
    ])

    const [categories, goods, toppings, toppingLevels, toppingProducts] = await Promise.all([
      fetchCategories(conId).then(res => res.GoodsGroup || res),
      fetchGoods(conId).then(res => res.Goods || res),
      fetchToppings(conId).then(res => res.ToppingGoods || res),
      fetchToppingLevels(conId).then(res => res.ToppingLevel || res),
      fetchToppingProducts(conId).then(res => res.Goods || res)
    ])

    await Promise.all([
      saveData('category', categories),
      saveData('goods', goods),
      saveData('topping', toppings),
      saveData('toppinglevel', toppingLevels),
      saveData('toppingproducts', toppingProducts)
    ])
  } catch (error) {
    console.error("خطا در بارگذاری اطلاعات:", error)
  }
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
        handleBack();
        resetCart();
      }
    })
  }
}

// پاک کردن سبد خرید
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
</script>