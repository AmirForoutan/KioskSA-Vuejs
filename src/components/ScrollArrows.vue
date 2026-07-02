<template>
    <!-- Made By Amirreza Foroutan For HamiPOS +989120496824 -->
    <div class="scroll-arrows-container" v-if="showLeftRight">
        <div v-if="showLeft && isHorizontal" class="scroll-arrow scroll-arrow-left" @click="scroll('left')">
            <i class="fas fa-chevron-left"></i>
        </div>
        <div v-if="showRight && isHorizontal" class="scroll-arrow scroll-arrow-right" @click="scroll('right')">
            <i class="fas fa-chevron-right"></i>
        </div>
    </div>
    <div class="scroll-arrows-container-updown" v-if="showUpDown">
        <div v-if="showUp && isVertical" class="scroll-arrow scroll-arrow-top" @click="scroll('up')">
            <i class="fas fa-chevron-up"></i>
        </div>
        <div v-if="showDown && isVertical" class="scroll-arrow scroll-arrow-bottom" @click="scroll('down')">
            <i class="fas fa-chevron-down"></i>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, nextTick, watchEffect, unref, onBeforeUnmount } from 'vue'

const props = defineProps({
    containerRef: { type: [Object, HTMLElement], default: null },
    direction: { type: String, default: 'horizontal' }
})

const showLeft = ref(false)
const showRight = ref(false)
const showUp = ref(false)
const showDown = ref(false)

// RTL (چون UI شما RTL هست)
const isRTL = ref(true)

const isHorizontal = computed(() => props.direction === 'horizontal' || props.direction === 'both')
const isVertical = computed(() => props.direction === 'vertical' || props.direction === 'both')
const showUpDown = computed(() => showUp.value || showDown.value)
const showLeftRight = computed(() => showLeft.value || showRight.value)

let mo = null
const imgListeners = []

function getEl() {
    const el = unref(props.containerRef)
    return el && el instanceof HTMLElement ? el : null
}

function updateArrows() {
    const el = getEl()
    if (!el) return

    if (isHorizontal.value) {
        const current = Math.abs(el.scrollLeft)
        showLeft.value = current > 10
        showRight.value = (el.scrollWidth - el.clientWidth - current) > 10
    }

    if (isVertical.value) {
        showUp.value = el.scrollTop > 10
        showDown.value = (el.scrollHeight - el.clientHeight - el.scrollTop) > 10
    }
}

function scroll(dir) {
    const el = getEl()
    if (!el) return
    const amt = 350

    if (dir === 'left') el.scrollBy({ left: isRTL.value ? -amt : amt, behavior: 'smooth' })
    if (dir === 'right') el.scrollBy({ left: isRTL.value ? amt : -amt, behavior: 'smooth' })
    if (dir === 'up') el.scrollBy({ top: -amt, behavior: 'smooth' })
    if (dir === 'down') el.scrollBy({ top: amt, behavior: 'smooth' })
}

let cleanup = () => { }
let ro = null

watchEffect(async () => {
    await nextTick()
    const el = getEl()
    if (!el) return

    cleanup()

    const onScroll = () => updateArrows()
    const onResize = () => updateArrows()

    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)

    ro = new ResizeObserver(() => updateArrows())
    ro.observe(el)

    // ✅ 1) وقتی DOM داخل لیست تغییر می‌کند (آیتم‌ها/اسکلت/فیلتر)، arrows آپدیت شود
    mo = new MutationObserver(() => updateArrows())
    mo.observe(el, { childList: true, subtree: true, attributes: true })

    // ✅ 2) وقتی عکس‌ها لود می‌شوند، scrollHeight تغییر می‌کند ولی resize رخ نمی‌دهد
    // پس روی load تصاویر هم updateArrows بزن
    el.querySelectorAll('img').forEach((img) => {
        const fn = () => updateArrows()
        img.addEventListener('load', fn, { passive: true })
        img.addEventListener('error', fn, { passive: true })
        imgListeners.push([img, fn])
    })

    // ✅ یک بار هم با تاخیر کوتاه (برای لود اولیه) محاسبه کن
    updateArrows()

    cleanup = () => {
        el.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onResize)
        if (ro) { ro.disconnect(); ro = null }
        if (mo) { mo.disconnect(); mo = null }

        // پاک کردن لیسنرهای تصاویر
        imgListeners.forEach(([img, fn]) => {
            img.removeEventListener('load', fn)
            img.removeEventListener('error', fn)
        })
        imgListeners.length = 0
    }
})

onBeforeUnmount(() => cleanup())
</script>