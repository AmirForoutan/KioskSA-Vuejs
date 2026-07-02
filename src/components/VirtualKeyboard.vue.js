import { ref, computed, watch } from 'vue';
const props = defineProps({
    inputRef: {
        type: Object,
        default: null
    },
    isNumberMode: {
        type: Boolean,
        default: false
    }
});
watch(() => props.isNumberMode, (newValue) => {
    isNumberMode.value = newValue;
    // اگر حالت عددی فعال شد، حالت shift را غیرفعال کنید
    if (newValue) {
        isShiftActive.value = false;
    }
});
const emit = defineEmits(['key-press', 'hide']);
// حالت های کیبورد
const isEnglishMode = ref(false);
const isShiftActive = ref(false);
const isNumberMode = ref(false);
const isSymbolMode = ref(false);
// لیاوت های مختلف
const persianLayout = {
    'default': [
        'ض ص ث ق ف غ ع ه خ ح ج چ',
        'ش س ی ب ل ا ت ن م ک گ',
        '{shift} ظ ط ز ر ذ د پ و {bksp}',
        '{numbers} {space} {enter}'
    ],
    'shift': [
        'ِ ً ٌ ٍ ُ ٰ ْ ّ ِ َ ٌ ٍ',
        'ٌ ٍ ّ ْ ٰ ُ ِ َ ء أ ؤ',
        '{shift} إ ئ ة ى ﻻ ﻷ ﻹ ﻵ {bksp}',
        '{numbers} {space} {enter}'
    ]
};
const englishLayout = {
    'default': [
        'q w e r t y u i o p',
        'a s d f g h j k l',
        '{shift} z x c v b n m {bksp}',
        '{numbers} {space} {enter}'
    ],
    'shift': [
        'Q W E R T Y U I O P',
        'A S D F G H J K L',
        '{shift} Z X C V B N M {bksp}',
        '{numbers} {space} {enter}'
    ]
};
const numberLayout = [
    '1 2 3 4 5 6 7 8 9 0',
    '- / : ; ( ) $ & @ "',
    '{symbols} . , ? ! \' {bksp}',
    '{letters} {space} {enter}'
];
const symbolLayout = [
    '[ ] { } # % ^ * + =',
    '_ \\ | ~ < > € £ ¥ •',
    '{numbers} . , ? ! \' {bksp}',
    '{letters} {space} {enter}'
];
// لیاوت جاری
const currentLayout = computed(() => {
    if (isEnglishMode.value) {
        return isShiftActive.value ? englishLayout.shift : englishLayout.default;
    }
    else {
        return isShiftActive.value ? persianLayout.shift : persianLayout.default;
    }
});
// توابع مدیریت کیبورد
function toggleLanguage() {
    isEnglishMode.value = !isEnglishMode.value;
    isShiftActive.value = false;
}
function toggleShift() {
    isShiftActive.value = !isShiftActive.value;
}
function toggleNumberMode() {
    isNumberMode.value = true;
    isSymbolMode.value = false;
}
function toggleSymbolMode() {
    isNumberMode.value = false;
    isSymbolMode.value = true;
}
function hideKeyboard() {
    emit('hide');
}
function getKeyAction(key) {
    const actions = {
        '{bksp}': 'backspace',
        '{enter}': 'enter',
        '{shift}': 'shift',
        '{space}': 'space',
        '{numbers}': 'numbers',
        '{letters}': 'letters',
        '{symbols}': 'symbols'
    };
    return actions[key] || 'insert';
}
function handleKeyPress(key, event) {
    event.preventDefault();
    event.stopPropagation();
    const action = getKeyAction(key);
    switch (action) {
        case 'backspace':
            emit('key-press', '{bksp}');
            break;
        case 'enter':
            emit('key-press', '{enter}');
            break;
        case 'shift':
            toggleShift();
            break;
        case 'space':
            emit('key-press', ' ');
            break;
        case 'numbers':
            toggleNumberMode();
            break;
        case 'letters':
            isNumberMode.value = false;
            isSymbolMode.value = false;
            break;
        case 'symbols':
            toggleSymbolMode();
            break;
        default:
            emit('key-press', key);
            if (isShiftActive.value && !isNumberMode.value) {
                isShiftActive.value = false;
            }
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['keyboard-row']} */ ;
/** @type {__VLS_StyleScopedClasses['keyboard-row']} */ ;
/** @type {__VLS_StyleScopedClasses['keyboard-row']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "simple-keyboard visible" },
    ...{ class: ({ 'english-mode': __VLS_ctx.isEnglishMode, 'number-mode': __VLS_ctx.isNumberMode }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "keyboard-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.toggleLanguage) },
    ...{ class: "language-toggle" },
});
(__VLS_ctx.isEnglishMode ? 'EN' : 'فا');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (__VLS_ctx.hideKeyboard) },
    ...{ class: "keyboard-close-btn" },
});
if (!__VLS_ctx.isNumberMode && !__VLS_ctx.isSymbolMode) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "keyboard-rows" },
    });
    for (const [row, i] of __VLS_getVForSourceType((__VLS_ctx.currentLayout))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "keyboard-row" },
            key: (i),
        });
        for (const [key] of __VLS_getVForSourceType((row.split(' ')))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(!__VLS_ctx.isNumberMode && !__VLS_ctx.isSymbolMode))
                            return;
                        __VLS_ctx.handleKeyPress(key, $event);
                    } },
                key: (key),
                ...{ class: ({
                        'special-key': key === '{bksp}' || key === '{enter}' || key === '{shift}' || key === '{space}' || key === '{numbers}',
                        'shift-active': key === '{shift}' && __VLS_ctx.isShiftActive
                    }) },
                'data-action': (__VLS_ctx.getKeyAction(key)),
            });
            if (key === '{bksp}') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            }
            else if (key === '{enter}') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            }
            else if (key === '{shift}') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            }
            else if (key === '{space}') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            }
            else if (key === '{numbers}') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (key);
            }
        }
    }
}
else if (__VLS_ctx.isSymbolMode) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "keyboard-rows" },
    });
    for (const [row, i] of __VLS_getVForSourceType((__VLS_ctx.symbolLayout))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "keyboard-row" },
            key: (i),
        });
        for (const [key] of __VLS_getVForSourceType((row.split(' ')))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.isNumberMode && !__VLS_ctx.isSymbolMode))
                            return;
                        if (!(__VLS_ctx.isSymbolMode))
                            return;
                        __VLS_ctx.handleKeyPress(key, $event);
                    } },
                key: (key),
                ...{ class: ({
                        'special-key': key === '{bksp}' || key === '{enter}' || key === '{letters}' || key === '{symbols}' || key === '{numbers}'
                    }) },
                'data-action': (__VLS_ctx.getKeyAction(key)),
            });
            if (key === '{bksp}') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            }
            else if (key === '{enter}') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            }
            else if (key === '{numbers}') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            }
            else if (key === '{space}') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            }
            else if (key === '{letters}') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            }
            else if (key === '{symbols}') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (key);
            }
        }
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "keyboard-rows" },
    });
    for (const [row, i] of __VLS_getVForSourceType((__VLS_ctx.numberLayout))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "keyboard-row" },
            key: (i),
        });
        for (const [key] of __VLS_getVForSourceType((row.split(' ')))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.isNumberMode && !__VLS_ctx.isSymbolMode))
                            return;
                        if (!!(__VLS_ctx.isSymbolMode))
                            return;
                        __VLS_ctx.handleKeyPress(key, $event);
                    } },
                key: (key),
                ...{ class: ({
                        'special-key': key === '{bksp}' || key === '{enter}' || key === '{letters}' || key === '{symbols}'
                    }) },
                'data-action': (__VLS_ctx.getKeyAction(key)),
            });
            if (key === '{bksp}') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            }
            else if (key === '{enter}') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            }
            else if (key === '{space}') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            }
            else if (key === '{letters}') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            }
            else if (key === '{symbols}') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (key);
            }
        }
    }
}
/** @type {__VLS_StyleScopedClasses['simple-keyboard']} */ ;
/** @type {__VLS_StyleScopedClasses['visible']} */ ;
/** @type {__VLS_StyleScopedClasses['english-mode']} */ ;
/** @type {__VLS_StyleScopedClasses['number-mode']} */ ;
/** @type {__VLS_StyleScopedClasses['keyboard-header']} */ ;
/** @type {__VLS_StyleScopedClasses['language-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['keyboard-close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['keyboard-rows']} */ ;
/** @type {__VLS_StyleScopedClasses['keyboard-row']} */ ;
/** @type {__VLS_StyleScopedClasses['special-key']} */ ;
/** @type {__VLS_StyleScopedClasses['shift-active']} */ ;
/** @type {__VLS_StyleScopedClasses['keyboard-rows']} */ ;
/** @type {__VLS_StyleScopedClasses['keyboard-row']} */ ;
/** @type {__VLS_StyleScopedClasses['special-key']} */ ;
/** @type {__VLS_StyleScopedClasses['keyboard-rows']} */ ;
/** @type {__VLS_StyleScopedClasses['keyboard-row']} */ ;
/** @type {__VLS_StyleScopedClasses['special-key']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            $props: __VLS_makeOptional(props),
            ...props,
            $emit: emit,
            isEnglishMode: isEnglishMode,
            isShiftActive: isShiftActive,
            isNumberMode: isNumberMode,
            isSymbolMode: isSymbolMode,
            numberLayout: numberLayout,
            symbolLayout: symbolLayout,
            currentLayout: currentLayout,
            toggleLanguage: toggleLanguage,
            hideKeyboard: hideKeyboard,
            getKeyAction: getKeyAction,
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
