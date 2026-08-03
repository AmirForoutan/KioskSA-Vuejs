import { ref, watch, onMounted } from 'vue';
import "@majidh1/jalalidatepicker";
import "@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css";
import { useToast } from 'vue-toastification';
import VirtualKeyboard from './VirtualKeyboard.vue';
import { ShwoKeyboardStatus } from '../utilities';
const IsShowKeyboard = ref(false);
const showKeyboard = ref(false);
const activeInputType = ref('');
const activeInputRef = ref(null);
const isNumberMode = ref(false);
const goodscode = ref(null);
const goodsname = ref(null);
const goodsprice = ref(null);
const goodstax = ref(null);
const goodsduty = ref(null);
const packingprice = ref(null);
const goodsdescription = ref(null);
const stockInventory = ref(null);
const minStock = ref(null);
const maxStock = ref(null);
const reorderPoint = ref(null);
const toast = useToast({ position: 'top-right', style: { fontFamily: 'Vazirmatn-FD-Black' } });
const props = defineProps({
    product: { type: Object, required: true },
    categories: { type: Array, required: true },
    products: { type: Array, default: () => [] }
});
const emit = defineEmits(['save', 'close']);
const daysOfWeek = [
    { key: 'Saturday', name: 'Saturday', label: 'شنبه' },
    { key: 'Sunday', name: 'Sunday', label: 'یکشنبه' },
    { key: 'Monday', name: 'Monday', label: 'دوشنبه' },
    { key: 'Tuesday', name: 'Tuesday', label: 'سه‌شنبه' },
    { key: 'Wednesday', name: 'Wednesday', label: 'چهارشنبه' },
    { key: 'Thursday', name: 'Thursday', label: 'پنجشنبه' },
    { key: 'Friday', name: 'Friday', label: 'جمعه' }
];
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
    };
}
function normalizeProduct(value) {
    const base = defaultProduct();
    const merged = { ...base, ...(value || {}) };
    merged.MinStock = Number(merged.MinStock || 0);
    merged.MaxStock = Number(merged.MaxStock || 0);
    merged.ReorderPoint = Number(merged.ReorderPoint || 0);
    merged.IsPurchasable = merged.IsPurchasable !== false;
    merged.IsSellable = merged.IsSellable !== false;
    merged.IsActive = merged.IsActive !== false;
    return merged;
}
const localProduct = ref(defaultProduct());
watch(() => props.product, (newVal) => {
    localProduct.value = normalizeProduct(newVal);
}, { immediate: true });
function save() {
    if (!localProduct.value.GoodsCode || !localProduct.value.GoodsName) {
        toast.error('کد و نام کالا الزامی است');
        return;
    }
    if (localProduct.value.GoodsPrice < 0) {
        toast.error('قیمت کالا نمی‌تواند منفی باشد');
        return;
    }
    emit('save', localProduct.value);
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
            }
            else if (this.hasAttribute("data-jdp-option-2")) {
                jalaliDatepicker.updateOptions({ date: false, time: true, hasSecond: false, showEmptyBtn: false, initTime: '23:59', zIndex: 2502 });
            }
            jalaliDatepicker.show(this);
        });
    }
}
function generateNewProductCode() {
    const selectedCategory = localProduct.value.GoodsGroupId;
    if (!selectedCategory)
        return '1000';
    const categoryProducts = props.products.filter(p => p.GoodsGroupId == selectedCategory);
    if (categoryProducts.length === 0) {
        const category = props.categories.find(c => c.GroupId == selectedCategory);
        if (category) {
            const categoryCode = parseInt(category.GroupCode);
            return isNaN(categoryCode) ? '1000' : (categoryCode * 100).toString();
        }
        return '1000';
    }
    const maxCode = Math.max(...categoryProducts.map(prod => {
        const codeNum = parseInt(prod.GoodsCode);
        return isNaN(codeNum) ? 0 : codeNum;
    }));
    return (maxCode + 1).toString();
}
watch(() => props.product, (newVal) => {
    localProduct.value = normalizeProduct(newVal);
    if (!newVal.GoodsId && props.products.length > 0)
        localProduct.value.GoodsCode = generateNewProductCode();
}, { immediate: true });
watch(() => localProduct.value.GoodsGroupId, (newVal) => {
    if (!props.product.GoodsId && newVal)
        localProduct.value.GoodsCode = generateNewProductCode();
});
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
            localProduct.value[`FromTime${day.name}`] = '00:00';
            localProduct.value[`ToTime${day.name}`] = '23:59';
        }
    });
}, { deep: true });
const numberModeInputs = ['code', 'price', 'tax', 'duty', 'packprice', 'inventory', 'minstock', 'maxstock', 'reorderpoint'];
function handleInputClick(event, inputType) {
    if (IsShowKeyboard.value == true) {
        activeInputType.value = inputType;
        showKeyboard.value = true;
        isNumberMode.value = numberModeInputs.includes(inputType);
        activeInputRef.value = getInputRef(inputType);
        event.preventDefault();
    }
}
function handleInputFocus(inputType) {
    if (IsShowKeyboard.value == true) {
        activeInputType.value = inputType;
        showKeyboard.value = true;
        isNumberMode.value = numberModeInputs.includes(inputType);
        activeInputRef.value = getInputRef(inputType);
    }
}
function getInputRef(inputType) {
    switch (inputType) {
        case 'code': return goodscode.value;
        case 'name': return goodsname.value;
        case 'price': return goodsprice.value;
        case 'tax': return goodstax.value;
        case 'duty': return goodsduty.value;
        case 'packprice': return packingprice.value;
        case 'desc': return goodsdescription.value;
        case 'inventory': return stockInventory.value;
        case 'minstock': return minStock.value;
        case 'maxstock': return maxStock.value;
        case 'reorderpoint': return reorderPoint.value;
        default: return null;
    }
}
function hideKeyboard() { showKeyboard.value = false; activeInputType.value = ''; activeInputRef.value = null; isNumberMode.value = false; }
function handleKeyPress(key) {
    if (!activeInputRef.value)
        return;
    const input = activeInputRef.value;
    const currentValue = input.value;
    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;
    if (key === '{bksp}') {
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
        hideKeyboard();
    }
    else {
        const newValue = currentValue.substring(0, selectionStart) + key + currentValue.substring(selectionEnd);
        input.value = newValue;
        const newPosition = selectionStart + key.length;
        input.selectionStart = input.selectionEnd = newPosition;
    }
    input.dispatchEvent(new Event('input'));
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['settings-box']} */ ;
/** @type {__VLS_StyleScopedClasses['usage-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['usage-grid']} */ ;
// CSS variable injection 
// CSS variable injection end 
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
(__VLS_ctx.product.GoodsId ? 'ویرایش کالا' : 'افزودن کالای جدید');
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
    value: (__VLS_ctx.localProduct.GoodsCode),
    type: "text",
    ref: "goodscode",
});
/** @type {typeof __VLS_ctx.goodscode} */ ;
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
    value: (__VLS_ctx.localProduct.GoodsName),
    type: "text",
    ref: "goodsname",
});
/** @type {typeof __VLS_ctx.goodsname} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.localProduct.GoodsGroupId),
});
for (const [category] of __VLS_getVForSourceType((__VLS_ctx.categories))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (category.GroupId),
        key: (category.GroupId),
    });
    (category.GroupName);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.handleInputClick($event, 'price');
        } },
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.handleInputFocus('price');
        } },
    value: (__VLS_ctx.localProduct.GoodsPrice),
    value: "0",
    type: "text",
    ref: "goodsprice",
});
/** @type {typeof __VLS_ctx.goodsprice} */ ;
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
    value: (__VLS_ctx.localProduct.TaxPercent),
    maxlength: "2",
    value: "0",
    type: "text",
    ref: "goodstax",
});
/** @type {typeof __VLS_ctx.goodstax} */ ;
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
    value: (__VLS_ctx.localProduct.DutyPercent),
    value: "0",
    maxlength: "2",
    type: "text",
    ref: "goodsduty",
});
/** @type {typeof __VLS_ctx.goodsduty} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.handleInputClick($event, 'packprice');
        } },
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.handleInputFocus('packprice');
        } },
    value: (__VLS_ctx.localProduct.PackingPrice),
    value: "0",
    type: "text",
    ref: "packingprice",
});
/** @type {typeof __VLS_ctx.packingprice} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.handleInputClick($event, 'inventory');
        } },
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.handleInputFocus('inventory');
        } },
    value: (__VLS_ctx.localProduct.StockInventory),
    value: "0",
    type: "text",
    ref: "stockInventory",
});
/** @type {typeof __VLS_ctx.stockInventory} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-box" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.handleInputClick($event, 'minstock');
        } },
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.handleInputFocus('minstock');
        } },
    value: (__VLS_ctx.localProduct.MinStock),
    value: "0",
    type: "text",
    ref: "minStock",
});
/** @type {typeof __VLS_ctx.minStock} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.handleInputClick($event, 'maxstock');
        } },
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.handleInputFocus('maxstock');
        } },
    value: (__VLS_ctx.localProduct.MaxStock),
    value: "0",
    type: "text",
    ref: "maxStock",
});
/** @type {typeof __VLS_ctx.maxStock} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.handleInputClick($event, 'reorderpoint');
        } },
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.handleInputFocus('reorderpoint');
        } },
    value: (__VLS_ctx.localProduct.ReorderPoint),
    value: "0",
    type: "text",
    ref: "reorderPoint",
});
/** @type {typeof __VLS_ctx.reorderPoint} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-box" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "hint" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "usage-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "usage-toggle" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "checkbox",
});
(__VLS_ctx.localProduct.IsPurchasable);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "usage-toggle" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "checkbox",
});
(__VLS_ctx.localProduct.IsSellable);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.handleInputClick($event, 'desc');
        } },
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.handleInputFocus('desc');
        } },
    value: (__VLS_ctx.localProduct.GoodsDescription),
    rows: "3",
    ref: "goodsdescription",
});
/** @type {typeof __VLS_ctx.goodsdescription} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "switch" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "checkbox",
});
(__VLS_ctx.localProduct.IsActive);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "slider round" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.localProduct.IsActive ? 'فعال' : 'غیرفعال');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "time-settings" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
for (const [day] of __VLS_getVForSourceType((__VLS_ctx.daysOfWeek))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (day.key),
        ...{ class: "day-setting" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "day-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "switch" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.loadDatePicker();
            } },
        type: "checkbox",
    });
    (__VLS_ctx.localProduct[day.key]);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "slider round" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (day.label);
    if (__VLS_ctx.localProduct[day.key]) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "time-inputs" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-group" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            value: (__VLS_ctx.localProduct[`FromTime${day.name}`]),
            'data-jdp': true,
            'data-jdp-option-1': true,
            type: "text",
            value: "00:00",
            readonly: true,
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-group" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            value: (__VLS_ctx.localProduct[`ToTime${day.name}`]),
            'data-jdp': true,
            'data-jdp-option-2': true,
            type: "text",
            value: "23:59",
            readonly: true,
        });
    }
}
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
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-box']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-box']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['usage-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['usage-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['usage-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-row']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['switch']} */ ;
/** @type {__VLS_StyleScopedClasses['slider']} */ ;
/** @type {__VLS_StyleScopedClasses['round']} */ ;
/** @type {__VLS_StyleScopedClasses['time-settings']} */ ;
/** @type {__VLS_StyleScopedClasses['day-setting']} */ ;
/** @type {__VLS_StyleScopedClasses['day-header']} */ ;
/** @type {__VLS_StyleScopedClasses['switch']} */ ;
/** @type {__VLS_StyleScopedClasses['slider']} */ ;
/** @type {__VLS_StyleScopedClasses['round']} */ ;
/** @type {__VLS_StyleScopedClasses['time-inputs']} */ ;
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
            goodscode: goodscode,
            goodsname: goodsname,
            goodsprice: goodsprice,
            goodstax: goodstax,
            goodsduty: goodsduty,
            packingprice: packingprice,
            goodsdescription: goodsdescription,
            stockInventory: stockInventory,
            minStock: minStock,
            maxStock: maxStock,
            reorderPoint: reorderPoint,
            daysOfWeek: daysOfWeek,
            localProduct: localProduct,
            save: save,
            loadDatePicker: loadDatePicker,
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
