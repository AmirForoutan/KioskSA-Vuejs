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
                    <label>قیمت فروش (تومان):</label>
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
                    <label>موجودی اولیه/نمایشی:</label>
                    <input v-model.number="localProduct.StockInventory" value="0" type="text" ref="stockInventory"
                        @click="handleInputClick($event, 'inventory')" @focus="handleInputFocus('inventory')" />
                </div>

                <div class="settings-box">
                    <h4>تنظیمات انبار و هشدار موجودی</h4>
                    <div class="settings-grid">
                        <div class="form-group">
                            <label>حداقل موجودی:</label>
                            <input v-model.number="localProduct.MinStock" value="0" type="text" ref="minStock"
                                @click="handleInputClick($event, 'minstock')" @focus="handleInputFocus('minstock')" />
                        </div>
                        <div class="form-group">
                            <label>حداکثر موجودی:</label>
                            <input v-model.number="localProduct.MaxStock" value="0" type="text" ref="maxStock"
                                @click="handleInputClick($event, 'maxstock')" @focus="handleInputFocus('maxstock')" />
                        </div>
                        <div class="form-group">
                            <label>نقطه سفارش مجدد:</label>
                            <input v-model.number="localProduct.ReorderPoint" value="0" type="text" ref="reorderPoint"
                                @click="handleInputClick($event, 'reorderpoint')" @focus="handleInputFocus('reorderpoint')" />
                        </div>
                    </div>
                </div>

                <div class="settings-box">
                    <h4>کاربرد کالا</h4>
                    <p class="hint">نمایش در کیوسک از سطح دسته‌بندی کنترل می‌شود.</p>
                    <div class="usage-grid">
                        <label class="usage-toggle">
                            <input v-model="localProduct.IsPurchasable" type="checkbox" />
                            <span>قابل استفاده در فاکتور خرید</span>
                        </label>
                        <label class="usage-toggle">
                            <input v-model="localProduct.IsSellable" type="checkbox" />
                            <span>نمایش در صفحه فروش PC</span>
                        </label>
                    </div>
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
const showKeyboard = ref(false)
const activeInputType = ref('')
const activeInputRef = ref(null)
const isNumberMode = ref(false)

const goodscode = ref(null)
const goodsname = ref(null)
const goodsprice = ref(null)
const goodstax = ref(null)
const goodsduty = ref(null)
const packingprice = ref(null)
const goodsdescription = ref(null)
const stockInventory = ref(null)
const minStock = ref(null)
const maxStock = ref(null)
const reorderPoint = ref(null)

const toast = useToast({ position: 'top-right', style: { fontFamily: 'Vazirmatn-FD-Black' } })

const props = defineProps({
    product: { type: Object, required: true },
    categories: { type: Array, required: true },
    products: { type: Array, default: () => [] }
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

function defaultProduct() {
    return {
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
        MinStock: 0,
        MaxStock: 0,
        ReorderPoint: 0,
        DefaultWarehouseId: null,
        IsPurchasable: true,
        IsSellable: true,
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
    }
}

function normalizeProduct(value) {
    const base = defaultProduct()
    const merged = { ...base, ...(value || {}) }
    merged.MinStock = Number(merged.MinStock || 0)
    merged.MaxStock = Number(merged.MaxStock || 0)
    merged.ReorderPoint = Number(merged.ReorderPoint || 0)
    merged.IsPurchasable = merged.IsPurchasable !== false
    merged.IsSellable = merged.IsSellable !== false
    merged.IsActive = merged.IsActive !== false
    return merged
}

const localProduct = ref(defaultProduct())

watch(() => props.product, (newVal) => {
    localProduct.value = normalizeProduct(newVal)
}, { immediate: true })

function save() {
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

watch(() => localProduct.value, () => { setTimeout(loadDatePicker, 100); }, { deep: true });

onMounted(() => { loadDatePicker(); IsShowKeyboard.value = ShwoKeyboardStatus(); });

function loadDatePicker() {
    jalaliDatepicker.startWatch({ autoShow: false });
    const inputList = document.querySelectorAll("input[data-jdp]:not([data-jdp-initialized])");
    for (let i = 0; i < inputList.length; i++) {
        inputList[i].setAttribute('data-jdp-initialized', 'true');
        inputList[i].addEventListener('focus', function () {
            if (this.hasAttribute("data-jdp-option-1")) {
                jalaliDatepicker.updateOptions({ date: false, time: true, hasSecond: false, showEmptyBtn: false, initTime: '00:00', zIndex: 2502 });
            } else if (this.hasAttribute("data-jdp-option-2")) {
                jalaliDatepicker.updateOptions({ date: false, time: true, hasSecond: false, showEmptyBtn: false, initTime: '23:59', zIndex: 2502 });
            }
            jalaliDatepicker.show(this);
        });
    }
}

function generateNewProductCode() {
    const selectedCategory = localProduct.value.GoodsGroupId
    if (!selectedCategory) return '1000'
    const categoryProducts = props.products.filter(p => p.GoodsGroupId == selectedCategory)
    if (categoryProducts.length === 0) {
        const category = props.categories.find(c => c.GroupId == selectedCategory)
        if (category) {
            const categoryCode = parseInt(category.GroupCode)
            return isNaN(categoryCode) ? '1000' : (categoryCode * 100).toString()
        }
        return '1000'
    }
    const maxCode = Math.max(...categoryProducts.map(prod => {
        const codeNum = parseInt(prod.GoodsCode)
        return isNaN(codeNum) ? 0 : codeNum
    }))
    return (maxCode + 1).toString()
}

watch(() => props.product, (newVal) => {
    localProduct.value = normalizeProduct(newVal)
    if (!newVal.GoodsId && props.products.length > 0) localProduct.value.GoodsCode = generateNewProductCode()
}, { immediate: true })

watch(() => localProduct.value.GoodsGroupId, (newVal) => {
    if (!props.product.GoodsId && newVal) localProduct.value.GoodsCode = generateNewProductCode()
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
            localProduct.value[`FromTime${day.name}`] = '00:00'
            localProduct.value[`ToTime${day.name}`] = '23:59'
        }
    })
}, { deep: true })

const numberModeInputs = ['code', 'price', 'tax', 'duty', 'packprice', 'inventory', 'minstock', 'maxstock', 'reorderpoint']

function handleInputClick(event, inputType) {
    if (IsShowKeyboard.value == true) {
        activeInputType.value = inputType
        showKeyboard.value = true
        isNumberMode.value = numberModeInputs.includes(inputType)
        activeInputRef.value = getInputRef(inputType)
        event.preventDefault()
    }
}

function handleInputFocus(inputType) {
    if (IsShowKeyboard.value == true) {
        activeInputType.value = inputType
        showKeyboard.value = true
        isNumberMode.value = numberModeInputs.includes(inputType)
        activeInputRef.value = getInputRef(inputType)
    }
}

function getInputRef(inputType) {
    switch (inputType) {
        case 'code': return goodscode.value
        case 'name': return goodsname.value
        case 'price': return goodsprice.value
        case 'tax': return goodstax.value
        case 'duty': return goodsduty.value
        case 'packprice': return packingprice.value
        case 'desc': return goodsdescription.value
        case 'inventory': return stockInventory.value
        case 'minstock': return minStock.value
        case 'maxstock': return maxStock.value
        case 'reorderpoint': return reorderPoint.value
        default: return null
    }
}

function hideKeyboard() { showKeyboard.value = false; activeInputType.value = ''; activeInputRef.value = null; isNumberMode.value = false }

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
.settings-box { margin: 12px 0; padding: 12px; border-radius: 14px; background: rgba(15,23,42,.55); border: 1px solid rgba(255,255,255,.08); }
.settings-box h4 { margin: 0 0 10px; }
.settings-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.usage-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.usage-toggle { min-height: 44px; display: flex; align-items: center; gap: 8px; padding: 9px 10px; border-radius: 12px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); }
.usage-toggle input { width: 20px; height: 20px; }
.hint { margin: -4px 0 10px; color: #94a3b8; font-size: 12px; }
@media (max-width: 900px) { .settings-grid, .usage-grid { grid-template-columns: 1fr; } }
</style>
