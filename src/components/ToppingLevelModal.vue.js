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
const levelname = ref(null);
const periority = ref(null);
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
    level: {
        type: Object,
        required: true
    }
});
const emit = defineEmits(['save', 'close']);
const localLevel = ref({
    LevelId: 0,
    LevelTitle: '',
    Priority: 0,
    MinCount: 0,
    MaxCount: 0
});
watch(() => props.level, (newVal) => {
    localLevel.value = { ...newVal };
}, { immediate: true });
function save() {
    if (!localLevel.value.LevelTitle) {
        toast.error('عنوان مرحله الزامی است');
        return;
    }
    if (localLevel.value.MinCount > localLevel.value.MaxCount) {
        toast.error('حداقل انتخاب نمی‌تواند از حداکثر بیشتر باشد');
        return;
    }
    emit('save', localLevel.value);
}
////////////////////////
///// Virtual Keyboard ///////
const numberModeInputs = ['per', 'min', 'max'];
function handleInputClick(event, inputType) {
    if (IsShowKeyboard.value == true) {
        activeInputType.value = inputType;
        showKeyboard.value = true;
        isNumberMode.value = numberModeInputs.includes(inputType);
        // تنظیم ref مربوطه
        switch (inputType) {
            case 'name':
                activeInputRef.value = levelname.value;
                break;
            case 'per':
                activeInputRef.value = periority.value;
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
            case 'name':
                activeInputRef.value = levelname.value;
                break;
            case 'per':
                activeInputRef.value = periority.value;
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
(__VLS_ctx.level.LevelId ? 'ویرایش مرحله تاپینگ' : 'افزودن مرحله تاپینگ جدید');
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
            __VLS_ctx.handleInputClick($event, 'name');
        } },
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.handleInputFocus('name');
        } },
    value: (__VLS_ctx.localLevel.LevelTitle),
    type: "text",
    ref: "levelname",
});
/** @type {typeof __VLS_ctx.levelname} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.handleInputClick($event, 'per');
        } },
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.handleInputFocus('per');
        } },
    value: (__VLS_ctx.localLevel.Priority),
    type: "text",
    ref: "periority",
});
/** @type {typeof __VLS_ctx.periority} */ ;
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
    value: (__VLS_ctx.localLevel.MinCount),
    type: "text",
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
    value: (__VLS_ctx.localLevel.MaxCount),
    type: "text",
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
/** @type {__VLS_StyleScopedClasses['form-row']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
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
            levelname: levelname,
            periority: periority,
            minimum: minimum,
            maximum: maximum,
            localLevel: localLevel,
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
