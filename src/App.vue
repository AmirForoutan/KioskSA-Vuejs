<template>
  <!-- المان‌های ویدیو -->
  <div v-if="bootstrapped && viewModeCode !== 3 && showStandByVideo && !mobileAdminShortcutMode" id="click-counter"
    @click="handleClickCounterClick"></div>

  <div v-if="bootstrapped && viewModeCode !== 3 && showStandByVideo && !mobileAdminShortcutMode" id="video-container"
    v-show="isVideoPlaying" @click="handleBackgroundClick">
    <video src="/img/standby.mp4" id="fullscreen-video" ref="videoElement" @ended="restartVideo" muted loop playsinline
      webkit-playsinline x5-playsinline>
    </video>
  </div>

  <!-- محتوای اصلی برنامه -->
  <div v-if="bootstrapped && viewModeCode !== 3 && license && !mobileAdminShortcutMode" class="p-4">
    <!-- Made By Amirreza Foroutan For HamiPOS +989120496824 -->
    <div v-if="showModeSelection">
      <div class="images">
        <div class="image-top-right">
          <img src="/img/Icon/1.png" alt="Food Image">
        </div>
        <div class="image-top-left">
          <img src="/img/Icon/2.png" alt="Food Image">
        </div>
        <div class="image-bottom-left">
          <img src="/img/Icon/3.png" alt="Food Image">
        </div>
        <div class="image-bottom-right">
          <img src="/img/Icon/4.png" alt="Food Image">
        </div>
      </div>
      <div class="mode-selection">
        <button v-if="isScaleOrder" @click="selectMode('scale')" class="mode-button bg-green-500 text-white">
          تسویه فاکتور ترازو
        </button>
        <button v-if="isKioskOrder" @click="selectMode('order')" class="mode-button bg-blue-500 text-white">
          ثبت سفارش
        </button>
      </div>
    </div>

    <Suspense v-else-if="mode === 'order'">
      <template #default>
        <template v-if="!isLoading">
          <ConnectionGrid v-if="CountOfConnections > 1 && !selectedConnection" :connections="connectionList"
            @select="selectConnection" @back="resetMode" :is-showorderpanel-mode="showOrderPanel" />
          <Categories v-else :connectionId="selectedConnection?.id || 0" @back="handleCategoriesBack"
            @go-to-main="resetMode" ref="categoryListRef" />
        </template>
      </template>
      <template #fallback>
        <Loader />
      </template>
    </Suspense>

    <ScaleInvoice v-else-if="mode === 'scale'" @back="resetMode" />
    <Loader v-if="isLoading" />
  </div>

  <div v-if="bootstrapped && viewModeCode !== 3 && mobileAdminShortcutMode && !showAdminPanel"
    class="mobile-admin-shortcut" @click.stop="handleLogoClick">
    <img src="../src/assets/images/Logo-sm.png" alt="pargas Logo">
    <label>نرم افزار سفارشگیر پرگاس</label>
    <small>برای ورود به مدیریت، ۵ بار پشت سر هم لمس کنید</small>
  </div>

  <div v-if="bootstrapped && viewModeCode !== 3 && !license" id="error_license" class="error_license"
    @click.stop="handleLogoClick">
    <label>مجوزی برای شما یافت نشد، لطفا باز بودن سرویس یا داشتن لایسنس را بررسی بفرمائید</label>
  </div>

  <div v-if="bootstrapped && viewModeCode !== 3 && license && showModeSelection && !mobileAdminShortcutMode"
    class="hami_logo" @click.stop="handleLogoClick">
    <img src="../src/assets/images/Logo-sm.png" width="60px" alt="pargas Logo">
    <br>
    <label>نرم افزار سفارشگیر پرگاس</label>
  </div>

  <AdminImageUpload v-if="showAdminPanel" @close="showAdminPanel = false" />

  <RootView v-if="bootstrapped && viewModeCode === 3"></RootView>

  <!-- دکمه فعال‌سازی تمام‌صفحه -->
  <button v-if="bootstrapped && viewModeCode !== 3 && license && !isFullscreen && !isMobile && !mobileAdminShortcutMode"
    @click="enterFullscreen" style="position: fixed; bottom: 20px; right: 20px; z-index: 9999;">
    فعال‌سازی تمام‌صفحه
  </button>
</template>

<script setup>
import { onMounted, onUnmounted, nextTick, ref, provide, watch } from 'vue'
import { getKioskLicense } from './services/apiService'
import { getData, saveData } from './services/storageService'
import Loader from './components/Loader.vue'
import { defineAsyncComponent } from 'vue'
import { setupInactivityTimer } from './services/useInactivityTimer'
import { IsScaleOrderStat, IsKioskOrderStat, OrderRegistrationStat, initConfig, GetStandByTimer, GetResetTimer, GetViewMode, ShowStandByVideo } from './utilities'
import AdminImageUpload from './components/AdminImageUpload.vue'
import ConnectionGrid from './components/ConnectionGrid.vue'
import mitt from 'mitt';

const isLoading = ref(false)
const showModeSelection = ref(false)
const mode = ref(null)
const isScaleOrder = ref(false)
const showOrderPanel = ref(false)
const isKioskOrder = ref(false)
const license = ref(false)
const showAdminPanel = ref(false)
const CountOfConnections = ref(0);
const connectionList = ref([]);
const selectedConnection = ref(null);
const viewModeCode = ref(1);
const bootstrapped = ref(false);
const inactivityTimer = ref(null);
const categoryListRef = ref(null);
const isFullscreen = ref(false)
const mobileAdminShortcutMode = ref(false)

// متغیرهای مربوط به ویدیو در حالت بی‌فعالی
const isVideoPlaying = ref(false)
const idleTimer = ref(null)
const clickTimer = ref(null)
const clickCount = ref(0)
const IDLE_TIMEOUT = ref(0)
const REQUIRED_CLICKS = 10 // 10 کلیک
const CLICK_TIMEOUT = 3000 // 3 ثانیه
const videoElement = ref(null)
const videoPausedTime = ref(0)
const isMobile = ref(false)
const showStandByVideo = ref(false)

const emitter = mitt();
provide('emitter', emitter);

// استفاده از Media Query برای تشخیص موبایل
const setupMobileDetection = () => {
  const mediaQuery = window.matchMedia('(max-width: 768px)')

  const handleMediaChange = (e) => {
    isMobile.value = e.matches
  }

  // مقدار اولیه
  isMobile.value = mediaQuery.matches

  // گوش دادن به تغییرات
  mediaQuery.addEventListener('change', handleMediaChange)

  // تابع cleanup برای حذف listener
  return () => {
    mediaQuery.removeEventListener('change', handleMediaChange)
  }
}

const showFullscreenButton = ref(true)

const enterFullscreen = () => {
  document.documentElement.requestFullscreen()
}


// ایجاد state مرکزی برای سبد خرید
const cart = ref({
  items: [],
  toppings: {}
})

// فراهم کردن state برای کامپوننت‌های فرزند
provide('cart', cart)

// تابع برای به‌روزرسانی سبد خرید
async function updateCart() {
  try {
    const [cartData, toppingsData] = await Promise.all([
      getData('cart'),
      getData('cartToppings')
    ]);

    cart.value.items = Array.isArray(cartData) ? cartData : [];
    cart.value.toppings = toppingsData || {};
  } catch (error) {
    console.error('خطا در به‌روزرسانی سبد خرید:', error);
  }
}

onMounted(async () => {
  try {
    await initConfig()
    setupMobileDetection()
    viewModeCode.value = await GetViewMode();

    // لایسنس همیشه باید قبل از هر حالت دیگری بررسی شود
    const check = await getKioskLicense()
    if (check.status == true) {
      license.value = true
    } else {
      license.value = false
      mobileAdminShortcutMode.value = false
      showModeSelection.value = false
      mode.value = null
      bootstrapped.value = true
      return;
    }

    // اگر صفحه از موبایل باز شد، فقط میانبر ادمین را نشان بده و هیچ تایمر/ویدیو/صفحه سفارش را اجرا نکن
    if (viewModeCode.value !== 3 && isMobile.value) {
      mobileAdminShortcutMode.value = true
      showStandByVideo.value = false
      showModeSelection.value = false
      mode.value = null
      bootstrapped.value = true

      window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.altKey && e.shiftKey && e.key === 'A') {
          activateAdminPanel()
        }
      })

      return
    }

    await updateCart();
    IDLE_TIMEOUT.value = Number.parseInt(GetStandByTimer()) * 60000 // تبدیل به دقیقه

    // بررسی وضعیت‌ها
    showOrderPanel.value = await OrderRegistrationStat()
    isScaleOrder.value = await IsScaleOrderStat()
    isKioskOrder.value = await IsKioskOrderStat()
    showStandByVideo.value = ShowStandByVideo();
    bootstrapped.value = true;

    if (viewModeCode.value === 3) {
      showModeSelection.value = false
      license.value = true
      return
    }

    // استفاده از تایمر موجود برای پاک کردن سبد خرید و بازگشت به صفحه اصلی
    const timeout = await GetResetTimer() * 60000; // تبدیل به دقیقه
    inactivityTimer.value = await setupInactivityTimer(timeout, () => {
      resetMode(); // بازگشت به صفحه اصلی
    });
    inactivityTimer.value.start();

    // شروع مانیتورینگ برای نمایش ویدیو
    if (showStandByVideo.value) {
      startVideoMonitoring()
    }

    // دسترسی به پنل ادمین
    window.addEventListener('keydown', (e) => {
      // Ctrl+Alt+Shift+A برای باز کردن پنل ادمین
      if (e.ctrlKey && e.altKey && e.shiftKey && e.key === 'A') {
        activateAdminPanel()
      }
    })

    watch(() => cart.value, (newVal) => {
      // ذخیره تغییرات در localStorage
      saveData('cart', newVal.items);
      saveData('cartToppings', newVal.toppings);
    }, { deep: true });

    if (isScaleOrder.value == true && isKioskOrder.value == true) {
      showModeSelection.value = true
    } else {
      if (showOrderPanel.value == true) {
        showModeSelection.value = true
      } else {
        if (isScaleOrder.value == true) {
          mode.value = 'scale'
        } else {
          mode.value = 'order'
        }
      }
    }

    redirectView();

    document.addEventListener('fullscreenchange', () => {
      isFullscreen.value = !!document.fullscreenElement
    })

    // اگر PWA از قبل نصب شده
    if (window.matchMedia('(display-mode: standalone)').matches) {
      showFullscreenButton.value = true
    }
    // بقیه محدودیت‌ها (اختیاری)
    history.pushState(null, null, window.location.href)
    window.addEventListener('popstate', (e) => {
      history.pushState(null, null, window.location.href)
      e.preventDefault()
    })
    document.addEventListener('contextmenu', e => e.preventDefault())
    document.addEventListener('selectstart', e => e.preventDefault())
    document.addEventListener('keydown', e => {
      if (e.keyCode === 8 || (e.altKey && e.keyCode === 37)) {
        e.preventDefault()
      }
    })
    document.addEventListener('dragstart', e => e.preventDefault())
  } catch (error) {
    bootstrapped.value = true;
    console.error("خطا در بارگذاری تنظیمات:", error)
  }
})

onUnmounted(() => {
  if (inactivityTimer.value) {
    inactivityTimer.value.cleanup();
  }
  document.removeEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement
  })
});

// لودینگ غیرهمزمان کامپوننت‌ها
const Categories = defineAsyncComponent(() => {
  if (viewModeCode.value == 1) {
    return import('./components/ItemsList.vue')
  } else {
    return import('./components/CategoryList.vue')
  }
})

const RootView = defineAsyncComponent(() => {
  return import('./views/RootView.vue')
})

function redirectView() {
  if (viewModeCode.value === 3) {
    return import('./views/RootView.vue');
  }
}


const ScaleInvoice = defineAsyncComponent(() =>
  import('./components/ScaleInvoice.vue')
)

// مدیریت ویدیو در حالت بی‌فعالی
const startVideoMonitoring = () => {
  if (!showStandByVideo.value || mobileAdminShortcutMode.value) return
  resetIdleTimer()
  const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
  events.forEach(event => {
    document.addEventListener(event, handleUserActivity, { passive: true })
  })
}

const handleClickCounterClick = (e) => {
  e.stopPropagation()
  clickCount.value++
  console.log(clickCount.value)
  if (clickCount.value == REQUIRED_CLICKS) {
    exitFullscreen()
    resetClickCounter()
    return
  }

  clickTimer.value = setTimeout(resetClickCounter, CLICK_TIMEOUT)
}

const handleUserActivity = (e) => {
  if (mobileAdminShortcutMode.value) return
  // فقط فعالیت‌های مهم را پردازش کنیم
  if (e.type === 'mousemove' && e.movementX === 0 && e.movementY === 0) {
    return
  }

  if (isVideoPlaying.value) {
    hideVideo()
  } else {
    resetIdleTimer()
  }
}

const resetIdleTimer = () => {
  if (!showStandByVideo.value || mobileAdminShortcutMode.value) return
  clearTimeout(idleTimer.value)
  idleTimer.value = setTimeout(showVideo, IDLE_TIMEOUT.value)
}

const showVideo = async () => {
  if (!showStandByVideo.value || mobileAdminShortcutMode.value) return
  try {
    isVideoPlaying.value = true
    await nextTick()

    const video = document.getElementById('fullscreen-video');
    if (!video) return

    // اگر ویدئو قبلاً پخش شده بود، از همان نقطه ادامه دهد
    if (videoPausedTime.value > 0) {
      video.currentTime = videoPausedTime.value
    } else {
      video.currentTime = 0
    }

    await video.play()

    if (!document.fullscreenEnabled) {
      console.warn('حالت تمام‌صفحه پشتیبانی نمی‌شود')
      return
    }

    const videoContainer = document.getElementById('video-container')
    if (videoContainer) {
      videoContainer.style.display = 'flex';
      try {
        await videoContainer.requestFullscreen()
      } catch (err) {
        console.log('نمایش ویدئو بدون حالت تمام‌صفحه')
      }
    }
  } catch (error) {
    console.error('خطا در نمایش ویدئو:', error)
    hideVideo()
  }
}

const hideVideo = () => {
  if (!showStandByVideo.value) return
  const videoContainer = document.getElementById('video-container')
  if (videoContainer) videoContainer.style.display = 'none';
  const video = document.getElementById('fullscreen-video');
  if (video) {
    videoPausedTime.value = video.currentTime
    video.pause()
  }
  isVideoPlaying.value = false
  resetIdleTimer()
}

const exitFullscreen = () => {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(console.error)
  }
}

const restartVideo = () => {
  videoPausedTime.value = 0
  hideVideo()
}

const handleBackgroundClick = (e) => {
  e.stopPropagation()
}

const resetClickCounter = () => {
  clickCount.value = 0
}

// اضافه کردن این تابع برای فعال کردن پنل ادمین
function activateAdminPanel() {
  const adminKey = prompt('لطفا کلید مدیریتی را وارد کنید:')
  if (adminKey === 'pargas') {
    const licensediv = document.getElementById('error_license');
    if (licensediv) {
      licensediv.style.display = 'none'
    }
    showAdminPanel.value = true
    showModeSelection.value = false
    mode.value = null
  } else {
    alert('کلید مدیریتی نامعتبر است')
  }
}

function selectMode(selectedMode) {
  mode.value = selectedMode
  showModeSelection.value = false
}

async function resetMode() {
  if (mobileAdminShortcutMode.value) return

  await resetCart();

  // بررسی حالت Scale
  if (showOrderPanel.value) {// پاک کردن سبد خرید
    mode.value = null;
    showModeSelection.value = true;
  }
  else if (!isKioskOrder && isScaleOrder) {
    mode.value = 'scale';
  }
  else {
    // اگر حالت Scale نبود، بر اساس viewMode رفتار می‌کنیم
    if (viewModeCode.value == 1) {// پاک کردن سبد خرید
      // ویو مود 1: در همان صفحه می‌ماند
      mode.value = 'order';
      showModeSelection.value = false;
      emitter.emit('cart-updated');
    } else {// پاک کردن سبد خرید
      // ویو مود 2: به صفحه انتخاب دسته‌بندی‌ها برمی‌گردد
      mode.value = 'order';
      showModeSelection.value = false;
      selectedConnection.value = null;

      // ریست دسته‌بندی‌ها
      if (categoryListRef.value) {
        categoryListRef.value.resetCategories();
      }
    }
  }

  // ریست تایمر
  resetIdleTimer();
}

// تابع جدید برای پاک کردن سبد خرید
function resetCart() {
  cart.value.items = [];
  cart.value.toppings = {};
  saveData('cart', []);
  saveData('cartToppings', {});
}

// متغیرهای جدید
const logoClickCount = ref(0)
const logoClickTimer = ref(null)

// متد جدید برای مدیریت کلیک روی لوگو
const handleLogoClick = () => {
  logoClickCount.value++

  console.log(`تعداد کلیک‌ها روی لوگو: ${logoClickCount.value}`)

  // اگر تایمر فعال است، آن را ریست کنید
  if (logoClickTimer.value) {
    clearTimeout(logoClickTimer.value)
  }

  // تنظیم تایمر برای ریست شمارنده پس از 3 ثانیه (اختیاری)
  logoClickTimer.value = setTimeout(() => {
    logoClickCount.value = 0
  }, 3000)

  // اگر تعداد کلیک‌ها به ۵ رسید، پنل ادمین را فعال کنید
  if (logoClickCount.value === 5) {
    activateAdminPanel()
    logoClickCount.value = 0 // ریست شمارنده
  }
}

// برای نمایش چند کانکشن
const selectConnection = (connection) => {
  selectedConnection.value = connection;
  // ذخیره connection انتخاب شده در localStorage
  localStorage.setItem('selectedConnection', JSON.stringify(connection));
};

// در onMounted بعد از دریافت اتصال‌ها
const savedConnection = localStorage.getItem('selectedConnection');
if (savedConnection) {
  selectedConnection.value = JSON.parse(savedConnection);
}

// عملیات برگشت
function handleCategoriesBack() {
  if (CountOfConnections.value > 1) {
    selectedConnection.value = null
    localStorage.removeItem('selectedConnection')
  } else {
    resetMode()
  }
}
</script>

<style scoped>
.mobile-admin-shortcut {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  direction: rtl;
  text-align: center;
  background: linear-gradient(135deg, #f8fafc 0%, #eef4ff 55%, #fff7ed 100%);
  color: #0f172a;
  cursor: pointer;
  user-select: none;
}

.mobile-admin-shortcut img {
  width: 86px;
  max-width: 34vw;
  filter: drop-shadow(0 14px 26px rgba(15, 23, 42, 0.18));
}

.mobile-admin-shortcut label {
  font-size: clamp(20px, 6vw, 34px);
  font-weight: 1000;
  line-height: 1.6;
}

.mobile-admin-shortcut small {
  max-width: 320px;
  color: #64748b;
  font-size: clamp(13px, 3.8vw, 17px);
  font-weight: 800;
  line-height: 1.8;
}

:global(.hami_logo) {
  z-index: 200 !important;
  pointer-events: auto !important;
  cursor: pointer !important;
}
</style>
