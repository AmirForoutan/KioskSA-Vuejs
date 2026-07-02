import { ref, computed, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { fetchCustomersApi, saveCustomerApi, updateCustomerStatusApi, deleteTransactionApi, updateTransactionApi, manageCredit, deleteCustomerApi } from '../services/apiService';
import VirtualKeyboard from './VirtualKeyboard.vue';
import { ShwoKeyboardStatus } from '../utilities';
const toast = useToast();
const IsShowKeyboard = ref(false);
// داده‌ها
const customers = ref([]);
const customerSearch = ref('');
const customerFilter = ref('all');
const showCustomerModalFlag = ref(false);
const currentCustomer = ref({});
const showCustomerDetailsModal = ref(false);
const customerDetails = ref({});
const showEditTransactionModal = ref(false);
const currentTransaction = ref({});
const originalCustomerCredit = ref(0);
const deletingCustomerId = ref(null);
// مدیریت کیبورد مجازی
const showKeyboard = ref(false);
const activeInputType = ref('');
const activeInputRef = ref(null);
// refs برای فیلدهای ورودی
const nameInput = ref(null);
const creditInput = ref(null);
const phoneInput = ref(null);
const notesInput = ref(null);
const searchInput = ref(null);
const filterInputRefs = ref({});
// فیلترها
const customerFilters = ref({
    CustomerId: '',
    Mobile: '',
    Email: ''
});
const customerColumns = ref([
    { key: 'CustomerId', title: 'کد مشتری', filterable: true },
    { key: 'FullName', title: 'نام کامل', filterable: true },
    { key: 'Mobile', title: 'موبایل', filterable: true },
    { key: 'CreateDate', title: 'تاریخ ثبت', filterable: true },
    { key: 'IsActive', title: 'وضعیت' },
    { key: 'TotalOrders', title: 'تعداد سفارشات' },
    { key: 'TotalSpent', title: 'مجموع خریدها', filterable: true },
    { key: 'CreditBalance', title: 'اعتبار مشتری', filterable: true }
]);
// محاسبه‌کننده‌ها
const filteredCustomers = computed(() => {
    return customers.value.map(customer => ({
        ...customer
    })).filter(customer => {
        // فیلتر جستجو
        const matchesSearch = !customerSearch.value ||
            String(customer.CustomerId).includes(customerSearch.value) ||
            (customer.FullName && customer.FullName.includes(customerSearch.value)) ||
            (customer.CreditBalance && String(customer.CreditBalance).includes(customerSearch.value)) || // تبدیل به رشته
            (customer.CustomerId && String(customer.CustomerId).includes(customerSearch.value)) || // تبدیل به رشته
            (customer.PhoneNumber && customer.PhoneNumber.includes(customerSearch.value));
        // فیلتر وضعیت
        const matchesStatus = customerFilter.value === 'all' ||
            (customerFilter.value === 'active' && customer.IsActive) ||
            (customerFilter.value === 'inactive' && !customer.IsActive);
        // فیلترهای ستون‌ها
        const matchesFilters = Object.entries(customerFilters.value).every(([key, value]) => {
            if (!value)
                return true;
            // تبدیل مقدار به رشته برای مقایسه
            const customerValue = customer[key] !== null && customer[key] !== undefined
                ? String(customer[key])
                : '';
            return customerValue.includes(value);
        });
        return matchesSearch && matchesStatus && matchesFilters;
    });
});
// توابع
// در تابع fetchCustomers
async function fetchCustomers() {
    try {
        const response = await fetchCustomersApi();
        customers.value = response.data || [];
    }
    catch (error) {
        toast.error('خطا در دریافت اطلاعات مشتریان');
        console.error('Error fetching customers:', error);
    }
}
function getTotalSale(CId) {
    const customer = customers.value.find(c => c.CustomerId === CId);
    if (customer && customer.CreditTransactions) {
        return customer.CreditTransactions.reduce((total, transaction) => {
            return total + (transaction.Amount || 0);
        }, 0);
    }
    return 0;
}
function normalizeCredit(value) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? Math.round(numberValue) : 0;
}
function apiResultIsOk(result) {
    return result && (result.status === true || result.status === 'true' || result.status === 'ok');
}
function apiResultMessage(result, fallback) {
    return result?.message || result?.Message || fallback;
}
function showCustomerModal(customer) {
    originalCustomerCredit.value = customer ? normalizeCredit(customer.CreditBalance) : 0;
    currentCustomer.value = customer ? { ...customer } : {
        CustomerId: 0,
        FullName: '',
        CreditBalance: '',
        PhoneNumber: '',
        Notes: '',
        IsActive: true
    };
    showCustomerModalFlag.value = true;
}
function closeCustomerModal() {
    showCustomerModalFlag.value = false;
    currentCustomer.value = {};
}
async function saveCustomer() {
    try {
        const customer = {
            ...currentCustomer.value,
            CreditBalance: normalizeCredit(currentCustomer.value.CreditBalance)
        };
        const customerId = customer.CustomerId || 0;
        const creditDecrease = originalCustomerCredit.value - customer.CreditBalance;
        if (Number(customerId) > 0 && creditDecrease > 0) {
            const saveResult = await saveCustomerApi({
                ...customer,
                CreditBalance: originalCustomerCredit.value
            });
            if (!apiResultIsOk(saveResult)) {
                toast.error(apiResultMessage(saveResult, 'خطا در ذخیره اطلاعات مشتری'));
                return;
            }
            const creditResult = await manageCredit({
                CustomerId: customerId,
                TransactionType: 2,
                Amount: creditDecrease,
                Description: 'کاهش اعتبار در هنگام ویرایش مشتری'
            });
            if (!apiResultIsOk(creditResult)) {
                toast.error(apiResultMessage(creditResult, 'خطا در کاهش اعتبار مشتری'));
                return;
            }
        }
        else {
            const result = await saveCustomerApi(customer);
            if (!apiResultIsOk(result)) {
                toast.error(apiResultMessage(result, 'خطا در ذخیره اطلاعات مشتری'));
                return;
            }
        }
        toast.success('اطلاعات مشتری با موفقیت ذخیره شد');
        fetchCustomers();
        closeCustomerModal();
    }
    catch (error) {
        toast.error('خطا در ذخیره اطلاعات مشتری');
        console.error('Error saving customer:', error);
    }
}
async function toggleCustomerStatus(customer) {
    try {
        const newStatus = !customer.IsActive;
        const result = await updateCustomerStatusApi(customer.CustomerId, newStatus);
        if (result.status) {
            toast.success(`مشتری با موفقیت ${newStatus ? 'فعال' : 'غیرفعال'} شد`);
            fetchCustomers();
        }
        else {
            toast.error(result.message || 'خطا در تغییر وضعیت مشتری');
        }
    }
    catch (error) {
        toast.error('خطا در تغییر وضعیت مشتری');
        console.error('Error toggling customer status:', error);
    }
}
async function deleteCustomer(customer) {
    if (normalizeCredit(customer.TotalOrders) > 0) {
        toast.error('این مشتری فاکتور دارد و قابل حذف نیست');
        return;
    }
    if (!confirm(`مشتری "${customer.FullName || customer.PhoneNumber || customer.CustomerId}" حذف شود؟`))
        return;
    deletingCustomerId.value = customer.CustomerId;
    try {
        const result = await deleteCustomerApi(customer.CustomerId);
        if (!apiResultIsOk(result)) {
            toast.error(apiResultMessage(result, 'خطا در حذف مشتری'));
            return;
        }
        toast.success(apiResultMessage(result, 'مشتری با موفقیت حذف شد'));
        fetchCustomers();
    }
    catch (error) {
        toast.error('خطا در حذف مشتری');
        console.error('Error deleting customer:', error);
    }
    finally {
        deletingCustomerId.value = null;
    }
}
function viewCustomerOrders(customerId) {
    // این تابع می‌تواند به صفحه سفارشات مشتری هدایت کند
    console.log('View orders for customer:', customerId);
}
function applyCustomerFilters() {
    // فیلترها به صورت computed هستند و به صورت خودکار اعمال می‌شوند
}
function formatPrice(price) {
    return new Intl.NumberFormat('en-US').format(price) + ' تومان';
}
// مقداردهی اولیه
onMounted(() => {
    fetchCustomers();
});
///////////////////////////////////////////////////
function getTransactionTypeText(type) {
    const types = {
        1: 'افزایش اعتبار',
        2: 'کاهش اعتبار',
        3: 'خرید',
        4: 'عودت'
    };
    return types[type] || 'نامشخص';
}
function getTransactionTypeClass(type) {
    const classes = {
        1: 'credit-positive',
        2: 'credit-negative',
        3: 'credit-negative',
        4: 'credit-positive'
    };
    return classes[type] || '';
}
function showCustomerDetails(customer) {
    customerDetails.value = customer;
    showCustomerDetailsModal.value = true;
}
//// ویرایش رسید های مالی
function editTransaction(transaction) {
    currentTransaction.value = { ...transaction };
    showEditTransactionModal.value = true;
}
function closeEditTransactionModal() {
    showEditTransactionModal.value = false;
    currentTransaction.value = {};
}
async function saveTransaction() {
    try {
        // فراخوانی API برای ذخیره تغییرات تراکنش
        const result = await updateTransactionApi(currentTransaction.value);
        if (result.status) {
            toast.success('تراکنش با موفقیت ویرایش شد');
            // بروزرسانی اطلاعات مشتری
            if (customerDetails.value.CustomerId) {
                const customer = customers.value.find(c => c.CustomerId === customerDetails.value.CustomerId);
                if (customer) {
                    // بروزرسانی تراکنش در لیست
                    const index = customer.CreditTransactions.findIndex(t => t.TransactionId === currentTransaction.value.TransactionId);
                    if (index !== -1) {
                        customer.CreditTransactions[index] = { ...currentTransaction.value };
                    }
                    // بروزرسانی جزئیات نمایش داده شده
                    customerDetails.value = { ...customer };
                }
            }
            closeEditTransactionModal();
            fetchCustomers();
        }
        else {
            toast.error(result.message || 'خطا در ویرایش تراکنش');
        }
    }
    catch (error) {
        toast.error('خطا در ویرایش تراکنش');
        console.error('Error saving transaction:', error);
    }
}
async function deleteTransaction() {
    if (!confirm('آیا از حذف این تراکنش اطمینان دارید؟'))
        return;
    try {
        // فراخوانی API برای حذف تراکنش
        const result = await deleteTransactionApi(currentTransaction.value.TransactionId);
        if (result.status) {
            toast.success('تراکنش با موفقیت حذف شد');
            // بروزرسانی اطلاعات مشتری
            if (customerDetails.value.CustomerId) {
                const customer = customers.value.find(c => c.CustomerId === customerDetails.value.CustomerId);
                if (customer) {
                    // حذف تراکنش از لیست
                    customer.CreditTransactions = customer.CreditTransactions.filter(t => t.TransactionId !== currentTransaction.value.TransactionId);
                    // بروزرسانی جزئیات نمایش داده شده
                    customerDetails.value = { ...customer };
                }
            }
            closeEditTransactionModal();
            fetchCustomers();
        }
        else {
            toast.error(result.message || 'خطا در حذف تراکنش');
        }
    }
    catch (error) {
        toast.error('خطا در حذف تراکنش');
        console.error('Error deleting transaction:', error);
    }
}
///// Virtual Keyboard ///////
function handleInputClick(event, inputType) {
    if (IsShowKeyboard.value == true) {
        activeInputType.value = inputType;
        showKeyboard.value = true;
        // تنظیم ref مربوطه
        switch (inputType) {
            case 'name':
                activeInputRef.value = nameInput.value;
                break;
            case 'credit':
                activeInputRef.value = creditInput.value;
                break;
            case 'phone':
                activeInputRef.value = phoneInput.value;
                break;
            case 'notes':
                activeInputRef.value = notesInput.value;
                break;
            case 'search':
                activeInputRef.value = searchInput.value;
                break;
        }
        event.preventDefault();
    }
}
function handleInputFocus(inputType) {
    if (IsShowKeyboard.value == true) {
        activeInputType.value = inputType;
        showKeyboard.value = true;
        // تنظیم ref مربوطه
        switch (inputType) {
            case 'name':
                activeInputRef.value = nameInput.value;
                break;
            case 'credit':
                activeInputRef.value = creditInput.value;
                break;
            case 'phone':
                activeInputRef.value = phoneInput.value;
                break;
            case 'notes':
                activeInputRef.value = notesInput.value;
                break;
            case 'search':
                activeInputRef.value = searchInput.value;
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
    // به روزرسانی مدل داده
    switch (activeInputType.value) {
        case 'name':
            currentCustomer.value.FullName = input.value;
            break;
        case 'credit':
            currentCustomer.value.CreditBalance = input.value;
            break;
        case 'phone':
            currentCustomer.value.PhoneNumber = input.value;
            break;
        case 'notes':
            currentCustomer.value.Notes = input.value;
            break;
        case 'search':
            customerSearch.value = input.value;
            break;
        default:
            // برای فیلترهای ستون‌ها
            if (activeInputType.value.startsWith('filter-')) {
                const columnKey = activeInputType.value.replace('filter-', '');
                customerFilters.value[columnKey] = input.value;
            }
            break;
    }
    // انتشار رویداد input برای به روزرسانی واکنشی
    input.dispatchEvent(new Event('input'));
}
// تابع برای تنظیم refهای فیلترها
function setFilterInputRef(columnKey, el) {
    if (el) {
        filterInputRefs.value[columnKey] = el;
    }
}
// توابع جدید برای مدیریت کلیک و فوکوس روی فیلترهای ستون‌ها
function handleFilterInputClick(event, columnKey) {
    activeInputType.value = `filter-${columnKey}`;
    showKeyboard.value = true;
    activeInputRef.value = filterInputRefs.value[columnKey];
    event.preventDefault();
}
function handleFilterInputFocus(columnKey) {
    activeInputType.value = `filter-${columnKey}`;
    showKeyboard.value = true;
    activeInputRef.value = filterInputRefs.value[columnKey];
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['customers-table']} */ ;
/** @type {__VLS_StyleScopedClasses['customers-table']} */ ;
/** @type {__VLS_StyleScopedClasses['customers-table']} */ ;
/** @type {__VLS_StyleScopedClasses['view-orders-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['activate-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['deactivate-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-customer-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-customer-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['save-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['cancel-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['form-row']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-content']} */ ;
/** @type {__VLS_StyleScopedClasses['info-item']} */ ;
/** @type {__VLS_StyleScopedClasses['transactions-table']} */ ;
/** @type {__VLS_StyleScopedClasses['transactions-table']} */ ;
/** @type {__VLS_StyleScopedClasses['transactions-table']} */ ;
/** @type {__VLS_StyleScopedClasses['transactions-table']} */ ;
/** @type {__VLS_StyleScopedClasses['close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['view-details-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['info-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['transactions-table']} */ ;
/** @type {__VLS_StyleScopedClasses['transactions-table']} */ ;
/** @type {__VLS_StyleScopedClasses['transactions-table']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "customer-management-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "controls-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "search-filter" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.handleInputClick($event, 'search');
        } },
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.handleInputFocus('name');
        } },
    placeholder: "جستجوی مشتری...",
    ...{ class: "search-input" },
    ref: "searchInput",
});
(__VLS_ctx.customerSearch);
/** @type {typeof __VLS_ctx.searchInput} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.customerFilter),
    ...{ class: "category-select" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "all",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "active",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "inactive",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showCustomerModal(null);
        } },
    ...{ class: "add-btn" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "fas fa-plus" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.fetchCustomers) },
    ...{ class: "refresh-btn" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "fas fa-sync-alt" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "customers-table-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
    ...{ class: "customers-table" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
for (const [column] of __VLS_getVForSourceType((__VLS_ctx.customerColumns))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
        key: (column.key),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "column-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (column.title);
    if (column.filterable) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onInput: (__VLS_ctx.applyCustomerFilters) },
            ...{ onClick: (...[$event]) => {
                    if (!(column.filterable))
                        return;
                    __VLS_ctx.handleFilterInputClick($event, column.key);
                } },
            ...{ onFocus: (...[$event]) => {
                    if (!(column.filterable))
                        return;
                    __VLS_ctx.handleFilterInputFocus(column.key);
                } },
            placeholder: (`فیلتر ${column.title}`),
            ...{ class: "filter-input" },
            ref: (el => __VLS_ctx.setFilterInputRef(column.key, el)),
        });
        (__VLS_ctx.customerFilters[column.key]);
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
for (const [customer] of __VLS_getVForSourceType((__VLS_ctx.filteredCustomers))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
        key: (customer.CustomerId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    (customer.CustomerId);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    (customer.FullName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    (customer.PhoneNumber);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    (customer.CreateDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    (customer.IsActive ? 'فعال' : 'غیرفعال');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    (customer.TotalOrders || 0);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    (__VLS_ctx.formatPrice(customer.TotalSpent));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    (__VLS_ctx.formatPrice(customer.CreditBalance || 0));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "customer-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.showCustomerModal(customer);
            } },
        ...{ class: "edit-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-edit" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.toggleCustomerStatus(customer);
            } },
        ...{ class: (customer.IsActive ? 'deactivate-btn' : 'activate-btn') },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: (customer.IsActive ? 'fas fa-ban' : 'fas fa-check') },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.showCustomerDetails(customer);
            } },
        ...{ class: "view-details-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-eye" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.deleteCustomer(customer);
            } },
        ...{ class: "delete-customer-btn" },
        disabled: (__VLS_ctx.deletingCustomerId === customer.CustomerId || __VLS_ctx.normalizeCredit(customer.TotalOrders) > 0),
        title: (__VLS_ctx.normalizeCredit(customer.TotalOrders) > 0 ? 'این مشتری فاکتور دارد و قابل حذف نیست' : 'حذف مشتری'),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-trash" },
    });
}
if (__VLS_ctx.showCustomerModalFlag) {
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
    (__VLS_ctx.currentCustomer.CustomerId ? 'ویرایش مشتری' : 'افزودن مشتری جدید');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeCustomerModal) },
        ...{ class: "modal-close-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.saveCustomer) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showCustomerModalFlag))
                    return;
                __VLS_ctx.handleInputClick($event, 'name');
            } },
        ...{ onFocus: (...[$event]) => {
                if (!(__VLS_ctx.showCustomerModalFlag))
                    return;
                __VLS_ctx.handleInputFocus('name');
            } },
        required: true,
        ...{ class: "form-input" },
        ref: "nameInput",
    });
    (__VLS_ctx.currentCustomer.FullName);
    /** @type {typeof __VLS_ctx.nameInput} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showCustomerModalFlag))
                    return;
                __VLS_ctx.handleInputClick($event, 'credit');
            } },
        ...{ onFocus: (...[$event]) => {
                if (!(__VLS_ctx.showCustomerModalFlag))
                    return;
                __VLS_ctx.handleInputFocus('credit');
            } },
        type: "text",
        value: (__VLS_ctx.currentCustomer.CreditBalance),
        required: true,
        ...{ class: "form-input" },
        oninput: "\u0074\u0068\u0069\u0073\u002e\u0076\u0061\u006c\u0075\u0065\u003d\u0074\u0068\u0069\u0073\u002e\u0076\u0061\u006c\u0075\u0065\u002e\u0072\u0065\u0070\u006c\u0061\u0063\u0065\u0028\u002f\u005b\u005e\u0030\u002d\u0039\u002e\u005d\u002f\u0067\u002c\u0027\u0027\u0029\u002e\u0072\u0065\u0070\u006c\u0061\u0063\u0065\u0028\u002f\u0028\u005c\u002e\u002e\u002a\u0029\u005c\u002e\u002f\u0067\u002c\u0020\u0027\u0024\u0031\u0027\u0029\u003b",
        ref: "creditInput",
    });
    /** @type {typeof __VLS_ctx.creditInput} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showCustomerModalFlag))
                    return;
                __VLS_ctx.handleInputClick($event, 'phone');
            } },
        ...{ onFocus: (...[$event]) => {
                if (!(__VLS_ctx.showCustomerModalFlag))
                    return;
                __VLS_ctx.handleInputFocus('phone');
            } },
        required: true,
        ...{ class: "form-input" },
        type: "tel",
        ref: "phoneInput",
        pattern: "09[0-9]{9}",
    });
    (__VLS_ctx.currentCustomer.PhoneNumber);
    /** @type {typeof __VLS_ctx.phoneInput} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showCustomerModalFlag))
                    return;
                __VLS_ctx.handleInputClick($event, 'notes');
            } },
        ...{ onFocus: (...[$event]) => {
                if (!(__VLS_ctx.showCustomerModalFlag))
                    return;
                __VLS_ctx.handleInputFocus('notes');
            } },
        value: (__VLS_ctx.currentCustomer.Notes),
        ...{ class: "form-input" },
        type: "text",
        ref: "notesInput",
    });
    /** @type {typeof __VLS_ctx.notesInput} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.currentCustomer.IsActive),
        ...{ class: "form-select" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (true),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (false),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeCustomerModal) },
        type: "button",
        ...{ class: "cancel-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        type: "submit",
        ...{ class: "save-btn" },
    });
}
if (__VLS_ctx.showCustomerDetailsModal) {
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
    (__VLS_ctx.customerDetails.FullName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showCustomerDetailsModal))
                    return;
                __VLS_ctx.showCustomerDetailsModal = false;
            } },
        ...{ class: "modal-close-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "customer-info-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.customerDetails.CustomerId);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.customerDetails.FullName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.customerDetails.PhoneNumber);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.customerDetails.CreateDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.formatPrice(__VLS_ctx.customerDetails.CreditBalance || 0));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.customerDetails.IsActive ? 'فعال' : 'غیرفعال');
    if (__VLS_ctx.customerDetails.CreditTransactions && __VLS_ctx.customerDetails.CreditTransactions.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "transactions-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "transactions-table" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [transaction] of __VLS_getVForSourceType((__VLS_ctx.customerDetails.CreditTransactions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (transaction.TransactionId),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (transaction.TransactionId);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (transaction.InvoiceId);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: (__VLS_ctx.getTransactionTypeClass(transaction.TransactionType)) },
            });
            (__VLS_ctx.getTransactionTypeText(transaction.TransactionType));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.formatPrice(transaction.Amount));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (transaction.Description || 'بدون توضیح');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (transaction.TransactionDate);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            if (transaction.TransactionType === 1) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.showCustomerDetailsModal))
                                return;
                            if (!(__VLS_ctx.customerDetails.CreditTransactions && __VLS_ctx.customerDetails.CreditTransactions.length > 0))
                                return;
                            if (!(transaction.TransactionType === 1))
                                return;
                            __VLS_ctx.editTransaction(transaction);
                        } },
                    ...{ class: "edit-btn" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: "fas fa-edit" },
                });
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "no-action" },
                });
            }
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "no-data" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showCustomerDetailsModal))
                    return;
                __VLS_ctx.showCustomerDetailsModal = false;
            } },
        ...{ class: "close-btn" },
    });
}
if (__VLS_ctx.showEditTransactionModal) {
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeEditTransactionModal) },
        ...{ class: "modal-close-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.saveTransaction) },
    });
    if (__VLS_ctx.currentTransaction.TransactionType === 1) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-group" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "number",
            required: true,
            ...{ class: "form-input" },
            min: "0",
            step: "1000",
        });
        (__VLS_ctx.currentTransaction.Amount);
    }
    if (__VLS_ctx.currentTransaction.TransactionType === 1) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-group" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
            value: (__VLS_ctx.currentTransaction.Description),
            ...{ class: "form-input" },
            rows: "3",
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-actions" },
    });
    if (__VLS_ctx.currentTransaction.TransactionId && __VLS_ctx.currentTransaction.TransactionType === 1) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.deleteTransaction) },
            type: "button",
            ...{ class: "delete-btn" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeEditTransactionModal) },
        type: "button",
        ...{ class: "cancel-btn" },
    });
    if (__VLS_ctx.currentTransaction.TransactionType === 1) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            type: "submit",
            ...{ class: "save-btn" },
        });
    }
    if (__VLS_ctx.currentTransaction.TransactionType !== 1) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "readonly-message" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
}
if (__VLS_ctx.showKeyboard && __VLS_ctx.activeInputRef) {
    /** @type {[typeof VirtualKeyboard, ]} */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(VirtualKeyboard, new VirtualKeyboard({
        ...{ 'onKeyPress': {} },
        ...{ 'onHide': {} },
        inputRef: (__VLS_ctx.activeInputRef),
    }));
    const __VLS_1 = __VLS_0({
        ...{ 'onKeyPress': {} },
        ...{ 'onHide': {} },
        inputRef: (__VLS_ctx.activeInputRef),
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
/** @type {__VLS_StyleScopedClasses['customer-management-section']} */ ;
/** @type {__VLS_StyleScopedClasses['controls-row']} */ ;
/** @type {__VLS_StyleScopedClasses['search-filter']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['category-select']} */ ;
/** @type {__VLS_StyleScopedClasses['add-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-plus']} */ ;
/** @type {__VLS_StyleScopedClasses['refresh-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-sync-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['customers-table-container']} */ ;
/** @type {__VLS_StyleScopedClasses['customers-table']} */ ;
/** @type {__VLS_StyleScopedClasses['column-header']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-input']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['edit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-edit']} */ ;
/** @type {__VLS_StyleScopedClasses['view-details-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-eye']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-customer-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-trash']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-content']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-header']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-body']} */ ;
/** @type {__VLS_StyleScopedClasses['form-row']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-row']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['cancel-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['save-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-content']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-header']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-body']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-info-section']} */ ;
/** @type {__VLS_StyleScopedClasses['info-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['info-item']} */ ;
/** @type {__VLS_StyleScopedClasses['info-item']} */ ;
/** @type {__VLS_StyleScopedClasses['info-item']} */ ;
/** @type {__VLS_StyleScopedClasses['info-item']} */ ;
/** @type {__VLS_StyleScopedClasses['info-item']} */ ;
/** @type {__VLS_StyleScopedClasses['info-item']} */ ;
/** @type {__VLS_StyleScopedClasses['transactions-section']} */ ;
/** @type {__VLS_StyleScopedClasses['transactions-table']} */ ;
/** @type {__VLS_StyleScopedClasses['edit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-edit']} */ ;
/** @type {__VLS_StyleScopedClasses['no-action']} */ ;
/** @type {__VLS_StyleScopedClasses['no-data']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-content']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-header']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-body']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-input']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['cancel-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['save-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['readonly-message']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            VirtualKeyboard: VirtualKeyboard,
            customerSearch: customerSearch,
            customerFilter: customerFilter,
            showCustomerModalFlag: showCustomerModalFlag,
            currentCustomer: currentCustomer,
            showCustomerDetailsModal: showCustomerDetailsModal,
            customerDetails: customerDetails,
            showEditTransactionModal: showEditTransactionModal,
            currentTransaction: currentTransaction,
            deletingCustomerId: deletingCustomerId,
            showKeyboard: showKeyboard,
            activeInputRef: activeInputRef,
            nameInput: nameInput,
            creditInput: creditInput,
            phoneInput: phoneInput,
            notesInput: notesInput,
            searchInput: searchInput,
            customerFilters: customerFilters,
            customerColumns: customerColumns,
            filteredCustomers: filteredCustomers,
            fetchCustomers: fetchCustomers,
            normalizeCredit: normalizeCredit,
            showCustomerModal: showCustomerModal,
            closeCustomerModal: closeCustomerModal,
            saveCustomer: saveCustomer,
            toggleCustomerStatus: toggleCustomerStatus,
            deleteCustomer: deleteCustomer,
            applyCustomerFilters: applyCustomerFilters,
            formatPrice: formatPrice,
            getTransactionTypeText: getTransactionTypeText,
            getTransactionTypeClass: getTransactionTypeClass,
            showCustomerDetails: showCustomerDetails,
            editTransaction: editTransaction,
            closeEditTransactionModal: closeEditTransactionModal,
            saveTransaction: saveTransaction,
            deleteTransaction: deleteTransaction,
            handleInputClick: handleInputClick,
            handleInputFocus: handleInputFocus,
            hideKeyboard: hideKeyboard,
            handleKeyPress: handleKeyPress,
            setFilterInputRef: setFilterInputRef,
            handleFilterInputClick: handleFilterInputClick,
            handleFilterInputFocus: handleFilterInputFocus,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
