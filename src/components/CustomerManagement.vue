<template>
    <div class="customer-management-section">
        <div class="controls-row">
            <div class="search-filter">
                <input v-model="customerSearch" placeholder="جستجوی مشتری..." class="search-input" ref="searchInput"
                    @click="handleInputClick($event, 'search')" @focus="handleInputFocus('name')" />
                <select v-model="customerFilter" class="category-select">
                    <option value="all">همه مشتریان</option>
                    <option value="active">فعال</option>
                    <option value="inactive">غیرفعال</option>
                </select>
                <button @click="showCustomerModal(null)" class="add-btn">
                    <i class="fas fa-plus"></i> افزودن مشتری
                </button>
                <button class="refresh-btn" @click="fetchCustomers">
                    <i class="fas fa-sync-alt"></i>
                </button>
            </div>
        </div>

        <div class="customers-table-container">
            <table class="customers-table">
                <thead>
                    <tr>
                        <th v-for="column in customerColumns" :key="column.key">
                            <div class="column-header">
                                <span>{{ column.title }}</span>
                                <input v-if="column.filterable" v-model="customerFilters[column.key]"
                                    @input="applyCustomerFilters" :placeholder="`فیلتر ${column.title}`"
                                    class="filter-input" :ref="el => setFilterInputRef(column.key, el)"
                                    @click="handleFilterInputClick($event, column.key)"
                                    @focus="handleFilterInputFocus(column.key)" />
                            </div>
                        </th>
                        <th>عملیات</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="customer in filteredCustomers" :key="customer.CustomerId">
                        <td>{{ customer.CustomerId }}</td>
                        <td>{{ customer.FullName }}</td>
                        <td>{{ customer.PhoneNumber }}</td>
                        <td>{{ customer.CreateDate }}</td>
                        <td>{{ customer.IsActive ? 'فعال' : 'غیرفعال' }}</td>
                        <td>{{ customer.TotalOrders || 0 }}</td>
                        <td>{{ formatPrice(customer.TotalSpent) }}</td>
                        <td>{{ formatPrice(customer.CreditBalance || 0) }}</td>
                        <td>
                            <div class="customer-actions">
                                <button @click="showCustomerModal(customer)" class="edit-btn" title="ویرایش">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button @click="toggleCustomerStatus(customer)"
                                    :class="customer.IsActive ? 'deactivate-btn' : 'activate-btn'"
                                    :title="customer.IsActive ? 'غیرفعال کردن' : 'فعال کردن'">
                                    <i :class="customer.IsActive ? 'fas fa-ban' : 'fas fa-check'"></i>
                                </button>
                                <button @click="showCustomerDetails(customer)" class="view-details-btn"
                                    title="مشاهده سابقه">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button @click="deleteCustomer(customer)" class="delete-customer-btn"
                                    :disabled="deletingCustomerId === customer.CustomerId || normalizeCredit(customer.TotalOrders) > 0"
                                    :title="normalizeCredit(customer.TotalOrders) > 0 ? 'این مشتری فاکتور دارد و قابل حذف نیست' : 'حذف مشتری'">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- مدال مدیریت مشتری -->
        <div v-if="showCustomerModalFlag" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>{{ currentCustomer.CustomerId ? 'ویرایش مشتری' : 'افزودن مشتری جدید' }}</h3>
                    <button @click="closeCustomerModal" class="modal-close-btn">×</button>
                </div>
                <div class="modal-body">
                    <form @submit.prevent="saveCustomer">
                        <div class="form-row">
                            <div class="form-group">
                                <label>نام:</label>
                                <input v-model="currentCustomer.FullName" required class="form-input" ref="nameInput"
                                    @click="handleInputClick($event, 'name')" @focus="handleInputFocus('name')" />
                            </div>
                            <div class="form-group">
                                <label>میزان اعتبار:</label>
                                <input type="text" v-model="currentCustomer.CreditBalance" required class="form-input"
                                    oninput="this.value=this.value.replace(/[^0-9.]/g,'').replace(/(\..*)\./g, '$1');"
                                    ref="creditInput" @click="handleInputClick($event, 'credit')"
                                    @focus="handleInputFocus('credit')" />
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>موبایل:</label>
                                <input v-model="currentCustomer.PhoneNumber" required class="form-input" type="tel"
                                    ref="phoneInput" @click="handleInputClick($event, 'phone')"
                                    @focus="handleInputFocus('phone')" pattern="09[0-9]{9}" />
                            </div>
                            <div class="form-group">
                                <label>توضیحات:</label>
                                <input v-model="currentCustomer.Notes" class="form-input" type="text" ref="notesInput"
                                    @click="handleInputClick($event, 'notes')" @focus="handleInputFocus('notes')" />
                            </div>
                        </div>

                        <div class="form-group">
                            <label>وضعیت:</label>
                            <select v-model="currentCustomer.IsActive" class="form-select">
                                <option :value="true">فعال</option>
                                <option :value="false">غیرفعال</option>
                            </select>
                        </div>

                        <div class="modal-actions">
                            <button type="button" @click="closeCustomerModal" class="cancel-btn">انصراف</button>
                            <button type="submit" class="save-btn">ذخیره</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- مدال جزئیات مشتری -->
    <div v-if="showCustomerDetailsModal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h3>جزئیات مشتری - {{ customerDetails.FullName }}</h3>
                <button @click="showCustomerDetailsModal = false" class="modal-close-btn">×</button>
            </div>
            <div class="modal-body">
                <div class="customer-info-section">
                    <h4>اطلاعات اصلی</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>کد مشتری:</label>
                            <span>{{ customerDetails.CustomerId }}</span>
                        </div>
                        <div class="info-item">
                            <label>نام کامل:</label>
                            <span>{{ customerDetails.FullName }}</span>
                        </div>
                        <div class="info-item">
                            <label>موبایل:</label>
                            <span>{{ customerDetails.PhoneNumber }}</span>
                        </div>
                        <div class="info-item">
                            <label>تاریخ ثبت:</label>
                            <span>{{ customerDetails.CreateDate }}</span>
                        </div>
                        <div class="info-item">
                            <label>اعتبار فعلی:</label>
                            <span>{{ formatPrice(customerDetails.CreditBalance || 0) }}</span>
                        </div>
                        <div class="info-item">
                            <label>وضعیت:</label>
                            <span>{{ customerDetails.IsActive ? 'فعال' : 'غیرفعال' }}</span>
                        </div>
                    </div>
                </div>

                <div class="transactions-section"
                    v-if="customerDetails.CreditTransactions && customerDetails.CreditTransactions.length > 0">
                    <h4>تراکنش‌های اعتباری</h4>
                    <div class="transactions-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>شناسه تراکنش</th>
                                    <th>شناسه فاکتور</th>
                                    <th>نوع تراکنش</th>
                                    <th>مبلغ</th>
                                    <th>توضیحات</th>
                                    <th>تاریخ تراکنش</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="transaction in customerDetails.CreditTransactions"
                                    :key="transaction.TransactionId">
                                    <td>{{ transaction.TransactionId }}</td>
                                    <td>{{ transaction.InvoiceId }}</td>
                                    <td>
                                        <span :class="getTransactionTypeClass(transaction.TransactionType)">
                                            {{ getTransactionTypeText(transaction.TransactionType) }}
                                        </span>
                                    </td>
                                    <td>{{ formatPrice(transaction.Amount) }}</td>
                                    <td>{{ transaction.Description || 'بدون توضیح' }}</td>
                                    <td>{{ transaction.TransactionDate }}</td>
                                    <td>
                                        <!-- فقط برای تراکنش‌های افزایش اعتبار دکمه ویرایش نمایش داده شود -->
                                        <button v-if="transaction.TransactionType === 1"
                                            @click="editTransaction(transaction)" class="edit-btn">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <span v-else class="no-action">—</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div v-else class="no-data">
                    <p>هیچ تراکنشی یافت نشد</p>
                </div>

                <div class="modal-actions">
                    <button @click="showCustomerDetailsModal = false" class="close-btn">بستن</button>
                </div>
            </div>
        </div>
    </div>


    <!-- مدال ویرایش تراکنش -->
    <div v-if="showEditTransactionModal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h3>ویرایش تراکنش افزایش اعتبار</h3>
                <button @click="closeEditTransactionModal" class="modal-close-btn">×</button>
            </div>
            <div class="modal-body">
                <form @submit.prevent="saveTransaction">
                    <div class="form-group" v-if="currentTransaction.TransactionType === 1">
                        <label>مبلغ:</label>
                        <input type="number" v-model="currentTransaction.Amount" required class="form-input" min="0"
                            step="1000" />
                    </div>

                    <div class="form-group" v-if="currentTransaction.TransactionType === 1">
                        <label>توضیحات:</label>
                        <textarea v-model="currentTransaction.Description" class="form-input" rows="3"></textarea>
                    </div>

                    <div class="modal-actions">
                        <button type="button" @click="deleteTransaction" class="delete-btn"
                            v-if="currentTransaction.TransactionId && currentTransaction.TransactionType === 1">
                            حذف تراکنش
                        </button>
                        <button type="button" @click="closeEditTransactionModal" class="cancel-btn">انصراف</button>
                        <button type="submit" class="save-btn" v-if="currentTransaction.TransactionType === 1">ذخیره
                            تغییرات</button>
                    </div>
                </form>

                <!-- پیام برای تراکنش‌های غیرقابل ویرایش -->
                <div v-if="currentTransaction.TransactionType !== 1" class="readonly-message">
                    <p>این تراکنش قابل ویرایش نیست. فقط تراکنش‌های افزایش اعتبار امکان ویرایش دارند.</p>
                </div>
            </div>
        </div>
    </div>


    <!-- کیبورد مجازی -->
    <VirtualKeyboard v-if="showKeyboard && activeInputRef" :input-ref="activeInputRef" @key-press="handleKeyPress"
        @hide="hideKeyboard" />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { fetchCustomersApi, saveCustomerApi, updateCustomerStatusApi, deleteTransactionApi, updateTransactionApi, manageCredit, deleteCustomerApi } from '../services/apiService'
import VirtualKeyboard from './VirtualKeyboard.vue'
import { ShwoKeyboardStatus } from '../utilities'

const toast = useToast()

const IsShowKeyboard = ref(false)

// داده‌ها
const customers = ref([])
const customerSearch = ref('')
const customerFilter = ref('all')
const showCustomerModalFlag = ref(false)
const currentCustomer = ref({})
const showCustomerDetailsModal = ref(false)
const customerDetails = ref({})
const showEditTransactionModal = ref(false)
const currentTransaction = ref({})
const originalCustomerCredit = ref(0)
const deletingCustomerId = ref(null)


// مدیریت کیبورد مجازی
const showKeyboard = ref(false)
const activeInputType = ref('')
const activeInputRef = ref(null)

// refs برای فیلدهای ورودی
const nameInput = ref(null)
const creditInput = ref(null)
const phoneInput = ref(null)
const notesInput = ref(null)
const searchInput = ref(null)
const filterInputRefs = ref({})

// فیلترها
const customerFilters = ref({
    CustomerId: '',
    Mobile: '',
    Email: ''
})

const customerColumns = ref([
    { key: 'CustomerId', title: 'کد مشتری', filterable: true },
    { key: 'FullName', title: 'نام کامل', filterable: true },
    { key: 'Mobile', title: 'موبایل', filterable: true },
    { key: 'CreateDate', title: 'تاریخ ثبت', filterable: true },
    { key: 'IsActive', title: 'وضعیت' },
    { key: 'TotalOrders', title: 'تعداد سفارشات' },
    { key: 'TotalSpent', title: 'مجموع خریدها', filterable: true },
    { key: 'CreditBalance', title: 'اعتبار مشتری', filterable: true }
])

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
            (customer.PhoneNumber && customer.PhoneNumber.includes(customerSearch.value))

        // فیلتر وضعیت
        const matchesStatus = customerFilter.value === 'all' ||
            (customerFilter.value === 'active' && customer.IsActive) ||
            (customerFilter.value === 'inactive' && !customer.IsActive)

        // فیلترهای ستون‌ها
        const matchesFilters = Object.entries(customerFilters.value).every(([key, value]) => {
            if (!value) return true

            // تبدیل مقدار به رشته برای مقایسه
            const customerValue = customer[key] !== null && customer[key] !== undefined
                ? String(customer[key])
                : '';
            return customerValue.includes(value)
        })

        return matchesSearch && matchesStatus && matchesFilters
    })
})

// توابع
// در تابع fetchCustomers
async function fetchCustomers() {
    try {
        const response = await fetchCustomersApi()
        customers.value = response.data || []

    } catch (error) {
        toast.error('خطا در دریافت اطلاعات مشتریان')
        console.error('Error fetching customers:', error)
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
    const numberValue = Number(value)
    return Number.isFinite(numberValue) ? Math.round(numberValue) : 0
}

function apiResultIsOk(result) {
    return result && (result.status === true || result.status === 'true' || result.status === 'ok')
}

function apiResultMessage(result, fallback) {
    return result?.message || result?.Message || fallback
}

function showCustomerModal(customer) {
    originalCustomerCredit.value = customer ? normalizeCredit(customer.CreditBalance) : 0
    currentCustomer.value = customer ? { ...customer } : {
        CustomerId: 0,
        FullName: '',
        CreditBalance: '',
        PhoneNumber: '',
        Notes: '',
        IsActive: true
    }
    showCustomerModalFlag.value = true
}

function closeCustomerModal() {
    showCustomerModalFlag.value = false
    currentCustomer.value = {}
}

async function saveCustomer() {
    try {
        const customer = {
            ...currentCustomer.value,
            CreditBalance: normalizeCredit(currentCustomer.value.CreditBalance)
        }
        const customerId = customer.CustomerId || 0
        const creditDecrease = originalCustomerCredit.value - customer.CreditBalance

        if (Number(customerId) > 0 && creditDecrease > 0) {
            const saveResult = await saveCustomerApi({
                ...customer,
                CreditBalance: originalCustomerCredit.value
            })
            if (!apiResultIsOk(saveResult)) {
                toast.error(apiResultMessage(saveResult, 'خطا در ذخیره اطلاعات مشتری'))
                return
            }

            const creditResult = await manageCredit({
                CustomerId: customerId,
                TransactionType: 2,
                Amount: creditDecrease,
                Description: 'کاهش اعتبار در هنگام ویرایش مشتری'
            })
            if (!apiResultIsOk(creditResult)) {
                toast.error(apiResultMessage(creditResult, 'خطا در کاهش اعتبار مشتری'))
                return
            }
        } else {
            const result = await saveCustomerApi(customer)
            if (!apiResultIsOk(result)) {
                toast.error(apiResultMessage(result, 'خطا در ذخیره اطلاعات مشتری'))
                return
            }
        }

        toast.success('اطلاعات مشتری با موفقیت ذخیره شد')
        fetchCustomers()
        closeCustomerModal()
    } catch (error) {
        toast.error('خطا در ذخیره اطلاعات مشتری')
        console.error('Error saving customer:', error)
    }
}

async function toggleCustomerStatus(customer) {
    try {
        const newStatus = !customer.IsActive
        const result = await updateCustomerStatusApi(customer.CustomerId, newStatus)

        if (result.status) {
            toast.success(`مشتری با موفقیت ${newStatus ? 'فعال' : 'غیرفعال'} شد`)
            fetchCustomers()
        } else {
            toast.error(result.message || 'خطا در تغییر وضعیت مشتری')
        }
    } catch (error) {
        toast.error('خطا در تغییر وضعیت مشتری')
        console.error('Error toggling customer status:', error)
    }
}

async function deleteCustomer(customer) {
    if (normalizeCredit(customer.TotalOrders) > 0) {
        toast.error('این مشتری فاکتور دارد و قابل حذف نیست')
        return
    }

    if (!confirm(`مشتری "${customer.FullName || customer.PhoneNumber || customer.CustomerId}" حذف شود؟`)) return

    deletingCustomerId.value = customer.CustomerId
    try {
        const result = await deleteCustomerApi(customer.CustomerId)
        if (!apiResultIsOk(result)) {
            toast.error(apiResultMessage(result, 'خطا در حذف مشتری'))
            return
        }
        toast.success(apiResultMessage(result, 'مشتری با موفقیت حذف شد'))
        fetchCustomers()
    } catch (error) {
        toast.error('خطا در حذف مشتری')
        console.error('Error deleting customer:', error)
    } finally {
        deletingCustomerId.value = null
    }
}

function viewCustomerOrders(customerId) {
    // این تابع می‌تواند به صفحه سفارشات مشتری هدایت کند
    console.log('View orders for customer:', customerId)
}

function applyCustomerFilters() {
    // فیلترها به صورت computed هستند و به صورت خودکار اعمال می‌شوند
}

function formatPrice(price) {
    return new Intl.NumberFormat('en-US').format(price) + ' تومان'
}

// مقداردهی اولیه
onMounted(() => {
    fetchCustomers()
})


///////////////////////////////////////////////////
function getTransactionTypeText(type) {
    const types = {
        1: 'افزایش اعتبار',
        2: 'کاهش اعتبار',
        3: 'خرید',
        4: 'عودت'
    }
    return types[type] || 'نامشخص'
}

function getTransactionTypeClass(type) {
    const classes = {
        1: 'credit-positive',
        2: 'credit-negative',
        3: 'credit-negative',
        4: 'credit-positive'
    }
    return classes[type] || ''
}

function showCustomerDetails(customer) {
    customerDetails.value = customer
    showCustomerDetailsModal.value = true
}


//// ویرایش رسید های مالی
function editTransaction(transaction) {
    currentTransaction.value = { ...transaction }
    showEditTransactionModal.value = true
}

function closeEditTransactionModal() {
    showEditTransactionModal.value = false
    currentTransaction.value = {}
}

async function saveTransaction() {
    try {
        // فراخوانی API برای ذخیره تغییرات تراکنش
        const result = await updateTransactionApi(currentTransaction.value)
        if (result.status) {
            toast.success('تراکنش با موفقیت ویرایش شد')
            // بروزرسانی اطلاعات مشتری
            if (customerDetails.value.CustomerId) {
                const customer = customers.value.find(c => c.CustomerId === customerDetails.value.CustomerId)
                if (customer) {
                    // بروزرسانی تراکنش در لیست
                    const index = customer.CreditTransactions.findIndex(t => t.TransactionId === currentTransaction.value.TransactionId)
                    if (index !== -1) {
                        customer.CreditTransactions[index] = { ...currentTransaction.value }
                    }
                    // بروزرسانی جزئیات نمایش داده شده
                    customerDetails.value = { ...customer }
                }
            }
            closeEditTransactionModal()
            fetchCustomers()
        } else {
            toast.error(result.message || 'خطا در ویرایش تراکنش')
        }
    } catch (error) {
        toast.error('خطا در ویرایش تراکنش')
        console.error('Error saving transaction:', error)
    }
}

async function deleteTransaction() {
    if (!confirm('آیا از حذف این تراکنش اطمینان دارید؟')) return

    try {
        // فراخوانی API برای حذف تراکنش
        const result = await deleteTransactionApi(currentTransaction.value.TransactionId)
        if (result.status) {
            toast.success('تراکنش با موفقیت حذف شد')
            // بروزرسانی اطلاعات مشتری
            if (customerDetails.value.CustomerId) {
                const customer = customers.value.find(c => c.CustomerId === customerDetails.value.CustomerId)
                if (customer) {
                    // حذف تراکنش از لیست
                    customer.CreditTransactions = customer.CreditTransactions.filter(
                        t => t.TransactionId !== currentTransaction.value.TransactionId
                    )
                    // بروزرسانی جزئیات نمایش داده شده
                    customerDetails.value = { ...customer }
                }
            }
            closeEditTransactionModal()
            fetchCustomers()
        } else {
            toast.error(result.message || 'خطا در حذف تراکنش')
        }
    } catch (error) {
        toast.error('خطا در حذف تراکنش')
        console.error('Error deleting transaction:', error)
    }
}



///// Virtual Keyboard ///////

function handleInputClick(event, inputType) {
    if (IsShowKeyboard.value == true) {
        activeInputType.value = inputType
        showKeyboard.value = true

        // تنظیم ref مربوطه
        switch (inputType) {
            case 'name': activeInputRef.value = nameInput.value; break
            case 'credit': activeInputRef.value = creditInput.value; break
            case 'phone': activeInputRef.value = phoneInput.value; break
            case 'notes': activeInputRef.value = notesInput.value; break
            case 'search': activeInputRef.value = searchInput.value; break
        }

        event.preventDefault()
    }
}

function handleInputFocus(inputType) {
    if (IsShowKeyboard.value == true) {
        activeInputType.value = inputType
        showKeyboard.value = true

        // تنظیم ref مربوطه
        switch (inputType) {
            case 'name': activeInputRef.value = nameInput.value; break
            case 'credit': activeInputRef.value = creditInput.value; break
            case 'phone': activeInputRef.value = phoneInput.value; break
            case 'notes': activeInputRef.value = notesInput.value; break
            case 'search': activeInputRef.value = searchInput.value; break
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

    // به روزرسانی مدل داده
    switch (activeInputType.value) {
        case 'name': currentCustomer.value.FullName = input.value; break
        case 'credit': currentCustomer.value.CreditBalance = input.value; break
        case 'phone': currentCustomer.value.PhoneNumber = input.value; break
        case 'notes': currentCustomer.value.Notes = input.value; break
        case 'search': customerSearch.value = input.value; break
        default:
            // برای فیلترهای ستون‌ها
            if (activeInputType.value.startsWith('filter-')) {
                const columnKey = activeInputType.value.replace('filter-', '')
                customerFilters.value[columnKey] = input.value
            }
            break
    }

    // انتشار رویداد input برای به روزرسانی واکنشی
    input.dispatchEvent(new Event('input'))
}

// تابع برای تنظیم refهای فیلترها
function setFilterInputRef(columnKey, el) {
    if (el) {
        filterInputRefs.value[columnKey] = el
    }
}

// توابع جدید برای مدیریت کلیک و فوکوس روی فیلترهای ستون‌ها
function handleFilterInputClick(event, columnKey) {
    activeInputType.value = `filter-${columnKey}`
    showKeyboard.value = true
    activeInputRef.value = filterInputRefs.value[columnKey]
    event.preventDefault()
}

function handleFilterInputFocus(columnKey) {
    activeInputType.value = `filter-${columnKey}`
    showKeyboard.value = true
    activeInputRef.value = filterInputRefs.value[columnKey]
}
</script>

<style scoped>
.customers-table-container {
    overflow-x: auto;
    margin-top: 20px;
}

.customers-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
}

.customers-table th,
.customers-table td {
    padding: 12px 15px;
    text-align: center;
    border: 1px solid #ddd;
}

.customers-table th {
    background-color: #f5f5f5;
    font-weight: bold;
}

.customer-actions {
    display: flex;
    gap: 5px;
    justify-content: center;
}

.view-orders-btn {
    background: #ff9800;
    color: white;
    border: none;
    padding: 6px 10px;
    border-radius: 4px;
    cursor: pointer;
}

.view-orders-btn:hover {
    background: #f57c00;
}

.activate-btn {
    background: #4CAF50;
    color: white;
    border: none;
    padding: 6px 10px;
    border-radius: 4px;
    cursor: pointer;
}

.activate-btn:hover {
    background: #45a049;
}

.deactivate-btn {
    background: #f44336;
    color: white;
    border: none;
    padding: 6px 10px;
    border-radius: 4px;
    cursor: pointer;
}

.deactivate-btn:hover {
    background: #d32f2f;
}

.delete-customer-btn {
    background: #b91c1c;
    color: white;
    border: none;
    padding: 6px 10px;
    border-radius: 4px;
    cursor: pointer;
}

.delete-customer-btn:hover {
    background: #991b1b;
}

.delete-customer-btn:disabled {
    cursor: not-allowed;
    opacity: 0.45;
}

/* استایل‌های مدال */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    border-radius: 8px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
}

.modal-header {
    padding: 20px;
    border-bottom: 1px solid #ddd;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h3 {
    color: black;
}

.modal-close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
}

.modal-body {
    padding: 20px;
}

.form-row {
    display: flex;
    gap: 15px;
    margin-bottom: 15px;
}

.form-group {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.form-group label {
    margin-bottom: 5px;
    font-weight: bold;
    color: #252525;
}

.form-input,
.form-select {
    border: 1px solid #4d2ff8 !important;
    border-radius: 4px;
    font-family: 'Vazirmatn', sans-serif;
    color: #000000 !important;
}

.modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 20px;
}

.save-btn {
    background: #4CAF50;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
}

.save-btn:hover {
    background: #45a049;
}

.cancel-btn {
    background: #f44336;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
}

.cancel-btn:hover {
    background: #d32f2f;
}

@media (max-width: 768px) {
    .form-row {
        flex-direction: column;
    }

    .customer-actions {
        flex-direction: column;
    }

    .modal-content {
        width: 95%;
        margin: 20px;
    }
}

/* استایل‌های مدال جزئیات مشتری */
.customer-info-section {
    margin-bottom: 20px;
}

.customer-info-section h4 {
    color: #353535;
}

.info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
}

.info-item {
    display: flex;
    justify-content: space-between;
    padding: 10px;
    background: #f9f9f9;
    border-radius: 4px;
}

.info-item label {
    font-weight: bold;
    color: #555;
}

.info-item span {
    color: #555;
    width: 80%;
}

.transactions-section {
    margin-top: 20px;
}

.transactions-section h4 {
    color: #353535;
}

.transactions-table {
    overflow-x: auto;
    margin-top: 10px;
}

.transactions-table table {
    width: 100%;
    border-collapse: collapse;
}

.transactions-table th,
.transactions-table td {
    padding: 8px 12px;
    border: 1px solid #ddd;
    text-align: center;
}

.transactions-table th {
    background-color: #f5f5f5;
    font-weight: bold;
}

.credit-positive {
    color: #4CAF50;
    font-weight: bold;
}

.credit-negative {
    color: #f44336;
    font-weight: bold;
}

.no-data {
    text-align: center;
    padding: 20px;
    color: #666;
}

.close-btn {
    background: #2196F3;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
}

.close-btn:hover {
    background: #1976D2;
}

.view-details-btn {
    background: #2196F3;
    color: white;
    border: none;
    padding: 6px 10px;
    border-radius: 4px;
    cursor: pointer;
}

.view-details-btn:hover {
    background: #1976D2;
}

@media (max-width: 768px) {
    .info-grid {
        grid-template-columns: 1fr;
    }

    .transactions-table {
        font-size: 12px;
    }

    .transactions-table th,
    .transactions-table td {
        padding: 6px 8px;
    }
}

tr {
    color: #353535;
}
</style>
