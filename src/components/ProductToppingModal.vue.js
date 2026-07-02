import { ref, watch, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { ShwoKeyboardStatus } from '../utilities';
import VirtualKeyboard from './VirtualKeyboard.vue';
const IsShowKeyboard = ref(false);
// مدیریت کیبورد مجازی
const showKeyboard = ref(false);
const activeInputType = ref('');
const activeInputRef = ref(null);
const isNumberMode = ref(false);
// refs برای فیلدهای ورودی
const defcount = ref(null);
const topprice = ref(null);
const pckingprice = ref(null);
const currentcount = ref(null);
const minimum = ref(null);
const maximum = ref(null);
const toast = useToast({
    position: 'top-right',
    style: {
        fontFamily: 'Vazirmatn-FD-Black'
    }
});
onMounted(() => {
    IsShowKeyboard.value = ShwoKeyboardStatus();
});
const props = defineProps({
    topping: {
        type: Object,
        required: true
    },
    products: {
        type: Array,
        required: true
    },
    toppingItems: {
        type: Array,
        required: true
    },
    toppingLevels: {
        type: Array,
        required: true
    }
});
const emit = defineEmits(['save', 'close']);
const localTopping = ref({
    ToppingId: 0,
    GoodsId: 0,
    GoodsToppingId: 0,
    LevelId: 0,
    GoodsCountDefault: 0,
    GoodsCount: 0,
    Price: 0,
    containerPrice: 0,
    MinCount: 0,
    MaxCount: 0
});
watch(() => props.topping, (newVal) => {
    localTopping.value = { ...newVal };
}, { immediate: true });
watch(() => props.products, (newVal) => {
    if (newVal.length > 0 && !localTopping.value.GoodsId) {
        localTopping.value.GoodsId = newVal[0].GoodsId;
    }
}, { immediate: true });
watch(() => props.toppingItems, (newVal) => {
    if (newVal.length > 0 && !localTopping.value.GoodsToppingId) {
        localTopping.value.GoodsToppingId = newVal[0].GoodsId;
    }
}, { immediate: true });
watch(() => props.toppingLevels, (newVal) => {
    if (newVal.length > 0 && !localTopping.value.LevelId) {
        localTopping.value.LevelId = newVal[0].LevelId;
    }
}, { immediate: true });
function save() {
    if (!localTopping.value.GoodsId || !localTopping.value.GoodsToppingId || !localTopping.value.LevelId) {
        toast.error('انتخاب کالا، قلم تاپینگ و مرحله الزامی است');
        return;
    }
    if (localTopping.value.MinCount > localTopping.value.MaxCount) {
        toast.error('حداقل انتخاب نمی‌تواند از حداکثر بیشتر باشد');
        return;
    }
    emit('save', localTopping.value);
}
////////////////////////
///// Virtual Keyboard ///////
const numberModeInputs = ['count', 'price', 'packprice', 'curcount', 'min', 'max'];
function handleInputClick(event, inputType) {
    if (IsShowKeyboard.value == true) {
        activeInputType.value = inputType;
        showKeyboard.value = true;
        isNumberMode.value = numberModeInputs.includes(inputType);
        // تنظیم ref مربوطه
        switch (inputType) {
            case 'count':
                activeInputRef.value = defcount.value;
                break;
            case 'price':
                activeInputRef.value = topprice.value;
                break;
            case 'packprice':
                activeInputRef.value = pckingprice.value;
                break;
            case 'curcount':
                activeInputRef.value = currentcount.value;
                break;
            case 'min':
                activeInputRef.value = minimum.value;
                break;
            case 'max':
                activeInputRef.value = maximum.value;
                break;
        }
        event.preventDefault();
    }
}
function handleInputFocus(inputType) {
    if (IsShowKeyboard.value == true) {
        activeInputType.value = inputType;
        showKeyboard.value = true;
        isNumberMode.value = numberModeInputs.includes(inputType);
        // تنظیم ref مربوطه
        switch (inputType) {
            case 'count':
                activeInputRef.value = defcount.value;
                break;
            case 'price':
                activeInputRef.value = topprice.value;
                break;
            case 'packprice':
                activeInputRef.value = pckingprice.value;
                break;
            case 'curcount':
                activeInputRef.value = currentcount.value;
                break;
            case 'min':
                activeInputRef.value = minimum.value;
                break;
            case 'max':
                activeInputRef.value = maximum.value;
                break;
        }
    }
}
function hideKeyboard() {
    showKeyboard.value = false;
    activeInputType.value = '';
    activeInputRef.value = null;
}
function handleKeyPress(key) {
    if (!activeInputRef.value)
        return;
    const input = activeInputRef.value;
    const currentValue = input.value;
    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;
    if (key === '{bksp}') {
        // حذف کاراکتر
        if (selectionStart === selectionEnd && selectionStart > 0) {
            input.value = currentValue.substring(0, selectionStart - 1) + currentValue.substring(selectionStart);
            input.selectionStart = input.selectionEnd = selectionStart - 1;
        }
        else if (selectionStart !== selectionEnd) {
            input.value = currentValue.substring(0, selectionStart) + currentValue.substring(selectionEnd);
            input.selectionStart = input.selectionEnd = selectionStart;
        }
    }
    else if (key === '{enter}') {
        // ثبت و مخفی کردن کیبورد
        hideKeyboard();
    }
    else {
        // درج کاراکتر جدید
        const newValue = currentValue.substring(0, selectionStart) + key + currentValue.substring(selectionEnd);
        input.value = newValue;
        const newPosition = selectionStart + key.length;
        input.selectionStart = input.selectionEnd = newPosition;
    }
    // انتشار رویداد input برای به روزرسانی واکنشی
    input.dispatchEvent(new Event('input'));
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "modal-overlay" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "modal-content" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "modal-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
(__VLS_ctx.topping.ToppingId ? 'ویرایش تاپینگ کالا' : 'افزودن تاپینگ جدید');
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.$emit('close');
        } },
    ...{ class: "close-btn" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "fas fa-times" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "modal-body" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.localTopping.GoodsId),
});
for (const [product] of __VLS_getVForSourceType((__VLS_ctx.products))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (product.GoodsId),
        key: (product.GoodsId),
    });
    (product.GoodsName);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.localTopping.GoodsToppingId),
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.toppingItems))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (item.GoodsId),
        key: (item.GoodsId),
    });
    (item.GoodsName);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.localTopping.LevelId),
});
for (const [level] of __VLS_getVForSourceType((__VLS_ctx.toppingLevels))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (level.LevelId),
        key: (level.LevelId),
    });
    (level.LevelTitle);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.handleInputClick($event, 'count');
        } },
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.handleInputFocus('count');
        } },
    value: (__VLS_ctx.localTopping.GoodsCountDefault),
    type: "text",
    min: "0",
    ref: "defcount",
});
/** @type {typeof __VLS_ctx.defcount} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.handleInputClick($event, 'price');
        } },
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.handleInputFocus('price');
        } },
    value: (__VLS_ctx.localTopping.Price),
    type: "text",
    min: "0",
    ref: "topprice",
});
/** @type {typeof __VLS_ctx.topprice} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.handleInputClick($event, 'packprice');
        } },
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.handleInputFocus('packprice');
        } },
    value: (__VLS_ctx.localTopping.containerPrice),
    type: "text",
    min: "0",
    ref: "pckingprice",
});
/** @type {typeof __VLS_ctx.pckingprice} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.handleInputClick($event, 'curcount');
        } },
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.handleInputFocus('curcount');
        } },
    value: (__VLS_ctx.localTopping.GoodsCount),
    type: "text",
    min: "0",
    ref: "currentcount",
});
/** @type {typeof __VLS_ctx.currentcount} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.handleInputClick($event, 'min');
        } },
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.handleInputFocus('min');
        } },
    value: (__VLS_ctx.localTopping.MinCount),
    type: "text",
    min: "0",
    ref: "minimum",
});
/** @type {typeof __VLS_ctx.minimum} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.handleInputClick($event, 'max');
        } },
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.handleInputFocus('max');
        } },
    value: (__VLS_ctx.localTopping.MaxCount),
    type: "text",
    min: "0",
    ref: "maximum",
});
/** @type {typeof __VLS_ctx.maximum} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "modal-footer" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.$emit('close');
        } },
    ...{ class: "cancel-btn" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.save) },
    ...{ class: "save-btn" },
});
if (__VLS_ctx.showKeyboard && __VLS_ctx.activeInputRef) {
    /** @type {[typeof VirtualKeyboard, ]} */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(VirtualKeyboard, new VirtualKeyboard({
        ...{ 'onKeyPress': {} },
        ...{ 'onHide': {} },
        inputRef: (__VLS_ctx.activeInputRef),
        isNumberMode: (__VLS_ctx.isNumberMode),
    }));
    const __VLS_1 = __VLS_0({
        ...{ 'onKeyPress': {} },
        ...{ 'onHide': {} },
        inputRef: (__VLS_ctx.activeInputRef),
        isNumberMode: (__VLS_ctx.isNumberMode),
    }, ...__VLS_functionalComponentArgsRest(__VLS_0));
    let __VLS_3;
    let __VLS_4;
    let __VLS_5;
    const __VLS_6 = {
        onKeyPress: (__VLS_ctx.handleKeyPress)
    };
    const __VLS_7 = {
        onHide: (__VLS_ctx.hideKeyboard)
    };
    var __VLS_2;
}
/** @type {__VLS_StyleScopedClasses['modal-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-content']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-header']} */ ;
/** @type {__VLS_StyleScopedClasses['close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-times']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-body']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-row']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-row']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-row']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['cancel-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['save-btn']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            $props: __VLS_makeOptional(props),
            ...props,
            $emit: emit,
            VirtualKeyboard: VirtualKeyboard,
            showKeyboard: showKeyboard,
            activeInputRef: activeInputRef,
            isNumberMode: isNumberMode,
            defcount: defcount,
            topprice: topprice,
            pckingprice: pckingprice,
            currentcount: currentcount,
            minimum: minimum,
            maximum: maximum,
            localTopping: localTopping,
            save: save,
            handleInputClick: handleInputClick,
            handleInputFocus: handleInputFocus,
            hideKeyboard: hideKeyboard,
            handleKeyPress: handleKeyPress,
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
