<!-- VirtualKeyboard.vue -->
<template>
    <div class="simple-keyboard visible" :class="{ 'english-mode': isEnglishMode, 'number-mode': isNumberMode }">
        <div class="keyboard-header">
            <button class="language-toggle" @click="toggleLanguage">
                {{ isEnglishMode ? 'EN' : 'فا' }}
            </button>
            <div class="keyboard-close-btn" @click="hideKeyboard">X</div>
        </div>

        <!-- حالت حروف -->
        <div v-if="!isNumberMode && !isSymbolMode" class="keyboard-rows">
            <div class="keyboard-row" v-for="(row, i) in currentLayout" :key="i">
                <button v-for="key in row.split(' ')" :key="key" @click="handleKeyPress(key, $event)" :class="{
                    'special-key': key === '{bksp}' || key === '{enter}' || key === '{shift}' || key === '{space}' || key === '{numbers}',
                    'shift-active': key === '{shift}' && isShiftActive
                }" :data-action="getKeyAction(key)">
                    <span v-if="key === '{bksp}'">⌫</span>
                    <span v-else-if="key === '{enter}'">↵</span>
                    <span v-else-if="key === '{shift}'">⇧</span>
                    <span v-else-if="key === '{space}'">______</span>
                    <span v-else-if="key === '{numbers}'">123</span>
                    <span v-else>{{ key }}</span>
                </button>
            </div>
        </div>

        <div v-else-if="isSymbolMode" class="keyboard-rows">
            <div class="keyboard-row" v-for="(row, i) in symbolLayout" :key="i">
                <button v-for="key in row.split(' ')" :key="key" @click="handleKeyPress(key, $event)" :class="{
                    'special-key': key === '{bksp}' || key === '{enter}' || key === '{letters}' || key === '{symbols}' || key === '{numbers}'
                }" :data-action="getKeyAction(key)">
                    <span v-if="key === '{bksp}'">⌫</span>
                    <span v-else-if="key === '{enter}'">↵</span>
                    <span v-else-if="key === '{numbers}'">123</span>
                    <span v-else-if="key === '{space}'">______</span>
                    <span v-else-if="key === '{letters}'">ABC</span>
                    <span v-else-if="key === '{symbols}'">#+=</span>
                    <span v-else>{{ key }}</span>
                </button>
            </div>
        </div>
        <!-- حالت اعداد -->
        <div v-else class="keyboard-rows">
            <div class="keyboard-row" v-for="(row, i) in numberLayout" :key="i">
                <button v-for="key in row.split(' ')" :key="key" @click="handleKeyPress(key, $event)" :class="{
                    'special-key': key === '{bksp}' || key === '{enter}' || key === '{letters}' || key === '{symbols}'
                }" :data-action="getKeyAction(key)">
                    <span v-if="key === '{bksp}'">⌫</span>
                    <span v-else-if="key === '{enter}'">↵</span>
                    <span v-else-if="key === '{space}'">______</span>
                    <span v-else-if="key === '{letters}'">ABC</span>
                    <span v-else-if="key === '{symbols}'">#+=</span>
                    <span v-else>{{ key }}</span>
                </button>
            </div>
        </div>


    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
    inputRef: {
        type: Object,
        default: null
    },
    isNumberMode: {
        type: Boolean,
        default: false
    }
})



watch(() => props.isNumberMode, (newValue) => {
    isNumberMode.value = newValue
    // اگر حالت عددی فعال شد، حالت shift را غیرفعال کنید
    if (newValue) {
        isShiftActive.value = false
    }
})

const emit = defineEmits(['key-press', 'hide'])

// حالت های کیبورد
const isEnglishMode = ref(false)
const isShiftActive = ref(false)
const isNumberMode = ref(false)
const isSymbolMode = ref(false)

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
}

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
}

const numberLayout = [
    '1 2 3 4 5 6 7 8 9 0',
    '- / : ; ( ) $ & @ "',
    '{symbols} . , ? ! \' {bksp}',
    '{letters} {space} {enter}'
]

const symbolLayout = [
    '[ ] { } # % ^ * + =',
    '_ \\ | ~ < > € £ ¥ •',
    '{numbers} . , ? ! \' {bksp}',
    '{letters} {space} {enter}'
]

// لیاوت جاری
const currentLayout = computed(() => {
    if (isEnglishMode.value) {
        return isShiftActive.value ? englishLayout.shift : englishLayout.default
    } else {
        return isShiftActive.value ? persianLayout.shift : persianLayout.default
    }
})

// توابع مدیریت کیبورد
function toggleLanguage() {
    isEnglishMode.value = !isEnglishMode.value
    isShiftActive.value = false
}

function toggleShift() {
    isShiftActive.value = !isShiftActive.value
}

function toggleNumberMode() {
    isNumberMode.value = true
    isSymbolMode.value = false
}

function toggleSymbolMode() {
    isNumberMode.value = false
    isSymbolMode.value = true
}

function hideKeyboard() {
    emit('hide')
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
    }
    return actions[key] || 'insert'
}

function handleKeyPress(key, event) {
    event.preventDefault()
    event.stopPropagation()

    const action = getKeyAction(key)

    switch (action) {
        case 'backspace':
            emit('key-press', '{bksp}')
            break
        case 'enter':
            emit('key-press', '{enter}')
            break
        case 'shift':
            toggleShift()
            break
        case 'space':
            emit('key-press', ' ')
            break
        case 'numbers':
            toggleNumberMode()
            break
        case 'letters':
            isNumberMode.value = false
            isSymbolMode.value = false
            break
        case 'symbols':
            toggleSymbolMode()
            break
        default:
            emit('key-press', key)
            if (isShiftActive.value && !isNumberMode.value) {
                isShiftActive.value = false
            }
    }
}
</script>

<style scoped>
.simple-keyboard {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #f0f0f0;
    padding: 10px;
    border-top: 1px solid #ccc;
    z-index: 2501;
}

.keyboard-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
}

.language-toggle {
    background: #ddd;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    color: black;
    width: 50px;
    height: 50px;
}

.keyboard-close-btn {
    background: #ff4444;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
}

.keyboard-rows {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.keyboard-row {
    display: flex;
    justify-content: center;
    gap: 3px;
}

.keyboard-row button {
    flex: 1;
    min-width: 30px;
    height: 60px;
    border: 1px solid #ccc;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
}

.keyboard-row button.special-key {
    background: #ccc;
    font-weight: bold;
}

.keyboard-row button.shift-active {
    background: #888;
    color: white;
}

.english-mode {
    font-family: Arial, sans-serif;
}
</style>