<template>
    <div class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h3>{{ item.GoodsId ? 'ویرایش قلم تاپینگ' : 'افزودن قلم تاپینگ جدید' }}</h3>
                <button @click="$emit('close')" class="close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="modal-body">
                <div class="form-group">
                    <label>کد قلم تاپینگ:</label>
                    <input v-model="localItem.GoodsCode" type="text" ref="itemcode"
                        @click="handleInputClick($event, 'code')" @focus="handleInputFocus('code')" />
                </div>

                <div class="form-group">
                    <label>نام قلم تاپینگ:</label>
                    <input v-model="localItem.GoodsName" type="text" ref="itemname"
                        @click="handleInputClick($event, 'name')" @focus="handleInputFocus('name')" />
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>درصد مالیات:</label>
                        <input v-model.number="localItem.TaxPercent" type="text" ref="itemtax"
                            @click="handleInputClick($event, 'tax')" @focus="handleInputFocus('tax')" />
                    </div>
                    <div class="form-group">
                        <label>درصد عوارض:</label>
                        <input v-model.number="localItem.DutyPercent" type="text" ref="itemduty"
                            @click="handleInputClick($event, 'duty')" @focus="handleInputFocus('duty')" />
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
import VirtualKeyboard from './VirtualKeyboard.vue'
import { ShwoKeyboardStatus } from '../utilities'

const IsShowKeyboard = ref(false)

// مدیریت کیبورد مجازی
const showKeyboard = ref(false)
const activeInputType = ref('')
const activeInputRef = ref(null)
const isNumberMode = ref(false)

// refs برای فیلدهای ورودی
const itemcode = ref(null)
const itemname = ref(null)
const itemtax = ref(null)
const itemduty = ref(null)

onMounted(() => {
    IsShowKeyboard.value = ShwoKeyboardStatus();
})

const toast = useToast({
    position: 'top-right',
    style: {
        fontFamily: 'Vazirmatn-FD-Black'
    }
})

const props = defineProps({
    item: {
        type: Object,
        required: true
    },
    toppingItems: { // اضافه کردن پراپ toppingItems
        type: Array,
        default: () => []
    }
})

const emit = defineEmits(['save', 'close'])

const localItem = ref({
    GoodsId: 0,
    GoodsCode: '',
    GoodsName: '',
    TaxPercent: 0,
    DutyPercent: 0,
    IsActive: true
})

// تابع برای تولید کد جدید آیتم تاپینگ
function generateNewToppingCode() {
    if (props.toppingItems.length === 0) {
        return '1' // شروع از 1 اگر آیتمی وجود ندارد
    }

    // پیدا کردن بالاترین کد عددی
    const maxCode = Math.max(...props.toppingItems.map(item => {
        const codeNum = parseInt(item.GoodsCode)
        return isNaN(codeNum) ? 0 : codeNum
    }))

    return (maxCode + 1).toString()
}

watch(() => props.item, (newVal) => {
    localItem.value = { ...newVal }
    // اگر در حال افزودن آیتم جدید هستیم، کد را تولید کنیم
    if (!newVal.GoodsId && props.toppingItems.length > 0) {
        localItem.value.GoodsCode = generateNewToppingCode()
    }
}, { immediate: true })

function save() {
    if (!localItem.value.GoodsCode || !localItem.value.GoodsName) {
        toast.error('کد و نام قلم تاپینگ الزامی است')
        return
    }
    emit('save', localItem.value)
}


////////////////////////
///// Virtual Keyboard ///////

const numberModeInputs = ['code', 'tax', 'duty']

function handleInputClick(event, inputType) {
    if (IsShowKeyboard.value == true) {
        activeInputType.value = inputType
        showKeyboard.value = true

        isNumberMode.value = numberModeInputs.includes(inputType)

        // تنظیم ref مربوطه
        switch (inputType) {
            case 'code': activeInputRef.value = itemcode.value; break
            case 'name': activeInputRef.value = itemname.value; break
            case 'tax': activeInputRef.value = itemtax.value; break
            case 'duty': activeInputRef.value = itemduty.value; break
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
            case 'code': activeInputRef.value = itemcode.value; break
            case 'name': activeInputRef.value = itemname.value; break
            case 'tax': activeInputRef.value = itemtax.value; break
            case 'duty': activeInputRef.value = itemduty.value; break
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