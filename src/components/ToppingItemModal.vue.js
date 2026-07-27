import { ref, watch, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import VirtualKeyboard from './VirtualKeyboard.vue';
import { ShwoKeyboardStatus } from '../utilities';
const IsShowKeyboard = ref(false);
// مدیریت کیبورد مجازی
const showKeyboard = ref(false);
const activeInputType = ref('');
const activeInputRef = ref(null);
const isNumberMode = ref(false);
// refs برای فیلدهای ورودی
const itemcode = ref(null);
const itemname = ref(null);
const itemtax = ref(null);
const itemduty = ref(null);
onMounted(() => {
    IsShowKeyboard.value = ShwoKeyboardStatus();
});
const toast = useToast({
    position: 'top-right',
    style: {
        fontFamily: 'Vazirmatn-FD-Black'
    }
});
const props = defineProps({
    item: {
        type: Object,
        required: true
    },
    toppingItems: {
        type: Array,
        default: () => []
    }
});
const emit = defineEmits(['save', 'close']);
const localItem = ref({
    GoodsId: 0,
    GoodsCode: '',
    GoodsName: '',
    TaxPercent: 0,
    DutyPercent: 0,
    IsActive: true
});
// تابع برای تولید کد جدید آیتم تاپینگ
function generateNewToppingCode() {
    if (props.toppingItems.length === 0) {
        return '1'; // شروع از 1 اگر آیتمی وجود ندارد
    }
    // پیدا کردن بالاترین کد عددی
    const maxCode = Math.max(...props.toppingItems.map(item => {
        const codeNum = parseInt(item.GoodsCode);
        return isNaN(codeNum) ? 0 : codeNum;
    }));
    return (maxCode + 1).toString();
}
watch(() => props.item, (newVal) => {
    localItem.value = { ...newVal };
    // اگر در حال افزودن آیتم جدید هستیم، کد را تولید کنیم
    if (!newVal.GoodsId && props.toppingItems.length > 0) {
        localItem.value.GoodsCode = generateNewToppingCode();
    }
}, { immediate: true });
function save() {
    if (!localItem.value.GoodsCode || !localItem.value.GoodsName) {
        toast.error('کد و نام قلم تاپینگ الزامی است');
        return;
    }
    emit('save', localItem.value);
}
////////////////////////
///// Virtual Keyboard ///////
const numberModeInputs = ['code', 'tax', 'duty'];
function handleInputClick(event, inputType) {
    if (IsShowKeyboard.value == true) {
        activeInputType.value = inputType;
        showKeyboard.value = true;
        isNumberMode.value = numberModeInputs.includes(inputType);
        // تنظیم ref مربوطه
        switch (inputType) {
            case 'code':
                activeInputRef.value = itemcode.value;
                break;
            case 'name':
                activeInputRef.value = itemname.value;
                break;
            case 'tax':
                activeInputRef.value = itemtax.value;
                break;
            case 'duty':
                activeInputRef.value = itemduty.value;
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
            case 'code':
                activeInputRef.value = itemcode.value;
                break;
            case 'name':
                activeInputRef.value = itemname.value;
                break;
            case 'tax':
                activeInputRef.value = itemtax.value;
                break;
            case 'duty':
                activeInputRef.value = itemduty.value;
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
(__VLS_ctx.item.GoodsId ? 'ویرایش قلم تاپینگ' : 'افزودن قلم تاپینگ جدید');
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.handleInputClick($event, 'code');
        } },
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.handleInputFocus('code');
        } },
    value: (__VLS_ctx.localItem.GoodsCode),
    type: "text",
    ref: "itemcode",
});
/** @type {typeof __VLS_ctx.itemcode} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.handleInputClick($event, 'name');
        } },
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.handleInputFocus('name');
        } },
    value: (__VLS_ctx.localItem.GoodsName),
    type: "text",
    ref: "itemname",
});
/** @type {typeof __VLS_ctx.itemname} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.handleInputClick($event, 'tax');
        } },
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.handleInputFocus('tax');
        } },
    value: (__VLS_ctx.localItem.TaxPercent),
    type: "text",
    ref: "itemtax",
});
/** @type {typeof __VLS_ctx.itemtax} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.handleInputClick($event, 'duty');
        } },
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.handleInputFocus('duty');
        } },
    value: (__VLS_ctx.localItem.DutyPercent),
    type: "text",
    ref: "itemduty",
});
/** @type {typeof __VLS_ctx.itemduty} */ ;
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
            itemcode: itemcode,
            itemname: itemname,
            itemtax: itemtax,
            itemduty: itemduty,
            localItem: localItem,
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
