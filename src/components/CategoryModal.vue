<template>
    <div class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h3>{{ category.GroupId ? 'ویرایش دسته‌بندی' : 'افزودن دسته‌بندی جدید' }}</h3>
                <button @click="$emit('close')" class="close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="modal-body">
                <div class="form-group">
                    <label>کد دسته‌بندی:</label>
                    <input v-model="localCategory.GroupCode" type="text" ref="groupcode"
                        @click="handleInputClick($event, 'code')" @focus="handleInputFocus('code')" />
                </div>

                <div class="form-group">
                    <label>نام دسته‌بندی:</label>
                    <input v-model="localCategory.GroupName" type="text" ref="groupname"
                        @click="handleInputClick($event, 'name')" @focus="handleInputFocus('name')" />
                </div>

                <div class="form-group">
                    <label>وضعیت:</label>
                    <label class="switch">
                        <input v-model="localCategory.IsActive" type="checkbox" />
                        <span class="slider round"></span>
                    </label>
                    <span>{{ localCategory.IsActive ? 'فعال' : 'غیرفعال' }}</span>
                </div>

                <div class="form-group usage-box">
                    <label>نمایش در کیوسک:</label>
                    <label class="switch">
                        <input v-model="localCategory.IsKioskVisible" type="checkbox" />
                        <span class="slider round"></span>
                    </label>
                    <span>{{ localCategory.IsKioskVisible ? 'نمایش داده شود' : 'مخفی باشد' }}</span>
                    <small>اگر خاموش باشد، این دسته‌بندی و کالاهای داخل آن در کیوسک نمایش داده نمی‌شوند.</small>
                </div>
            </div>

            <div class="modal-footer">
                <button @click="$emit('close')" class="cancel-btn">انصراف</button>
                <button @click="save" class="save-btn">ذخیره</button>
            </div>
        </div>
    </div>

    <VirtualKeyboard v-if="showKeyboard && activeInputRef" :input-ref="activeInputRef" :is-number-mode="isNumberMode"
        @key-press="handleKeyPress" @hide="hideKeyboard" />
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import VirtualKeyboard from './VirtualKeyboard.vue'
import { ShwoKeyboardStatus } from '../utilities'

const showKeyboard = ref(false)
const activeInputType = ref('')
const activeInputRef = ref(null)
const isNumberMode = ref(false)
const groupcode = ref(null)
const groupname = ref(null)
const IsShowKeyboard = ref(false)

const toast = useToast({
    position: 'top-right',
    style: {
        fontFamily: 'Vazirmatn-FD-Black'
    }
})

const props = defineProps({
    category: {
        type: Object,
        required: true
    },
    categories: {
        type: Array,
        default: () => []
    }
})

onMounted(() => {
    IsShowKeyboard.value = ShwoKeyboardStatus();
})

const emit = defineEmits(['save', 'close'])
const localCategory = ref({ ...props.category, IsKioskVisible: props.category.IsKioskVisible !== false })

function generateNewCategoryCode() {
    if (props.categories.length === 0) {
        return '100'
    }

    const maxCode = Math.max(...props.categories.map(cat => {
        const codeNum = parseInt(cat.GroupCode)
        return isNaN(codeNum) ? 0 : codeNum
    }))
    return (maxCode + 1).toString()
}

watch(() => props.category, (newVal) => {
    localCategory.value = { ...newVal, IsKioskVisible: newVal.IsKioskVisible !== false }
    if (!newVal.GroupId && props.categories.length > 0) {
        localCategory.value.GroupCode = generateNewCategoryCode()
    }
}, { immediate: true })

function save() {
    if (!localCategory.value.GroupCode || !localCategory.value.GroupName) {
        toast.error('کد و نام دسته‌بندی الزامی است')
        return
    }
    emit('save', localCategory.value)
}

const numberModeInputs = ['code']

function handleInputClick(event, inputType) {
    if (IsShowKeyboard.value == true) {
        activeInputType.value = inputType
        showKeyboard.value = true
        isNumberMode.value = numberModeInputs.includes(inputType)
        activeInputRef.value = inputType === 'code' ? groupcode.value : groupname.value
        event.preventDefault()
    }
}

function handleInputFocus(inputType) {
    if (IsShowKeyboard.value == true) {
        activeInputType.value = inputType
        showKeyboard.value = true
        isNumberMode.value = numberModeInputs.includes(inputType)
        activeInputRef.value = inputType === 'code' ? groupcode.value : groupname.value
    }
}

function hideKeyboard() {
    showKeyboard.value = false
    activeInputType.value = ''
    activeInputRef.value = null
}

function handleKeyPress(key) {
    if (!activeInputRef.value) return

    const input = activeInputRef.value
    const currentValue = input.value
    const selectionStart = input.selectionStart
    const selectionEnd = input.selectionEnd

    if (key === '{bksp}') {
        if (selectionStart === selectionEnd && selectionStart > 0) {
            input.value = currentValue.substring(0, selectionStart - 1) + currentValue.substring(selectionStart)
            input.selectionStart = input.selectionEnd = selectionStart - 1
        } else if (selectionStart !== selectionEnd) {
            input.value = currentValue.substring(0, selectionStart) + currentValue.substring(selectionEnd)
            input.selectionStart = input.selectionEnd = selectionStart
        }
    } else if (key === '{enter}') {
        hideKeyboard()
    } else {
        const newValue = currentValue.substring(0, selectionStart) + key + currentValue.substring(selectionEnd)
        input.value = newValue
        const newPosition = selectionStart + key.length
        input.selectionStart = input.selectionEnd = newPosition
    }

    input.dispatchEvent(new Event('input'))
}
</script>

<style scoped>
.usage-box small { display: block; color: #94a3b8; margin-top: 6px; line-height: 1.7; }
</style>
