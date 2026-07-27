import { ref, computed, nextTick, watchEffect, unref, onBeforeUnmount } from 'vue';
const props = defineProps({
    containerRef: { type: [Object, HTMLElement], default: null },
    direction: { type: String, default: 'horizontal' }
});
const showLeft = ref(false);
const showRight = ref(false);
const showUp = ref(false);
const showDown = ref(false);
// RTL (چون UI شما RTL هست)
const isRTL = ref(true);
const isHorizontal = computed(() => props.direction === 'horizontal' || props.direction === 'both');
const isVertical = computed(() => props.direction === 'vertical' || props.direction === 'both');
const showUpDown = computed(() => showUp.value || showDown.value);
const showLeftRight = computed(() => showLeft.value || showRight.value);
let mo = null;
const imgListeners = [];
function getEl() {
    const el = unref(props.containerRef);
    return el && el instanceof HTMLElement ? el : null;
}
function updateArrows() {
    const el = getEl();
    if (!el)
        return;
    if (isHorizontal.value) {
        const current = Math.abs(el.scrollLeft);
        showLeft.value = current > 10;
        showRight.value = (el.scrollWidth - el.clientWidth - current) > 10;
    }
    if (isVertical.value) {
        showUp.value = el.scrollTop > 10;
        showDown.value = (el.scrollHeight - el.clientHeight - el.scrollTop) > 10;
    }
}
function scroll(dir) {
    const el = getEl();
    if (!el)
        return;
    const amt = 350;
    if (dir === 'left')
        el.scrollBy({ left: isRTL.value ? -amt : amt, behavior: 'smooth' });
    if (dir === 'right')
        el.scrollBy({ left: isRTL.value ? amt : -amt, behavior: 'smooth' });
    if (dir === 'up')
        el.scrollBy({ top: -amt, behavior: 'smooth' });
    if (dir === 'down')
        el.scrollBy({ top: amt, behavior: 'smooth' });
}
let cleanup = () => { };
let ro = null;
watchEffect(async () => {
    await nextTick();
    const el = getEl();
    if (!el)
        return;
    cleanup();
    const onScroll = () => updateArrows();
    const onResize = () => updateArrows();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    ro = new ResizeObserver(() => updateArrows());
    ro.observe(el);
    // ✅ 1) وقتی DOM داخل لیست تغییر می‌کند (آیتم‌ها/اسکلت/فیلتر)، arrows آپدیت شود
    mo = new MutationObserver(() => updateArrows());
    mo.observe(el, { childList: true, subtree: true, attributes: true });
    // ✅ 2) وقتی عکس‌ها لود می‌شوند، scrollHeight تغییر می‌کند ولی resize رخ نمی‌دهد
    // پس روی load تصاویر هم updateArrows بزن
    el.querySelectorAll('img').forEach((img) => {
        const fn = () => updateArrows();
        img.addEventListener('load', fn, { passive: true });
        img.addEventListener('error', fn, { passive: true });
        imgListeners.push([img, fn]);
    });
    // ✅ یک بار هم با تاخیر کوتاه (برای لود اولیه) محاسبه کن
    updateArrows();
    cleanup = () => {
        el.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onResize);
        if (ro) {
            ro.disconnect();
            ro = null;
        }
        if (mo) {
            mo.disconnect();
            mo = null;
        }
        // پاک کردن لیسنرهای تصاویر
        imgListeners.forEach(([img, fn]) => {
            img.removeEventListener('load', fn);
            img.removeEventListener('error', fn);
        });
        imgListeners.length = 0;
    };
});
onBeforeUnmount(() => cleanup());
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
if (__VLS_ctx.showLeftRight) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "scroll-arrows-container" },
    });
    if (__VLS_ctx.showLeft && __VLS_ctx.isHorizontal) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showLeftRight))
                        return;
                    if (!(__VLS_ctx.showLeft && __VLS_ctx.isHorizontal))
                        return;
                    __VLS_ctx.scroll('left');
                } },
            ...{ class: "scroll-arrow scroll-arrow-left" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-chevron-left" },
        });
    }
    if (__VLS_ctx.showRight && __VLS_ctx.isHorizontal) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showLeftRight))
                        return;
                    if (!(__VLS_ctx.showRight && __VLS_ctx.isHorizontal))
                        return;
                    __VLS_ctx.scroll('right');
                } },
            ...{ class: "scroll-arrow scroll-arrow-right" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-chevron-right" },
        });
    }
}
if (__VLS_ctx.showUpDown) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "scroll-arrows-container-updown" },
    });
    if (__VLS_ctx.showUp && __VLS_ctx.isVertical) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showUpDown))
                        return;
                    if (!(__VLS_ctx.showUp && __VLS_ctx.isVertical))
                        return;
                    __VLS_ctx.scroll('up');
                } },
            ...{ class: "scroll-arrow scroll-arrow-top" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-chevron-up" },
        });
    }
    if (__VLS_ctx.showDown && __VLS_ctx.isVertical) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showUpDown))
                        return;
                    if (!(__VLS_ctx.showDown && __VLS_ctx.isVertical))
                        return;
                    __VLS_ctx.scroll('down');
                } },
            ...{ class: "scroll-arrow scroll-arrow-bottom" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-chevron-down" },
        });
    }
}
/** @type {__VLS_StyleScopedClasses['scroll-arrows-container']} */ ;
/** @type {__VLS_StyleScopedClasses['scroll-arrow']} */ ;
/** @type {__VLS_StyleScopedClasses['scroll-arrow-left']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-chevron-left']} */ ;
/** @type {__VLS_StyleScopedClasses['scroll-arrow']} */ ;
/** @type {__VLS_StyleScopedClasses['scroll-arrow-right']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-chevron-right']} */ ;
/** @type {__VLS_StyleScopedClasses['scroll-arrows-container-updown']} */ ;
/** @type {__VLS_StyleScopedClasses['scroll-arrow']} */ ;
/** @type {__VLS_StyleScopedClasses['scroll-arrow-top']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-chevron-up']} */ ;
/** @type {__VLS_StyleScopedClasses['scroll-arrow']} */ ;
/** @type {__VLS_StyleScopedClasses['scroll-arrow-bottom']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-chevron-down']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            $props: __VLS_makeOptional(props),
            ...props,
            showLeft: showLeft,
            showRight: showRight,
            showUp: showUp,
            showDown: showDown,
            isHorizontal: isHorizontal,
            isVertical: isVertical,
            showUpDown: showUpDown,
            showLeftRight: showLeftRight,
            scroll: scroll,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {
            $props: __VLS_makeOptional(props),
            ...props,
        };
    },
});
; /* PartiallyEnd: #4569/main.vue */
