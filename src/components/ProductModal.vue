<template>
    <div class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h3>{{ product.GoodsId ? 'ویرایش کالا' : 'افزودن کالای جدید' }}</h3>
                <button @click="$emit('close')" class="close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="modal-body">
                <div class="form-group">
                    <label>کد کالا:</label>
                    <input v-model="localProduct.GoodsCode" type="text" ref="goodscode"
                        @click="handleInputClick($event, 'code')" @focus="handleInputFocus('code')" />
                </div>

                <div class="form-group">
                    <label>نام کالا:</label>
                    <input v-model="localProduct.GoodsName" type="text" ref="goodsname"
                        @click="handleInputClick($event, 'name')" @focus="handleInputFocus('name')" />
                </div>

                <div class="form-group">
                    <label>دسته‌بندی:</label>
                    <select v-model="localProduct.GoodsGroupId">
                        <option v-for="category in categories" :value="category.GroupId" :key="category.GroupId">
                            {{ category.GroupName }}
                        </option>
                    </select>
                </div>

                <div class="form-group">
                    <label>قیمت (تومان):</label>
                    <input v-model.number="localProduct.GoodsPrice" value="0" type="text" ref="goodsprice"
                        @click="handleInputClick($event, 'price')" @focus="handleInputFocus('price')" />
                </div>

                <div class="form-group">
                    <label>درصد مالیات:</label>
                    <input v-model.number="localProduct.TaxPercent" maxlength="2" value="0" type="text" ref="goodstax"
                        @click="handleInputClick($event, 'tax')" @focus="handleInputFocus('tax')" />
                </div>

                <div class="form-group">
                    <label>درصد عوارض:</label>
                    <input v-model.number="localProduct.DutyPercent" value="0" maxlength="2" type="text" ref="goodsduty"
                        @click="handleInputClick($event, 'duty')" @focus="handleInputFocus('duty')" />
                </div>

                <div class="form-group">
                    <label>قیمت بسته‌بندی:</label>
                    <input v-model.number="localProduct.PackingPrice" value="0" type="text" ref="packingprice"
                        @click="handleInputClick($event, 'packprice')" @focus="handleInputFocus('packprice')" />
                </div>

                <div class="form-group">
                    <label>موجودی کالا:</label>
                    <input v-model.number="localProduct.StockInventory" value="0" type="text" ref="stockInventory"
                        @click="handleInputClick($event, 'inventory')" @focus="handleInputFocus('inventory')" />
                </div>

                <div class="form-group">
                    <label>توضیحات:</label>
                    <textarea v-model="localProduct.GoodsDescription" rows="3" ref="goodsdescription"
                        @click="handleInputClick($event, 'desc')" @focus="handleInputFocus('desc')"></textarea>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>وضعیت:</label>
                        <label class="switch">
                            <input v-model="localProduct.IsActive" type="checkbox" />
                            <span class="slider round"></span>
                        </label>
                        <span>{{ localProduct.IsActive ? 'فعال' : 'غیرفعال' }}</span>
                    </div>
                </div>

                <!-- روزهای هفته و ساعات کاری -->
                <div class="time-settings">
                    <h4>تنظیمات زمانی:</h4>
                    <div v-for="day in daysOfWeek" :key="day.key" class="day-setting">
                        <div class="day-header">
                            <label class="switch">
                                <input v-model="localProduct[day.key]" type="checkbox" @click="loadDatePicker()" />
                                <span class="slider round"></span>
                            </label>
                            <span>{{ day.label }}</span>
                        </div>
                        <div v-if="localProduct[day.key]" class="time-inputs">
                            <div class="form-group">
                                <label>از ساعت:</label>
                                <input v-model="localProduct[`FromTime${day.name}`]" data-jdp data-jdp-option-1
                                    type="text" value="00:00" readonly />
                            </div>
                            <div class="form-group">
                                <label>تا ساعت:</label>
                                <input v-model="localProduct[`ToTime${day.name}`]" data-jdp data-jdp-option-2
                                    type="text" value="23:59" readonly />
                            </div>
                        </div>
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
import "@majidh1/jalalidatepicker";
import "@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css";
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
const goodscode = ref(null)
const goodsname = ref(null)
const goodsprice = ref(null)
const goodstax = ref(null)
const goodsduty = ref(null)
const packingprice = ref(null)
const goodsdescription = ref(null)
const stockInventory = ref(null)


const toast = useToast({
    position: 'top-right',
    style: {
        fontFamily: 'Vazirmatn-FD-Black'
    }
})


const props = defineProps({
    product: {
        type: Object,
        required: true
    },
    categories: {
        type: Array,
        required: true
    },
    products: {
        type: Array,
        default: () => []
    }
})

const emit = defineEmits(['save', 'close'])


const daysOfWeek = [
    { key: 'Saturday', name: 'Saturday', label: 'شنبه' },
    { key: 'Sunday', name: 'Sunday', label: 'یکشنبه' },
    { key: 'Monday', name: 'Monday', label: 'دوشنبه' },
    { key: 'Tuesday', name: 'Tuesday', label: 'سه‌شنبه' },
    { key: 'Wednesday', name: 'Wednesday', label: 'چهارشنبه' },
    { key: 'Thursday', name: 'Thursday', label: 'پنجشنبه' },
    { key: 'Friday', name: 'Friday', label: 'جمعه' }
]

const localProduct = ref({
    GoodsId: 0,
    GoodsCode: '',
    GoodsName: '',
    GoodsDescription: '',
    GoodsPrice: 0,
    TaxPercent: 0,
    DutyPercent: 0,
    PackingPrice: 0,
    GoodsGroupId: 0,
    StockInventory: 0,
    IsActive: true,
    Saturday: true,
    FromTimeSaturday: '00:00',
    ToTimeSaturday: '23:59',
    Sunday: true,
    FromTimeSunday: '00:00',
    ToTimeSunday: '23:59',
    Monday: true,
    FromTimeMonday: '00:00',
    ToTimeMonday: '23:59',
    Tuesday: true,
    FromTimeTuesday: '00:00',
    ToTimeTuesday: '23:59',
    Wednesday: true,
    FromTimeWednesday: '00:00',
    ToTimeWednesday: '23:59',
    Thursday: true,
    FromTimeThursday: '00:00',
    ToTimeThursday: '23:59',
    Friday: true,
    FromTimeFriday: '00:00',
    ToTimeFriday: '23:59'
})

// مقداردهی اولیه با داده‌های دریافتی
watch(() => props.product, (newVal) => {
    localProduct.value = { ...newVal }
}, { immediate: true })

function save() {
    // اعتبارسنجی داده‌ها
    if (!localProduct.value.GoodsCode || !localProduct.value.GoodsName) {
        toast.error('کد و نام کالا الزامی است')
        return
    }

    if (localProduct.value.GoodsPrice < 0) {
        toast.error('قیمت کالا نمی‌تواند منفی باشد')
        return
    }

    emit('save', localProduct.value)
}

watch(() => localProduct.value, (newVal) => {
    // با تاخیر 100 میلی‌ثانیه صبر می‌کنیم تا DOM به روز رسانی شود
    setTimeout(loadDatePicker, 100);
}, { deep: true });

onMounted(() => {
    loadDatePicker();
    IsShowKeyboard.value = ShwoKeyboardStatus();
});

function loadDatePicker() {
    jalaliDatepicker.startWatch({
        autoShow: false
    });

    // فقط inputهایی که هنوز رویداد focus برایشان تنظیم نشده را انتخاب کنید
    const inputList = document.querySelectorAll("input[data-jdp]:not([data-jdp-initialized])");

    for (let i = 0; i < inputList.length; i++) {
        inputList[i].setAttribute('data-jdp-initialized', 'true');

        inputList[i].addEventListener('focus', function () {
            if (this.hasAttribute("data-jdp-option-1")) {
                jalaliDatepicker.updateOptions({
                    date: false,
                    time: true,
                    hasSecond: false,
                    showEmptyBtn: false,
                    initTime: '00:00',
                    zIndex: 2502
                });
            }
            else if (this.hasAttribute("data-jdp-option-2")) {
                jalaliDatepicker.updateOptions({
                    date: false,
                    time: true,
                    hasSecond: false,
                    showEmptyBtn: false,
                    initTime: '23:59',
                    zIndex: 2502
                });
            }
            jalaliDatepicker.show(this);
        });
    }
}


function generateNewProductCode() {
    const selectedCategory = localProduct.value.GoodsGroupId

    // اگر دسته‌بندی انتخاب نشده، کد اولیه
    if (!selectedCategory) return '1000'

    // فیلتر کردن محصولات این دسته‌بندی
    const categoryProducts = props.products.filter(p => p.GoodsGroupId == selectedCategory)

    if (categoryProducts.length === 0) {
        // اگر محصولی در این دسته‌بندی نیست، کد دسته‌بندی * 100
        const category = props.categories.find(c => c.GroupId == selectedCategory)
        if (category) {
            const categoryCode = parseInt(category.GroupCode)
            return isNaN(categoryCode) ? '1000' : (categoryCode * 100).toString()
        }
        return '1000'
    }

    // پیدا کردن بالاترین کد عددی در این دسته‌بندی
    const maxCode = Math.max(...categoryProducts.map(prod => {
        const codeNum = parseInt(prod.GoodsCode)
        return isNaN(codeNum) ? 0 : codeNum
    }))

    return (maxCode + 1).toString()
}

watch(() => props.product, (newVal) => {
    localProduct.value = { ...newVal }
    // اگر در حال افزودن محصول جدید هستیم، کد را تولید کنیم
    if (!newVal.GoodsId && props.products.length > 0) {
        localProduct.value.GoodsCode = generateNewProductCode()
    }
}, { immediate: true })

// همچنین یک واچر برای تغییرات دسته‌بندی اضافه کنید
watch(() => localProduct.value.GoodsGroupId, (newVal) => {
    if (!props.product.GoodsId && newVal) {
        localProduct.value.GoodsCode = generateNewProductCode()
    }
})

watch(() => [
    localProduct.value.Saturday,
    localProduct.value.Sunday,
    localProduct.value.Monday,
    localProduct.value.Tuesday,
    localProduct.value.Wednesday,
    localProduct.value.Thursday,
    localProduct.value.Friday
], (newValues, oldValues) => {
    daysOfWeek.forEach((day, index) => {
        if (newValues[index] && !oldValues[index]) {
            // اگر روز فعال شده و قبلا غیرفعال بوده
            localProduct.value[`FromTime${day.name}`] = '00:00'
            localProduct.value[`ToTime${day.name}`] = '23:59'
        }
    })
}, { deep: true })



////////////////////////
///// Virtual Keyboard ///////

const numberModeInputs = ['code', 'price', 'tax', 'duty', 'packprice']


function handleInputClick(event, inputType) {
    if (IsShowKeyboard.value == true) {
        activeInputType.value = inputType
        showKeyboard.value = true

        isNumberMode.value = numberModeInputs.includes(inputType)

        // تنظیم ref مربوطه
        switch (inputType) {
            case 'code': activeInputRef.value = goodscode.value; break
            case 'name': activeInputRef.value = goodsname.value; break
            case 'price': activeInputRef.value = goodsprice.value; break
            case 'tax': activeInputRef.value = goodstax.value; break
            case 'duty': activeInputRef.value = goodsduty.value; break
            case 'packprice': activeInputRef.value = packingprice.value; break
            case 'desc': activeInputRef.value = goodsdescription.value; break
            case 'inventory': activeInputRef.value = stockInventory.value; break
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
            case 'code': activeInputRef.value = goodscode.value; break
            case 'name': activeInputRef.value = goodsname.value; break
            case 'price': activeInputRef.value = goodsprice.value; break
            case 'tax': activeInputRef.value = goodstax.value; break
            case 'duty': activeInputRef.value = goodsduty.value; break
            case 'packprice': activeInputRef.value = packingprice.value; break
            case 'desc': activeInputRef.value = goodsdescription.value; break
            case 'inventory': activeInputRef.value = stockInventory.value; break
        }
    }
}

function hideKeyboard() {
    showKeyboard.value = false
    activeInputType.value = ''
    activeInputRef.value = null
    isNumberMode.value = false
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
