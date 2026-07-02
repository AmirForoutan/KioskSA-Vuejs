<template>
    <div class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h3>{{ topping.ToppingId ? 'ویرایش تاپینگ کالا' : 'افزودن تاپینگ جدید' }}</h3>
                <button @click="$emit('close')" class="close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="modal-body">
                <div class="form-group">
                    <label>کالا:</label>
                    <select v-model="localTopping.GoodsId">
                        <option v-for="product in products" :value="product.GoodsId" :key="product.GoodsId">
                            {{ product.GoodsName }}
                        </option>
                    </select>
                </div>

                <div class="form-group">
                    <label>قلم تاپینگ:</label>
                    <select v-model="localTopping.GoodsToppingId">
                        <option v-for="item in toppingItems" :value="item.GoodsId" :key="item.GoodsId">
                            {{ item.GoodsName }}
                        </option>
                    </select>
                </div>

                <div class="form-group">
                    <label>مرحله:</label>
                    <select v-model="localTopping.LevelId">
                        <option v-for="level in toppingLevels" :value="level.LevelId" :key="level.LevelId">
                            {{ level.LevelTitle }}
                        </option>
                    </select>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>تعداد پیش‌فرض:</label>
                        <input v-model.number="localTopping.GoodsCountDefault" type="text" min="0" ref="defcount"
                            @click="handleInputClick($event, 'count')" @focus="handleInputFocus('count')" />
                    </div>
                    <div class="form-group">
                        <label>قیمت (تومان):</label>
                        <input v-model.number="localTopping.Price" type="text" min="0" ref="topprice"
                            @click="handleInputClick($event, 'price')" @focus="handleInputFocus('price')" />
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>قیمت ظرف (تومان):</label>
                        <input v-model.number="localTopping.containerPrice" type="text" min="0" ref="pckingprice"
                            @click="handleInputClick($event, 'packprice')" @focus="handleInputFocus('packprice')" />
                    </div>
                    <div class="form-group">
                        <label>تعداد فعلی:</label>
                        <input v-model.number="localTopping.GoodsCount" type="text" min="0" ref="currentcount"
                            @click="handleInputClick($event, 'curcount')" @focus="handleInputFocus('curcount')" />
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>حداقل انتخاب:</label>
                        <input v-model.number="localTopping.MinCount" type="text" min="0" ref="minimum"
                            @click="handleInputClick($event, 'min')" @focus="handleInputFocus('min')" />
                    </div>
                    <div class="form-group">
                        <label>حداکثر انتخاب:</label>
                        <input v-model.number="localTopping.MaxCount" type="text" min="0" ref="maximum"
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
import { useToast } from 'vue-toastification'
import { ShwoKeyboardStatus } from '../utilities'
import VirtualKeyboard from './VirtualKeyboard.vue'


const IsShowKeyboard = ref(false)

// مدیریت کیبورد مجازی
const showKeyboard = ref(false)
const activeInputType = ref('')
const activeInputRef = ref(null)
const isNumberMode = ref(false)

// refs برای فیلدهای ورودی
const defcount = ref(null)
const topprice = ref(null)
const pckingprice = ref(null)
const currentcount = ref(null)
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
})

const emit = defineEmits(['save', 'close'])

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
})

watch(() => props.topping, (newVal) => {
    localTopping.value = { ...newVal }
}, { immediate: true })

watch(() => props.products, (newVal) => {
    if (newVal.length > 0 && !localTopping.value.GoodsId) {
        localTopping.value.GoodsId = newVal[0].GoodsId
    }
}, { immediate: true })

watch(() => props.toppingItems, (newVal) => {
    if (newVal.length > 0 && !localTopping.value.GoodsToppingId) {
        localTopping.value.GoodsToppingId = newVal[0].GoodsId
    }
}, { immediate: true })

watch(() => props.toppingLevels, (newVal) => {
    if (newVal.length > 0 && !localTopping.value.LevelId) {
        localTopping.value.LevelId = newVal[0].LevelId
    }
}, { immediate: true })

function save() {
    if (!localTopping.value.GoodsId || !localTopping.value.GoodsToppingId || !localTopping.value.LevelId) {
        toast.error('انتخاب کالا، قلم تاپینگ و مرحله الزامی است')
        return
    }

    if (localTopping.value.MinCount > localTopping.value.MaxCount) {
        toast.error('حداقل انتخاب نمی‌تواند از حداکثر بیشتر باشد')
        return
    }

    emit('save', localTopping.value)
}

////////////////////////
///// Virtual Keyboard ///////

const numberModeInputs = ['count', 'price', 'packprice', 'curcount', 'min', 'max']

function handleInputClick(event, inputType) {
    if (IsShowKeyboard.value == true) {

        activeInputType.value = inputType
        showKeyboard.value = true

        isNumberMode.value = numberModeInputs.includes(inputType)

        // تنظیم ref مربوطه
        switch (inputType) {
            case 'count': activeInputRef.value = defcount.value; break
            case 'price': activeInputRef.value = topprice.value; break
            case 'packprice': activeInputRef.value = pckingprice.value; break
            case 'curcount': activeInputRef.value = currentcount.value; break
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
            case 'count': activeInputRef.value = defcount.value; break
            case 'price': activeInputRef.value = topprice.value; break
            case 'packprice': activeInputRef.value = pckingprice.value; break
            case 'curcount': activeInputRef.value = currentcount.value; break
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