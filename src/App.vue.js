import { onMounted, onUnmounted, nextTick, ref, provide, watch } from 'vue';
import { getKioskLicense } from './services/apiService';
import { getData, saveData } from './services/storageService';
import Loader from './components/Loader.vue';
import { defineAsyncComponent } from 'vue';
import { setupInactivityTimer } from './services/useInactivityTimer';
import { IsScaleOrderStat, IsKioskOrderStat, OrderRegistrationStat, initConfig, GetStandByTimer, GetResetTimer, GetViewMode, ShowStandByVideo } from './utilities';
import AdminImageUpload from './components/AdminImageUpload.vue';
import ConnectionGrid from './components/ConnectionGrid.vue';
import mitt from 'mitt';
const isLoading = ref(false);
const showModeSelection = ref(false);
const mode = ref(null);
const isScaleOrder = ref(false);
const showOrderPanel = ref(false);
const isKioskOrder = ref(false);
const license = ref(false);
const showAdminPanel = ref(false);
const CountOfConnections = ref(0);
const connectionList = ref([]);
const selectedConnection = ref(null);
const viewModeCode = ref(1);
const bootstrapped = ref(false);
const inactivityTimer = ref(null);
const categoryListRef = ref(null);
const isFullscreen = ref(false);
const mobileAdminShortcutMode = ref(false);
// متغیرهای مربوط به ویدیو در حالت بی‌فعالی
const isVideoPlaying = ref(false);
const idleTimer = ref(null);
const clickTimer = ref(null);
const clickCount = ref(0);
const IDLE_TIMEOUT = ref(0);
const REQUIRED_CLICKS = 10; // 10 کلیک
const CLICK_TIMEOUT = 3000; // 3 ثانیه
const videoElement = ref(null);
const videoPausedTime = ref(0);
const isMobile = ref(false);
const showStandByVideo = ref(false);
const emitter = mitt();
provide('emitter', emitter);
// استفاده از Media Query برای تشخیص موبایل
const setupMobileDetection = () => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleMediaChange = (e) => {
        isMobile.value = e.matches;
    };
    // مقدار اولیه
    isMobile.value = mediaQuery.matches;
    // گوش دادن به تغییرات
    mediaQuery.addEventListener('change', handleMediaChange);
    // تابع cleanup برای حذف listener
    return () => {
        mediaQuery.removeEventListener('change', handleMediaChange);
    };
};
const showFullscreenButton = ref(true);
const enterFullscreen = () => {
    document.documentElement.requestFullscreen();
};
// ایجاد state مرکزی برای سبد خرید
const cart = ref({
    items: [],
    toppings: {}
});
// فراهم کردن state برای کامپوننت‌های فرزند
provide('cart', cart);
// تابع برای به‌روزرسانی سبد خرید
async function updateCart() {
    try {
        const [cartData, toppingsData] = await Promise.all([
            getData('cart'),
            getData('cartToppings')
        ]);
        cart.value.items = Array.isArray(cartData) ? cartData : [];
        cart.value.toppings = toppingsData || {};
    }
    catch (error) {
        console.error('خطا در به‌روزرسانی سبد خرید:', error);
    }
}
onMounted(async () => {
    try {
        await initConfig();
        setupMobileDetection();
        viewModeCode.value = await GetViewMode();
        // لایسنس همیشه باید قبل از هر حالت دیگری بررسی شود
        const check = await getKioskLicense();
        if (check.status == true) {
            license.value = true;
        }
        else {
            license.value = false;
            mobileAdminShortcutMode.value = false;
            showModeSelection.value = false;
            mode.value = null;
            bootstrapped.value = true;
            return;
        }
        // اگر صفحه از موبایل باز شد، فقط میانبر ادمین را نشان بده و هیچ تایمر/ویدیو/صفحه سفارش را اجرا نکن
        if (viewModeCode.value !== 3 && isMobile.value) {
            mobileAdminShortcutMode.value = true;
            showStandByVideo.value = false;
            showModeSelection.value = false;
            mode.value = null;
            bootstrapped.value = true;
            window.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.altKey && e.shiftKey && e.key === 'A') {
                    activateAdminPanel();
                }
            });
            return;
        }
        await updateCart();
        IDLE_TIMEOUT.value = Number.parseInt(GetStandByTimer()) * 60000; // تبدیل به دقیقه
        // بررسی وضعیت‌ها
        showOrderPanel.value = await OrderRegistrationStat();
        isScaleOrder.value = await IsScaleOrderStat();
        isKioskOrder.value = await IsKioskOrderStat();
        showStandByVideo.value = ShowStandByVideo();
        bootstrapped.value = true;
        if (viewModeCode.value === 3) {
            showModeSelection.value = false;
            license.value = true;
            return;
        }
        // استفاده از تایمر موجود برای پاک کردن سبد خرید و بازگشت به صفحه اصلی
        const timeout = await GetResetTimer() * 60000; // تبدیل به دقیقه
        inactivityTimer.value = await setupInactivityTimer(timeout, () => {
            resetMode(); // بازگشت به صفحه اصلی
        });
        inactivityTimer.value.start();
        // شروع مانیتورینگ برای نمایش ویدیو
        if (showStandByVideo.value) {
            startVideoMonitoring();
        }
        // دسترسی به پنل ادمین
        window.addEventListener('keydown', (e) => {
            // Ctrl+Alt+Shift+A برای باز کردن پنل ادمین
            if (e.ctrlKey && e.altKey && e.shiftKey && e.key === 'A') {
                activateAdminPanel();
            }
        });
        watch(() => cart.value, (newVal) => {
            // ذخیره تغییرات در localStorage
            saveData('cart', newVal.items);
            saveData('cartToppings', newVal.toppings);
        }, { deep: true });
        if (isScaleOrder.value == true && isKioskOrder.value == true) {
            showModeSelection.value = true;
        }
        else {
            if (showOrderPanel.value == true) {
                showModeSelection.value = true;
            }
            else {
                if (isScaleOrder.value == true) {
                    mode.value = 'scale';
                }
                else {
                    mode.value = 'order';
                }
            }
        }
        redirectView();
        document.addEventListener('fullscreenchange', () => {
            isFullscreen.value = !!document.fullscreenElement;
        });
        // اگر PWA از قبل نصب شده
        if (window.matchMedia('(display-mode: standalone)').matches) {
            showFullscreenButton.value = true;
        }
        // بقیه محدودیت‌ها (اختیاری)
        history.pushState(null, null, window.location.href);
        window.addEventListener('popstate', (e) => {
            history.pushState(null, null, window.location.href);
            e.preventDefault();
        });
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('selectstart', e => e.preventDefault());
        document.addEventListener('keydown', e => {
            if (e.keyCode === 8 || (e.altKey && e.keyCode === 37)) {
                e.preventDefault();
            }
        });
        document.addEventListener('dragstart', e => e.preventDefault());
    }
    catch (error) {
        bootstrapped.value = true;
        console.error("خطا در بارگذاری تنظیمات:", error);
    }
});
onUnmounted(() => {
    if (inactivityTimer.value) {
        inactivityTimer.value.cleanup();
    }
    document.removeEventListener('fullscreenchange', () => {
        isFullscreen.value = !!document.fullscreenElement;
    });
});
// لودینگ غیرهمزمان کامپوننت‌ها
const Categories = defineAsyncComponent(() => {
    if (viewModeCode.value == 1) {
        return import('./components/ItemsList.vue');
    }
    else {
        return import('./components/CategoryList.vue');
    }
});
const RootView = defineAsyncComponent(() => {
    return import('./views/RootView.vue');
});
function redirectView() {
    if (viewModeCode.value === 3) {
        return import('./views/RootView.vue');
    }
}
const ScaleInvoice = defineAsyncComponent(() => import('./components/ScaleInvoice.vue'));
// مدیریت ویدیو در حالت بی‌فعالی
const startVideoMonitoring = () => {
    if (!showStandByVideo.value || mobileAdminShortcutMode.value)
        return;
    resetIdleTimer();
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => {
        document.addEventListener(event, handleUserActivity, { passive: true });
    });
};
const handleClickCounterClick = (e) => {
    e.stopPropagation();
    clickCount.value++;
    console.log(clickCount.value);
    if (clickCount.value == REQUIRED_CLICKS) {
        exitFullscreen();
        resetClickCounter();
        return;
    }
    clickTimer.value = setTimeout(resetClickCounter, CLICK_TIMEOUT);
};
const handleUserActivity = (e) => {
    if (mobileAdminShortcutMode.value)
        return;
    // فقط فعالیت‌های مهم را پردازش کنیم
    if (e.type === 'mousemove' && e.movementX === 0 && e.movementY === 0) {
        return;
    }
    if (isVideoPlaying.value) {
        hideVideo();
    }
    else {
        resetIdleTimer();
    }
};
const resetIdleTimer = () => {
    if (!showStandByVideo.value || mobileAdminShortcutMode.value)
        return;
    clearTimeout(idleTimer.value);
    idleTimer.value = setTimeout(showVideo, IDLE_TIMEOUT.value);
};
const showVideo = async () => {
    if (!showStandByVideo.value || mobileAdminShortcutMode.value)
        return;
    try {
        isVideoPlaying.value = true;
        await nextTick();
        const video = document.getElementById('fullscreen-video');
        if (!video)
            return;
        // اگر ویدئو قبلاً پخش شده بود، از همان نقطه ادامه دهد
        if (videoPausedTime.value > 0) {
            video.currentTime = videoPausedTime.value;
        }
        else {
            video.currentTime = 0;
        }
        await video.play();
        if (!document.fullscreenEnabled) {
            console.warn('حالت تمام‌صفحه پشتیبانی نمی‌شود');
            return;
        }
        const videoContainer = document.getElementById('video-container');
        if (videoContainer) {
            videoContainer.style.display = 'flex';
            try {
                await videoContainer.requestFullscreen();
            }
            catch (err) {
                console.log('نمایش ویدئو بدون حالت تمام‌صفحه');
            }
        }
    }
    catch (error) {
        console.error('خطا در نمایش ویدئو:', error);
        hideVideo();
    }
};
const hideVideo = () => {
    if (!showStandByVideo.value)
        return;
    const videoContainer = document.getElementById('video-container');
    if (videoContainer)
        videoContainer.style.display = 'none';
    const video = document.getElementById('fullscreen-video');
    if (video) {
        videoPausedTime.value = video.currentTime;
        video.pause();
    }
    isVideoPlaying.value = false;
    resetIdleTimer();
};
const exitFullscreen = () => {
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.error);
    }
};
const restartVideo = () => {
    videoPausedTime.value = 0;
    hideVideo();
};
const handleBackgroundClick = (e) => {
    e.stopPropagation();
};
const resetClickCounter = () => {
    clickCount.value = 0;
};
// اضافه کردن این تابع برای فعال کردن پنل ادمین
function activateAdminPanel() {
    const adminKey = prompt('لطفا کلید مدیریتی را وارد کنید:');
    if (adminKey === 'pargas') {
        const licensediv = document.getElementById('error_license');
        if (licensediv) {
            licensediv.style.display = 'none';
        }
        showAdminPanel.value = true;
        showModeSelection.value = false;
        mode.value = null;
    }
    else {
        alert('کلید مدیریتی نامعتبر است');
    }
}
function selectMode(selectedMode) {
    mode.value = selectedMode;
    showModeSelection.value = false;
}
async function resetMode() {
    if (mobileAdminShortcutMode.value)
        return;
    await resetCart();
    // بررسی حالت Scale
    if (showOrderPanel.value) { // پاک کردن سبد خرید
        mode.value = null;
        showModeSelection.value = true;
    }
    else if (!isKioskOrder && isScaleOrder) {
        mode.value = 'scale';
    }
    else {
        // اگر حالت Scale نبود، بر اساس viewMode رفتار می‌کنیم
        if (viewModeCode.value == 1) { // پاک کردن سبد خرید
            // ویو مود 1: در همان صفحه می‌ماند
            mode.value = 'order';
            showModeSelection.value = false;
            emitter.emit('cart-updated');
        }
        else { // پاک کردن سبد خرید
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
const logoClickCount = ref(0);
const logoClickTimer = ref(null);
// متد جدید برای مدیریت کلیک روی لوگو
const handleLogoClick = () => {
    logoClickCount.value++;
    console.log(`تعداد کلیک‌ها روی لوگو: ${logoClickCount.value}`);
    // اگر تایمر فعال است، آن را ریست کنید
    if (logoClickTimer.value) {
        clearTimeout(logoClickTimer.value);
    }
    // تنظیم تایمر برای ریست شمارنده پس از 3 ثانیه (اختیاری)
    logoClickTimer.value = setTimeout(() => {
        logoClickCount.value = 0;
    }, 3000);
    // اگر تعداد کلیک‌ها به ۵ رسید، پنل ادمین را فعال کنید
    if (logoClickCount.value === 5) {
        activateAdminPanel();
        logoClickCount.value = 0; // ریست شمارنده
    }
};
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
        selectedConnection.value = null;
        localStorage.removeItem('selectedConnection');
    }
    else {
        resetMode();
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['mobile-admin-shortcut']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-admin-shortcut']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-admin-shortcut']} */ ;
// CSS variable injection 
// CSS variable injection end 
if (__VLS_ctx.bootstrapped && __VLS_ctx.viewModeCode !== 3 && __VLS_ctx.showStandByVideo && !__VLS_ctx.mobileAdminShortcutMode) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.handleClickCounterClick) },
        id: "click-counter",
    });
}
if (__VLS_ctx.bootstrapped && __VLS_ctx.viewModeCode !== 3 && __VLS_ctx.showStandByVideo && !__VLS_ctx.mobileAdminShortcutMode) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.handleBackgroundClick) },
        id: "video-container",
    });
    __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.isVideoPlaying) }, null, null);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
        ...{ onEnded: (__VLS_ctx.restartVideo) },
        src: "/img/standby.mp4",
        id: "fullscreen-video",
        ref: "videoElement",
        muted: true,
        loop: true,
        playsinline: true,
        'webkit-playsinline': true,
        'x5-playsinline': true,
    });
    /** @type {typeof __VLS_ctx.videoElement} */ ;
}
if (__VLS_ctx.bootstrapped && __VLS_ctx.viewModeCode !== 3 && __VLS_ctx.license && !__VLS_ctx.mobileAdminShortcutMode) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "p-4" },
    });
    if (__VLS_ctx.showModeSelection) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "images" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "image-top-right" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img, __VLS_intrinsicElements.img)({
            src: "/img/Icon/1.png",
            alt: "Food Image",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "image-top-left" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img, __VLS_intrinsicElements.img)({
            src: "/img/Icon/2.png",
            alt: "Food Image",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "image-bottom-left" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img, __VLS_intrinsicElements.img)({
            src: "/img/Icon/3.png",
            alt: "Food Image",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "image-bottom-right" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img, __VLS_intrinsicElements.img)({
            src: "/img/Icon/4.png",
            alt: "Food Image",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mode-selection" },
        });
        if (__VLS_ctx.isScaleOrder) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.bootstrapped && __VLS_ctx.viewModeCode !== 3 && __VLS_ctx.license && !__VLS_ctx.mobileAdminShortcutMode))
                            return;
                        if (!(__VLS_ctx.showModeSelection))
                            return;
                        if (!(__VLS_ctx.isScaleOrder))
                            return;
                        __VLS_ctx.selectMode('scale');
                    } },
                ...{ class: "mode-button bg-green-500 text-white" },
            });
        }
        if (__VLS_ctx.isKioskOrder) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.bootstrapped && __VLS_ctx.viewModeCode !== 3 && __VLS_ctx.license && !__VLS_ctx.mobileAdminShortcutMode))
                            return;
                        if (!(__VLS_ctx.showModeSelection))
                            return;
                        if (!(__VLS_ctx.isKioskOrder))
                            return;
                        __VLS_ctx.selectMode('order');
                    } },
                ...{ class: "mode-button bg-blue-500 text-white" },
            });
        }
    }
    else if (__VLS_ctx.mode === 'order') {
        const __VLS_0 = {}.Suspense;
        /** @type {[typeof __VLS_components.Suspense, typeof __VLS_components.Suspense, ]} */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
        const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
        __VLS_3.slots.default;
        {
            const { default: __VLS_thisSlot } = __VLS_3.slots;
            if (!__VLS_ctx.isLoading) {
                if (__VLS_ctx.CountOfConnections > 1 && !__VLS_ctx.selectedConnection) {
                    /** @type {[typeof ConnectionGrid, ]} */ ;
                    // @ts-ignore
                    const __VLS_4 = __VLS_asFunctionalComponent(ConnectionGrid, new ConnectionGrid({
                        ...{ 'onSelect': {} },
                        ...{ 'onBack': {} },
                        connections: (__VLS_ctx.connectionList),
                        isShoworderpanelMode: (__VLS_ctx.showOrderPanel),
                    }));
                    const __VLS_5 = __VLS_4({
                        ...{ 'onSelect': {} },
                        ...{ 'onBack': {} },
                        connections: (__VLS_ctx.connectionList),
                        isShoworderpanelMode: (__VLS_ctx.showOrderPanel),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_4));
                    let __VLS_7;
                    let __VLS_8;
                    let __VLS_9;
                    const __VLS_10 = {
                        onSelect: (__VLS_ctx.selectConnection)
                    };
                    const __VLS_11 = {
                        onBack: (__VLS_ctx.resetMode)
                    };
                    var __VLS_6;
                }
                else {
                    const __VLS_12 = {}.Categories;
                    /** @type {[typeof __VLS_components.Categories, ]} */ ;
                    // @ts-ignore
                    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
                        ...{ 'onBack': {} },
                        ...{ 'onGoToMain': {} },
                        connectionId: (__VLS_ctx.selectedConnection?.id || 0),
                        ref: "categoryListRef",
                    }));
                    const __VLS_14 = __VLS_13({
                        ...{ 'onBack': {} },
                        ...{ 'onGoToMain': {} },
                        connectionId: (__VLS_ctx.selectedConnection?.id || 0),
                        ref: "categoryListRef",
                    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
                    let __VLS_16;
                    let __VLS_17;
                    let __VLS_18;
                    const __VLS_19 = {
                        onBack: (__VLS_ctx.handleCategoriesBack)
                    };
                    const __VLS_20 = {
                        onGoToMain: (__VLS_ctx.resetMode)
                    };
                    /** @type {typeof __VLS_ctx.categoryListRef} */ ;
                    var __VLS_21 = {};
                    var __VLS_15;
                }
            }
        }
        {
            const { fallback: __VLS_thisSlot } = __VLS_3.slots;
            /** @type {[typeof Loader, ]} */ ;
            // @ts-ignore
            const __VLS_23 = __VLS_asFunctionalComponent(Loader, new Loader({}));
            const __VLS_24 = __VLS_23({}, ...__VLS_functionalComponentArgsRest(__VLS_23));
        }
        var __VLS_3;
    }
    else if (__VLS_ctx.mode === 'scale') {
        const __VLS_26 = {}.ScaleInvoice;
        /** @type {[typeof __VLS_components.ScaleInvoice, ]} */ ;
        // @ts-ignore
        const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({
            ...{ 'onBack': {} },
        }));
        const __VLS_28 = __VLS_27({
            ...{ 'onBack': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_27));
        let __VLS_30;
        let __VLS_31;
        let __VLS_32;
        const __VLS_33 = {
            onBack: (__VLS_ctx.resetMode)
        };
        var __VLS_29;
    }
    if (__VLS_ctx.isLoading) {
        /** @type {[typeof Loader, ]} */ ;
        // @ts-ignore
        const __VLS_34 = __VLS_asFunctionalComponent(Loader, new Loader({}));
        const __VLS_35 = __VLS_34({}, ...__VLS_functionalComponentArgsRest(__VLS_34));
    }
}
if (__VLS_ctx.bootstrapped && __VLS_ctx.viewModeCode !== 3 && __VLS_ctx.license && __VLS_ctx.mobileAdminShortcutMode && !__VLS_ctx.showAdminPanel) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.handleLogoClick) },
        ...{ class: "mobile-admin-shortcut" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img, __VLS_intrinsicElements.img)({
        src: "../src/assets/images/Logo-sm.png",
        alt: "pargas Logo",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
}
if (__VLS_ctx.bootstrapped && __VLS_ctx.viewModeCode !== 3 && !__VLS_ctx.license) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        id: "error_license",
        ...{ class: "error_license" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
}
if (__VLS_ctx.bootstrapped && __VLS_ctx.viewModeCode !== 3 && __VLS_ctx.license && __VLS_ctx.showModeSelection && !__VLS_ctx.mobileAdminShortcutMode) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.handleLogoClick) },
        ...{ class: "pargas Logo" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img, __VLS_intrinsicElements.img)({
        src: "../src/assets/images/Logo-sm.png",
        width: "60px",
        alt: "pargas Logo",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.br, __VLS_intrinsicElements.br)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
}
if (__VLS_ctx.showAdminPanel) {
    /** @type {[typeof AdminImageUpload, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(AdminImageUpload, new AdminImageUpload({
        ...{ 'onClose': {} },
    }));
    const __VLS_38 = __VLS_37({
        ...{ 'onClose': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    let __VLS_40;
    let __VLS_41;
    let __VLS_42;
    const __VLS_43 = {
        onClose: (...[$event]) => {
            if (!(__VLS_ctx.showAdminPanel))
                return;
            __VLS_ctx.showAdminPanel = false;
        }
    };
    var __VLS_39;
}
if (__VLS_ctx.bootstrapped && __VLS_ctx.viewModeCode === 3) {
    const __VLS_44 = {}.RootView;
    /** @type {[typeof __VLS_components.RootView, typeof __VLS_components.RootView, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({}));
    const __VLS_46 = __VLS_45({}, ...__VLS_functionalComponentArgsRest(__VLS_45));
}
if (__VLS_ctx.bootstrapped && __VLS_ctx.viewModeCode !== 3 && __VLS_ctx.license && !__VLS_ctx.isFullscreen && !__VLS_ctx.isMobile && !__VLS_ctx.mobileAdminShortcutMode) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.enterFullscreen) },
        ...{ style: {} },
    });
}
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['images']} */ ;
/** @type {__VLS_StyleScopedClasses['image-top-right']} */ ;
/** @type {__VLS_StyleScopedClasses['image-top-left']} */ ;
/** @type {__VLS_StyleScopedClasses['image-bottom-left']} */ ;
/** @type {__VLS_StyleScopedClasses['image-bottom-right']} */ ;
/** @type {__VLS_StyleScopedClasses['mode-selection']} */ ;
/** @type {__VLS_StyleScopedClasses['mode-button']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-green-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['mode-button']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-blue-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-admin-shortcut']} */ ;
/** @type {__VLS_StyleScopedClasses['error_license']} */ ;
/** @type {__VLS_StyleScopedClasses['pargas']} */ ;
/** @type {__VLS_StyleScopedClasses['Logo']} */ ;
// @ts-ignore
var __VLS_22 = __VLS_21;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Loader: Loader,
            AdminImageUpload: AdminImageUpload,
            ConnectionGrid: ConnectionGrid,
            isLoading: isLoading,
            showModeSelection: showModeSelection,
            mode: mode,
            isScaleOrder: isScaleOrder,
            showOrderPanel: showOrderPanel,
            isKioskOrder: isKioskOrder,
            license: license,
            showAdminPanel: showAdminPanel,
            CountOfConnections: CountOfConnections,
            connectionList: connectionList,
            selectedConnection: selectedConnection,
            viewModeCode: viewModeCode,
            bootstrapped: bootstrapped,
            categoryListRef: categoryListRef,
            isFullscreen: isFullscreen,
            mobileAdminShortcutMode: mobileAdminShortcutMode,
            isVideoPlaying: isVideoPlaying,
            videoElement: videoElement,
            isMobile: isMobile,
            showStandByVideo: showStandByVideo,
            enterFullscreen: enterFullscreen,
            Categories: Categories,
            RootView: RootView,
            ScaleInvoice: ScaleInvoice,
            handleClickCounterClick: handleClickCounterClick,
            restartVideo: restartVideo,
            handleBackgroundClick: handleBackgroundClick,
            selectMode: selectMode,
            resetMode: resetMode,
            handleLogoClick: handleLogoClick,
            selectConnection: selectConnection,
            handleCategoriesBack: handleCategoriesBack,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
