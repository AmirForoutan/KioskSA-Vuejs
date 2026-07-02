<template>
    <div class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h3>{{ level.LevelId ? 'ویرایش مرحله تاپینگ' : 'افزودن مرحله تاپینگ جدید' }}</h3>
                <button @click="$emit('close')" class="close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="modal-body">
                <div class="form-group">
                    <label>عنوان مرحله:</label>
                    <input v-model="localLevel.LevelTitle" type="text" ref="levelname"
                        @click="handleInputClick($event, 'name')" @focus="handleInputFocus('name')" />
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>اولویت:</label>
                        <input v-model.number="localLevel.Priority" type="text" ref="periority"
                            @click="handleInputClick($event, 'per')" @focus="handleInputFocus('per')" />
                    </div>
                    <div class="form-group">
                        <label>حداقل انتخاب:</label>
                        <input v-model.number="localLevel.MinCount" type="text" ref="minimum"
                            @click="handleInputClick($event, 'min')" @focus="handleInputFocus('min')" />
                    </div>
                    <div class="form-group">
                        <label>حداکثر انتخاب:</label>
                        <input v-model.number="localLevel.MaxCount" type="text" ref="maximum"
                            @click="handleInputClick($event, 'max')" @focus="handleInputFocus('max')" />
                    </div>
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
import { useToast } from 'vue-toastification';
import VirtualKeyboard from './VirtualKeyboard.vue';
import { ShwoKeyboardStatus } from '../utilities'

const IsShowKeyboard = ref(false)

// مدیریت کیبورد مجازی
const showKeyboard = ref(false)
const activeInputType = ref('')
const activeInputRef = ref(null)
const isNumberMode = ref(false)

// refs برای فیلدهای ورودی
const levelname = ref(null)
const periority = ref(null)
const minimum = ref(null)
const maximum = ref(null)

const toast = useToast({
    position: 'top-right',
    style: {
        fontFamily: 'Vazirmatn-FD-Black'
    }
})

onMounted(() => {
    IsShowKeyboard.value = ShwoKeyboardStatus();
})

const props = defineProps({
    level: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['save', 'close'])

const localLevel = ref({
    LevelId: 0,
    LevelTitle: '',
    Priority: 0,
    MinCount: 0,
    MaxCount: 0
})

watch(() => props.level, (newVal) => {
    localLevel.value = { ...newVal }
}, { immediate: true })

function save() {
    if (!localLevel.value.LevelTitle) {
        toast.error('عنوان مرحله الزامی است')
        return
    }

    if (localLevel.value.MinCount > localLevel.value.MaxCount) {
        toast.error('حداقل انتخاب نمی‌تواند از حداکثر بیشتر باشد')
        return
    }

    emit('save', localLevel.value)
}


////////////////////////
///// Virtual Keyboard ///////

const numberModeInputs = ['per', 'min', 'max']

function handleInputClick(event, inputType) {
    if (IsShowKeyboard.value == true) {

        activeInputType.value = inputType
        showKeyboard.value = true

        isNumberMode.value = numberModeInputs.includes(inputType)

        // تنظیم ref مربوطه
        switch (inputType) {
            case 'name': activeInputRef.value = levelname.value; break
            case 'per': activeInputRef.value = periority.value; break
            case 'min': activeInputRef.value = minimum.value; break
            case 'max': activeInputRef.value = maximum.value; break
        }

        event.preventDefault()
    }
}

function handleInputFocus(inputType) {
    if (IsShowKeyboard.value == true) {

        activeInputType.value = inputType
        showKeyboard.value = true

        isNumberMode.value = numberModeInputs.includes(inputType)

        // تنظیم ref مربوطه
        switch (inputType) {
            case 'name': activeInputRef.value = levelname.value; break
            case 'per': activeInputRef.value = periority.value; break
            case 'min': activeInputRef.value = minimum.value; break
            case 'max': activeInputRef.value = maximum.value; break
        }
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
        // حذف کاراکتر
        if (selectionStart === selectionEnd && selectionStart > 0) {
            input.value = currentValue.substring(0, selectionStart - 1) + currentValue.substring(selectionStart)
            input.selectionStart = input.selectionEnd = selectionStart - 1
        } else if (selectionStart !== selectionEnd) {
            input.value = currentValue.substring(0, selectionStart) + currentValue.substring(selectionEnd)
            input.selectionStart = input.selectionEnd = selectionStart
        }
    } else if (key === '{enter}') {
        // ثبت و مخفی کردن کیبورد
        hideKeyboard()
    } else {
        // درج کاراکتر جدید
        const newValue = currentValue.substring(0, selectionStart) + key + currentValue.substring(selectionEnd)
        input.value = newValue
        const newPosition = selectionStart + key.length
        input.selectionStart = input.selectionEnd = newPosition
    }

    // انتشار رویداد input برای به روزرسانی واکنشی
    input.dispatchEvent(new Event('input'))
}
</script>