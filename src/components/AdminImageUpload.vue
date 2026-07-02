<template>
    <div class="admin-back-div">
        <button type="button" @click="back" class="refresh-btn">برگشت</button>
    </div>
    <div class="admin-image-upload-container">
        <header class="admin-header">
            <h1>مدیریت کامل</h1>
            <p>در این بخش می‌توانید محتوا و تصاویر را مدیریت کنید</p>
        </header>

        <div class="admin-content">

            <!-- تب‌های اصلی -->
            <div class="tabs">
                <!-- تب‌های مدیریت محتوا -->
                <button @click="activeTab = 'manage-categories'"
                    :class="{ 'active': activeTab === 'manage-categories' }" class="tab-button">
                    مدیریت دسته‌بندی‌ها
                </button>
                <button @click="activeTab = 'manage-products'" :class="{ 'active': activeTab === 'manage-products' }"
                    class="tab-button">
                    مدیریت کالاها
                </button>
                <button @click="activeTab = 'manage-toppings'" :class="{ 'active': activeTab === 'manage-toppings' }"
                    class="tab-button">
                    مدیریت تاپینگ‌ها
                </button>

                <!-- تب‌های آپلود تصاویر -->
                <button @click="activeTab = 'image-categories'" :class="{ 'active': activeTab === 'image-categories' }"
                    class="tab-button">
                    تصاویر دسته‌بندی‌ها
                </button>
                <button @click="activeTab = 'image-products'" :class="{ 'active': activeTab === 'image-products' }"
                    class="tab-button">
                    تصاویر کالاها
                </button>

                <!-- مدیریت فاکتور ها-->
                <button @click="activeTab = 'manage-invoices'" :class="{ 'active': activeTab === 'manage-invoices' }"
                    class="tab-button">
                    مدیریت فاکتورها
                </button>

                <!-- مدیریت مشتری ها -->
                <button @click="activeTab = 'manage-customers'" :class="{ 'active': activeTab === 'manage-customers' }"
                    class="tab-button">
                    مدیریت مشتری ها
                </button>
            </div>

            <!-- محتوای تب‌ها -->
            <div class="tab-content">
                <!-- بخش مدیریت دسته‌بندی‌ها -->
                <div v-if="activeTab === 'manage-categories'" class="manage-section">
                    <div class="controls-row">
                        <div class="search-filter">
                            <input v-model="categorySearch" placeholder="جستجوی دسته‌بندی..." class="search-input"
                                ref="searchcategoryref" @click="handleInputClick($event, 'searchcategory')"
                                @focus="handleInputFocus('searchcategory')" />
                            <button @click="showCategoryModal(null)" class="add-btn">
                                <i class="fas fa-plus"></i> افزودن
                            </button>
                            <button class="refresh-btn" @click="fetchCategories">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                    </div>

                    <div class="items-grid">
                        <div v-for="category in filteredCategories" :key="category.GroupId" class="item-card">
                            <div class="item-info">
                                <h3>{{ category.GroupName }}</h3>
                                <p>کد: {{ category.GroupCode }}</p>
                                <p>وضعیت: {{ category.IsActive ? 'فعال' : 'غیرفعال' }}</p>
                            </div>
                            <div class="item-actions">
                                <button @click="showCategoryModal(category)" class="edit-btn">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button @click="deleteItem(category.GroupId, 'Category')" class="delete-btn">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- بخش مدیریت کالاها -->
                <div v-if="activeTab === 'manage-products'" class="manage-section">
                    <div class="controls-row">
                        <div class="search-filter">
                            <input v-model="productSearch" placeholder="جستجوی کالا..." class="search-input"
                                ref="searchgoodsref" @click="handleInputClick($event, 'searchgoods')"
                                @focus="handleInputFocus('searchgoods')" />
                            <select v-model="selectedProductCategory" class="category-select">
                                <option value="">همه دسته‌بندی‌ها</option>
                                <option v-for="cat in categories" :value="cat.GroupId" :key="cat.GroupId">
                                    {{ cat.GroupName }}
                                </option>
                            </select>
                            <button @click="showProductModal(null)" class="add-btn">
                                <i class="fas fa-plus"></i> افزودن
                            </button>
                            <button class="refresh-btn" @click="fetchProducts">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                    </div>

                    <div class="items-grid">
                        <div v-for="product in filteredProducts" :key="product.GoodsId" class="item-card">
                            <div class="item-info">
                                <h3>{{ product.GoodsName }}</h3>
                                <p>کد: {{ product.GoodsCode }}</p>
                                <p>موجودی: {{ product.StockInventory }}</p>
                                <p>قیمت: {{ product.GoodsPrice.toLocaleString() }} تومان</p>
                                <p>دسته‌بندی: {{ getCategoryName(product.GoodsGroupId) }}</p>
                            </div>
                            <div class="item-actions">
                                <button @click="showProductModal(product)" class="edit-btn">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button @click="deleteItem(product.GoodsId, 'Good')" class="delete-btn">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- بخش مدیریت تاپینگ‌ها -->
                <div v-if="activeTab === 'manage-toppings'" class="manage-section">
                    <div class="sub-tabs">
                        <button @click="toppingSubTab = 'items'" :class="{ 'active': toppingSubTab === 'items' }"
                            class="sub-tab-button">
                            اقلام تاپینگ
                        </button>
                        <button @click="toppingSubTab = 'levels'" :class="{ 'active': toppingSubTab === 'levels' }"
                            class="sub-tab-button">
                            مراحل تاپینگ
                        </button>
                        <button @click="toppingSubTab = 'product-toppings'"
                            :class="{ 'active': toppingSubTab === 'product-toppings' }" class="sub-tab-button">
                            تاپینگ‌های کالاها
                        </button>
                    </div>

                    <!-- اقلام تاپینگ -->
                    <div v-if="toppingSubTab === 'items'" class="topping-items-section">
                        <div class="controls-row">
                            <div class="search-filter">
                                <input v-model="toppingItemSearch" placeholder="جستجوی اقلام تاپینگ..."
                                    class="search-input" ref="searchtopitemref"
                                    @click="handleInputClick($event, 'searchtopitem')"
                                    @focus="handleInputFocus('searchtopitem')" />
                                <button @click="showToppingItemModal(null)" class="add-btn">
                                    <i class="fas fa-plus"></i> افزودن
                                </button>
                                <button class="refresh-btn" @click="fetchToppingItems">
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                            </div>
                        </div>

                        <div class="items-grid">
                            <div v-for="item in filteredToppingItems" :key="item.GoodsId" class="item-card">
                                <div class="item-info">
                                    <h3>{{ item.GoodsName }}</h3>
                                    <p>کد: {{ item.GoodsCode }}</p>
                                    <p>مالیات: {{ item.TaxPercent }}%</p>
                                    <p>عوارض: {{ item.DutyPercent }}%</p>
                                </div>
                                <div class="item-actions">
                                    <button @click="showToppingItemModal(item)" class="edit-btn">
                                        <i class="fas fa-edit"></i>
                                    </button>

                                    <button @click="deleteItem(item.GoodsId, 'ToppingProduct')" class="delete-btn">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- مراحل تاپینگ -->
                    <div v-if="toppingSubTab === 'levels'" class="topping-levels-section">
                        <div class="controls-row">
                            <div class="search-filter">
                                <input v-model="toppingLevelSearch" placeholder="جستجوی مراحل تاپینگ..."
                                    class="search-input" ref="searchtoplevelref"
                                    @click="handleInputClick($event, 'searchtoplevel')"
                                    @focus="handleInputFocus('searchtoplevel')" />
                                <button @click="showToppingLevelModal(null)" class="add-btn">
                                    <i class="fas fa-plus"></i> افزودن
                                </button>
                                <button class="refresh-btn" @click="fetchToppingLevels">
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                            </div>
                        </div>

                        <div class="items-grid">
                            <div v-for="level in filteredToppingLevels" :key="level.LevelId" class="item-card">
                                <div class="item-info">
                                    <h3>{{ level.LevelTitle }}</h3>
                                    <p>اولویت: {{ level.Priority }}</p>
                                    <p>حداقل: {{ level.MinCount }}</p>
                                    <p>حداکثر: {{ level.MaxCount }}</p>
                                </div>
                                <div class="item-actions">
                                    <button @click="showToppingLevelModal(level)" class="edit-btn">
                                        <i class="fas fa-edit"></i>
                                    </button>

                                    <button @click="deleteItem(level.LevelId, 'ToppingLevel')" class="delete-btn">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- تاپینگ‌های کالاها -->
                    <div v-if="toppingSubTab === 'product-toppings'" class="product-toppings-section">
                        <div class="controls-row">
                            <div class="search-filter">
                                <select v-model="selectedProductForTopping" class="product-select">
                                    <option value="">انتخاب کالا</option>
                                    <option v-for="product in products" :value="product.GoodsId" :key="product.GoodsId">
                                        {{ product.GoodsName }}
                                    </option>
                                </select>
                                <select v-model="selectedLevelForTopping" class="level-select">
                                    <option value="">انتخاب مرحله</option>
                                    <option v-for="level in toppingLevels" :value="level.LevelId" :key="level.LevelId">
                                        {{ level.LevelTitle }}
                                    </option>
                                </select>
                                <button @click="showProductToppingModal(null)" class="add-btn">
                                    <i class="fas fa-plus"></i> افزودن
                                </button>
                                <button class="refresh-btn" @click="fetchProductToppings">
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                            </div>
                        </div>

                        <div class="items-grid">
                            <div v-for="topping in filteredProductToppings" :key="topping.ToppingId" class="item-card">
                                <div class="item-info">
                                    <h3>{{ getToppingItemName(topping.GoodsToppingId) }}</h3>
                                    <p>نام کالا: {{ getItemName(topping.GoodsId) }}</p>
                                    <p>مرحله: {{ getLevelName(topping.LevelId) }}</p>
                                    <p>تعداد پیش‌فرض: {{ topping.GoodsCountDefault }}</p>
                                    <p>قیمت: {{ topping.Price.toLocaleString() }} تومان</p>
                                    <p>حداقل: {{ topping.MinCount }} - حداکثر: {{ topping.MaxCount }}</p>
                                </div>
                                <div class="item-actions">
                                    <button @click="showProductToppingModal(topping)" class="edit-btn">
                                        <i class="fas fa-edit"></i>
                                    </button>

                                    <button @click="deleteItem(topping.ToppingId, 'Topping')" class="delete-btn">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- بخش تصاویر دسته‌بندی‌ها -->
                <div v-if="activeTab === 'image-categories'" class="image-section">
                    <div class="search-filter">
                        <input v-model="imageCategorySearch" placeholder="جستجوی دسته‌بندی..." class="search-input" />
                        <button class="empty-btn" @click="emptyCategorySearch">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                        <button class="refresh-btn" @click="fetchCategories">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                    <div class="items-grid">
                        <div v-for="category in filteredImageCategories" :key="category.GroupId" class="item-card">
                            <div class="item-info">
                                <h3>{{ category.GroupName }}</h3>
                                <p>کد: {{ category.GroupCode }}</p>
                            </div>
                            <ImageUploader :key="`category-${category.GroupCode}`"
                                :current-image="getGroupImage(category.GroupCode)" :item-id="category.GroupCode"
                                item-type="category" @upload-success="handleUploadSuccess" />
                        </div>
                    </div>
                </div>

                <!-- بخش تصاویر کالاها -->
                <div v-if="activeTab === 'image-products'" class="image-section">
                    <div class="controls-row">
                        <div class="search-filter">
                            <input v-model="imageProductSearch" placeholder="جستجوی کالا..." class="search-input" />
                            <button class="empty-btn" @click="emptyProductSearch">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                            <select v-model="selectedImageCategory" class="category-select">
                                <option value="">همه دسته‌بندی‌ها</option>
                                <option v-for="cat in categories" :value="cat.GroupId" :key="cat.GroupId">
                                    {{ cat.GroupName }}
                                </option>
                            </select>
                            <button class="refresh-btn" @click="fetchProducts">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                    </div>

                    <div class="items-grid">
                        <div v-for="product in filteredImageProducts" :key="product.GoodsId" class="item-card">
                            <div class="item-info">
                                <h3>{{ product.GoodsName }}</h3>
                                <p>کد: {{ product.GoodsCode }}</p>
                                <p>موجودی: {{ product.StockInventory }}</p>
                                <p>قیمت: {{ product.GoodsPrice.toLocaleString() }} تومان</p>
                            </div>
                            <ImageUploader :key="`product-${product.GoodsCode}`"
                                :current-image="getGoodsImage(product.GoodsCode)" :item-id="product.GoodsCode"
                                item-type="product" @upload-success="handleUploadSuccess" />
                        </div>
                    </div>
                </div>

                <!-- بخش مدیریت فاکتور ها-->
                <div v-if="activeTab === 'manage-invoices'" class="manage-section">
                    <div class="controls-row">
                        <div class="search-filter">
                            <!-- فیلتر تاریخ -->
                            <input v-model="fromDate" @change="fetchInvoices" data-jdp data-jdp-option-2 type="text"
                                placeholder="از تاریخ" readonly class="search-input" />
                            <input v-model="toDate" @change="fetchInvoices" data-jdp data-jdp-option-2 type="text"
                                placeholder="تا تاریخ" readonly class="search-input" />

                            <!-- فیلترهای دیگر -->
                            <input v-model="invoiceSearch" placeholder="جستجوی فاکتور..." class="search-input"
                                ref="searchinvoiceref" @click="handleInputClick($event, 'searchinvoice')"
                                @focus="handleInputFocus('searchinvoice')" />

                            <button class="refresh-btn" @click="fetchInvoices">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                    </div>

                    <div class="invoice-table-container">
                        <table class="invoice-table">
                            <thead>
                                <tr>
                                    <th v-for="column in invoiceColumns" :key="column.key">
                                        <div class="column-header">
                                            <span>{{ column.title }}</span>
                                            <input v-if="column.filterable" v-model="invoiceFilters[column.key]"
                                                @input="applyInvoiceFilters" :placeholder="`فیلتر ${column.title}`"
                                                class="filter-input" />
                                        </div>
                                    </th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                <template v-for="invoice in filteredInvoices" :key="invoice.SaleInvoiceId">
                                    <tr>
                                        <td>{{ invoice.SaleInvoiceId }}</td>
                                        <td>{{ invoice.SaleInvoiceNumberDay }}</td>
                                        <td>{{ invoice.OrderDate }}</td>
                                        <td>{{ invoice.OrderTime }}</td>
                                        <td>{{ invoice.CustomerName }}</td>
                                        <td>{{ formatPrice(invoice.Price) }}</td>
                                        <td>{{ formatPrice(invoice.Discount) }}</td>
                                        <td>{{ formatPrice(invoice.Tax) }}</td>
                                        <td>{{ formatPrice(invoice.Payable) }}</td>
                                        <td>
                                            <button @click="toggleInvoiceDetails(invoice.SaleInvoiceId)"
                                                class="expand-btn">
                                                {{ expandedInvoices.includes(invoice.SaleInvoiceId) ? '-' : '+' }}
                                            </button>
                                        </td>
                                    </tr>

                                    <!-- ردیف جزئیات فاکتور -->
                                    <tr v-if="expandedInvoices.includes(invoice.SaleInvoiceId)">
                                        <td colspan="9">
                                            <div class="invoice-details">
                                                <h4>جزئیات فاکتور #{{ invoice.SaleInvoiceId }}</h4>

                                                <table class="items-table">
                                                    <thead>
                                                        <tr>
                                                            <th>کد محصول</th>
                                                            <th>نام محصول</th>
                                                            <th>قیمت واحد</th>
                                                            <th>تعداد</th>
                                                            <th>تخفیف</th>
                                                            <th>مالیات</th>
                                                            <th>جمع کل</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr v-for="item in invoiceItems[invoice.SaleInvoiceId]"
                                                            :key="item.SaleInvoiceItemId">
                                                            <td>{{ item.ProductCode }}</td>
                                                            <td>{{ item.ProductTitle }}</td>
                                                            <td>{{ formatPrice(item.ProductPrice) }}</td>
                                                            <td>{{ item.Quantity }}</td>
                                                            <td>{{ formatPrice(item.ProductDiscount) }}</td>
                                                            <td>{{ formatPrice(item.ProductTax) }}</td>
                                                            <td>{{ formatPrice(item.TotalPrice) }}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>

                                                <!-- بخش تاپینگ‌ها -->
                                                <div v-if="hasToppings(invoice.SaleInvoiceId)" class="toppings-section">
                                                    <h5>تاپینگ‌ها:</h5>
                                                    <table class="toppings-table">
                                                        <thead>
                                                            <tr>
                                                                <th>نام تاپینگ</th>
                                                                <th>تعداد</th>
                                                                <th>قیمت</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr v-for="topping in getToppings(invoice.SaleInvoiceId)"
                                                                :key="topping.SaleInvoiceItemToppingId">
                                                                <td>{{ topping.ToppingName }}</td>
                                                                <td>{{ topping.GoodsCount }}</td>
                                                                <td>{{ formatPrice(topping.Price) }}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </template>
                            </tbody>

                            <!-- ردیف جمع کل -->
                            <tfoot>
                                <tr>
                                    <td colspan="5">جمع کل:</td>
                                    <td>{{ formatPrice(totalInvoicePrice) }}</td>
                                    <td>{{ formatPrice(totalInvoiceDiscount) }}</td>
                                    <td>{{ formatPrice(totalInvoiceTax) }}</td>
                                    <td>{{ formatPrice(totalInvoicePayable) }}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <div v-if="activeTab == 'manage-customers'" class="image-section">
                    <CustomerManagement />
                </div>

            </div>
        </div>
    </div>

    <!-- مدال‌ها -->
    <CategoryModal v-if="showCategoryModalFlag" :category="currentCategory" :categories="categories"
        @save="handleSaveCategory" @close="closeModals" />

    <ProductModal v-if="showProductModalFlag" :product="currentProduct" :categories="categories" :products="products"
        @save="handleSaveProduct" @close="closeModals" />

    <ToppingItemModal v-if="showToppingItemModalFlag" :item="currentToppingItem" :toppingItems="toppingItems"
        @save="handleSaveToppingItem" @close="closeModals" />

    <ToppingLevelModal v-if="showToppingLevelModalFlag" :level="currentToppingLevel" @save="handleSaveToppingLevel"
        @close="closeModals" />

    <ProductToppingModal v-if="showProductToppingModalFlag" :topping="currentProductTopping" :products="products"
        :toppingItems="toppingItems" :toppingLevels="toppingLevels" @save="handleSaveProductTopping"
        @close="closeModals" />

    <!-- کیبورد مجازی -->
    <VirtualKeyboard v-if="showKeyboard && activeInputRef" :input-ref="activeInputRef" :is-number-mode="isNumberMode"
        @key-press="handleKeyPress" @hide="hideKeyboard" />
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import {
    fetchCategoriesApi,
    fetchGoodsApi,
    fetchToppingItemsApi,
    fetchToppingLevelsApi,
    fetchProductToppingsApi,
    saveCategoryApi,
    saveProductApi,
    saveToppingItemApi,
    saveToppingLevelApi,
    saveProductToppingApi,
    Delete,
    fetchInvoicesApi,
    fetchInvoiceItemsApi
} from '../services/apiService'
import { useToast } from 'vue-toastification'
import ImageUploader from './ImageUploader.vue'
import CategoryModal from './CategoryModal.vue'
import ProductModal from './ProductModal.vue'
import ToppingItemModal from './ToppingItemModal.vue'
import ToppingLevelModal from './ToppingLevelModal.vue'
import ProductToppingModal from './ProductToppingModal.vue'
import CustomerManagement from './CustomerManagement.vue'
import VirtualKeyboard from './VirtualKeyboard.vue'
import "@majidh1/jalalidatepicker";
import "@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css";
import { ShwoKeyboardStatus } from '../utilities'



const toast = useToast()
const IsShowKeyboard = ref(false)
// حالت‌های تب‌ها
const activeTab = ref('manage-categories')
const toppingSubTab = ref('items')


// داده‌ها
const categories = ref([])
const products = ref([])
const toppingItems = ref([])
const toppingLevels = ref([])
const productToppings = ref([])

// جستجوها
const categorySearch = ref('')
const productSearch = ref('')
const selectedProductCategory = ref('')
const toppingItemSearch = ref('')
const toppingLevelSearch = ref('')
const toppingProductSearch = ref('')
const selectedProductForTopping = ref('')
const selectedLevelForTopping = ref('')
const imageCategorySearch = ref('')
const imageProductSearch = ref('')
const selectedImageCategory = ref('')

// مدال‌ها
const showCategoryModalFlag = ref(false)
const showProductModalFlag = ref(false)
const showToppingItemModalFlag = ref(false)
const showToppingLevelModalFlag = ref(false)
const showProductToppingModalFlag = ref(false)
const currentCategory = ref(null)
const currentProduct = ref(null)
const currentToppingItem = ref(null)
const currentToppingLevel = ref(null)
const currentProductTopping = ref(null)

// متغیرهای جدید برای مدیریت فاکتورها
const invoices = ref([])
const invoiceItems = ref({})
const invoiceToppings = ref({})
const expandedInvoices = ref([])
const fromDate = ref(null)
const toDate = ref(null)
const invoiceSearch = ref('')

// مدیریت کیبورد مجازی
const showKeyboard = ref(false)
const activeInputType = ref('')
const activeInputRef = ref(null)
const isNumberMode = ref(false)

// refs برای فیلدهای ورودی برای کیبورد مجازی
const searchcategoryref = ref(null)
const searchgoodsref = ref(null)
const searchtopitemref = ref(null)
const searchtoplevelref = ref(null)
const searchinvoiceref = ref(null)
const searchcustomerref = ref(null)



const invoiceColumns = ref([
    { key: 'SaleInvoiceId', title: 'شناسه فاکتور', filterable: true },
    { key: 'SaleInvoiceNumberDay', title: 'شماره فاکتور روزانه', filterable: true },
    { key: 'OrderDate', title: 'تاریخ', filterable: true },
    { key: 'OrderTime', title: 'زمان' },
    { key: 'CustomerName', title: 'مشتری', filterable: true },
    { key: 'Price', title: 'مبلغ کل' },
    { key: 'Discount', title: 'تخفیف' },
    { key: 'Tax', title: 'مالیات' },
    { key: 'Payable', title: 'قابل پرداخت' }
])

// فیلترهای محاسبه شده
const filteredCategories = computed(() => {
    const searchTerm = categorySearch.value.toLowerCase()
    return categories.value.filter(cat => {
        const name = typeof cat.GroupName === 'string' ? cat.GroupName : String(cat.GroupName)
        const code = typeof cat.GroupCode === 'string' ? cat.GroupCode : String(cat.GroupCode)
        return name.toLowerCase().includes(searchTerm) ||
            code.toLowerCase().includes(searchTerm)
    })
})


const filteredProducts = computed(() => {
    const searchTerm = productSearch.value.toLowerCase()
    return products.value.filter(product => {
        const matchesSearch =
            String(product.GoodsName).toLowerCase().includes(searchTerm) ||
            String(product.GoodsCode).toLowerCase().includes(searchTerm)

        const matchesCategory = !selectedProductCategory.value ||
            product.GoodsGroupId == selectedProductCategory.value

        return matchesSearch && matchesCategory
    })
})

const filteredToppingItems = computed(() => {
    const searchTerm = toppingItemSearch.value.toLowerCase()
    return toppingItems.value.filter(cat => {
        const name = typeof cat.GoodsName === 'string' ? cat.GoodsName : String(cat.GoodsName)
        const code = typeof cat.GoodsCode === 'string' ? cat.GoodsCode : String(cat.GoodsCode)
        return name.toLowerCase().includes(searchTerm) ||
            code.toLowerCase().includes(searchTerm)
    })
})

const filteredToppingLevels = computed(() => {
    const searchTerm = toppingLevelSearch.value.toLowerCase()
    return toppingLevels.value.filter(cat => {
        const name = typeof cat.LevelTitle === 'string' ? cat.LevelTitle : String(cat.LevelTitle)
        return name.toLowerCase().includes(searchTerm)
    })
})

const filteredProductToppings = computed(() => {
    const searchTerm = toppingProductSearch.value.toLowerCase()
    return productToppings.value.filter(cat => {
        const name = typeof cat.LevelId === 'string' ? cat.LevelId : String(cat.LevelId)
        const code = typeof cat.GoodsId === 'string' ? cat.GoodsId : String(cat.GoodsId)
        return name.toLowerCase().includes(searchTerm) ||
            code.toLowerCase().includes(searchTerm)
    })
})

const filteredImageCategories = computed(() => {
    const searchTerm = imageCategorySearch.value.toLowerCase()
    return categories.value.filter(cat => {
        const name = typeof cat.GroupName === 'string' ? cat.GroupName : String(cat.GroupName)
        const code = typeof cat.GroupCode === 'string' ? cat.GroupCode : String(cat.GroupCode)
        return name.toLowerCase().includes(searchTerm) ||
            code.toLowerCase().includes(searchTerm)
    })
})

const filteredImageProducts = computed(() => {
    const searchTerm = productSearch.value.toLowerCase()
    return products.value.filter(product => {
        const matchesSearch =
            String(product.GoodsName).toLowerCase().includes(searchTerm) ||
            String(product.GoodsCode).toLowerCase().includes(searchTerm)

        const matchesCategory = !selectedImageCategory.value ||
            product.GoodsGroupId == selectedImageCategory.value

        return matchesSearch && matchesCategory
    })
})

// توابع کمکی
function getCategoryName(categoryId) {
    const category = categories.value.find(c => c.GroupId == categoryId)
    return category ? category.GroupName : 'نامشخص'
}

function getToppingItemName(itemId) {
    const item = toppingItems.value.find(i => i.GoodsId == itemId)
    return item ? item.GoodsName : 'نامشخص'
}

function getLevelName(levelId) {
    const level = toppingLevels.value.find(l => l.LevelId == levelId)
    return level ? level.LevelTitle : 'نامشخص'
}

function getItemName(goodsid) {
    const item = products.value.find(l => l.GoodsId == goodsid)
    return item ? item.GoodsName : 'نامشخص'
}

function getGroupImage(groupId) {
    const version = new Date().toISOString().slice(0, 16).replace(/[^0-9]/g, "");

    return `./img/groups/${groupId}.png?v=${version}`
}

function getGoodsImage(goodsId) {
    const version = new Date().toISOString().slice(0, 16).replace(/[^0-9]/g, "");

    return `/img/goods/${goodsId}.png?v=${version}`
}

// توابع دریافت داده
async function loadData() {
    try {
        await Promise.all([
            fetchCategories(),
            fetchProducts(),
            fetchToppingItems(),
            fetchToppingLevels(),
            fetchProductToppings(),
            fetchInvoicesApi()
        ])
    } catch (error) {
        toast.error('خطا در دریافت اطلاعات')
        console.error(error)
    }
}

async function fetchCategories() {
    const response = await fetchCategoriesApi()
    categories.value = response.GoodsGroup || []
}

async function fetchProducts() {
    const response = await fetchGoodsApi()
    products.value = response.Goods || []
}

async function fetchToppingItems() {
    const response = await fetchToppingItemsApi()
    toppingItems.value = response.ToppingGoods || []
}

async function fetchToppingLevels() {
    const response = await fetchToppingLevelsApi()
    toppingLevels.value = response.ToppingLevel || []
}

async function fetchProductToppings() {
    const response = await fetchProductToppingsApi()
    productToppings.value = response.Goods || []
}

// توابع مدال‌ها
function showCategoryModal(category) {
    currentCategory.value = category ? { ...category } : {
        GroupId: 0,
        GroupCode: '',
        GroupName: '',
        IsActive: true
    }
    showCategoryModalFlag.value = true
}

function showProductModal(product) {
    currentProduct.value = product ? { ...product } : {
        GoodsId: 0,
        GoodsCode: '',
        GoodsName: '',
        GoodsPrice: 0,
        GoodsGroupId: categories.value[0]?.GroupId || 0,
        IsActive: true,
        // سایر فیلدهای مورد نیاز
    }
    showProductModalFlag.value = true
}

function showToppingItemModal(item) {
    currentToppingItem.value = item ? { ...item } : {
        GoodsId: 0,
        GoodsCode: '',
        GoodsName: '',
        TaxPercent: 0,
        DutyPercent: 0,
        IsActive: true
    }
    showToppingItemModalFlag.value = true
}

function showToppingLevelModal(level) {
    currentToppingLevel.value = level ? { ...level } : {
        LevelId: 0,
        LevelTitle: '',
        Priority: 0,
        MinCount: 0,
        MaxCount: 0
    }
    showToppingLevelModalFlag.value = true
}

function showProductToppingModal(topping) {
    currentProductTopping.value = topping ? { ...topping } : {
        ToppingId: 0,
        GoodsId: selectedProductForTopping.value || products.value[0]?.GoodsId || 0,
        GoodsToppingId: toppingItems.value[0]?.GoodsId || 0,
        LevelId: selectedLevelForTopping.value || toppingLevels.value[0]?.LevelId || 0,
        GoodsCountDefault: 0,
        GoodsCount: 0,
        Price: 0,
        containerPrice: 0,
        MinCount: 0,
        MaxCount: 0
    }
    showProductToppingModalFlag.value = true
}

function closeModals() {
    showCategoryModalFlag.value = false
    showProductModalFlag.value = false
    showToppingItemModalFlag.value = false
    showToppingLevelModalFlag.value = false
    showProductToppingModalFlag.value = false
}

// توابع ذخیره
async function handleSaveCategory(categoryData) {
    try {
        const result = await saveCategoryApi(categoryData)
        if (result.status) {
            toast.success('دسته‌بندی با موفقیت ذخیره شد')
            fetchCategories()
            closeModals()
        } else {
            toast.error(result.message || 'خطا در ذخیره دسته‌بندی')
        }
    } catch (error) {
        toast.error('خطا در ذخیره دسته‌بندی')
        console.error(error)
    }
}

async function handleSaveProduct(productData) {
    try {
        const result = await saveProductApi(productData)
        if (result.status) {
            toast.success('کالا با موفقیت ذخیره شد')
            fetchProducts()
            closeModals()
        } else {
            toast.error(result.message || 'خطا در ذخیره کالا')
        }
    } catch (error) {
        toast.error('خطا در ذخیره کالا')
        console.error(error)
    }
}

async function handleSaveToppingItem(itemData) {
    try {
        const result = await saveToppingItemApi(itemData)
        if (result.status) {
            toast.success('قلم تاپینگ با موفقیت ذخیره شد')
            fetchToppingItems()
            closeModals()
        } else {
            toast.error(result.message || 'خطا در ذخیره قلم تاپینگ')
        }
    } catch (error) {
        toast.error('خطا در ذخیره قلم تاپینگ')
        console.error(error)
    }
}

async function handleSaveToppingLevel(levelData) {
    try {
        const result = await saveToppingLevelApi(levelData)
        if (result.status) {
            toast.success('مرحله تاپینگ با موفقیت ذخیره شد')
            fetchToppingLevels()
            closeModals()
        } else {
            toast.error(result.message || 'خطا در ذخیره مرحله تاپینگ')
        }
    } catch (error) {
        toast.error('خطا در ذخیره مرحله تاپینگ')
        console.error(error)
    }
}

async function handleSaveProductTopping(toppingData) {
    try {
        const result = await saveProductToppingApi(toppingData)
        if (result.status) {
            toast.success('تاپینگ کالا با موفقیت ذخیره شد')
            fetchProductToppings()
            closeModals()
        } else {
            toast.error(result.message || 'خطا در ذخیره تاپینگ کالا')
        }
    } catch (error) {
        toast.error('خطا در ذخیره تاپینگ کالا')
        console.error(error)
    }
}

// توابع آپلود تصاویر
function handleUploadSuccess({ itemId, itemType }) {
    toast.success(`تصویر ${itemType === 'category' ? 'دسته‌بندی' : itemType === 'product' ? 'کالا' : 'شعبه'} با موفقیت آپلود شد`)
}

function emptyCategorySearch() {
    imageCategorySearch.value = ''
}

function emptyProductSearch() {
    imageProductSearch.value = ''
}

function back() {
    window.location.reload()
}

// مقداردهی اولیه
onMounted(() => {
    loadData()
    loadDatePicker()
    IsShowKeyboard.value = ShwoKeyboardStatus();
})

async function deleteItem(id, type) {
    try {

        const result = await Delete(id, type)
        if (result.status) {
            if (type === 'Category') {
                toast.success(result.message);
                fetchCategories()
            } else if (type === 'Good') {
                toast.success(result.message);
                fetchProducts()
            } else if (type === 'Topping') {
                toast.success(result.message);
                fetchProductToppings()
            } else if (type === 'ToppingLevel') {
                toast.success(result.message);
                fetchToppingLevels()
            } else if (type === 'ToppingProduct') {
                toast.success(result.message);
                fetchToppingItems()
            }
        } else {
            toast.error('خطا در حذف، ' + result.message)
            return
        }
    } catch (error) {
        toast.error('خطا در حذف')
        console.error(error)
    }
}



const invoiceFilters = ref({
    SaleInvoiceId: '',
    CustomerName: '',
    OrderDate: ''
})

// محاسبه‌کننده‌های جدید
const filteredInvoices = computed(() => {
    return invoices.value.filter(invoice => {
        const matchesSearch = !invoiceSearch.value ||
            String(invoice.SaleInvoiceId).includes(invoiceSearch.value) ||
            (invoice.CustomerName && invoice.CustomerName.includes(invoiceSearch.value))

        const matchesFilters = Object.entries(invoiceFilters.value).every(([key, value]) => {
            if (!value) return true
            return String(invoice[key]).includes(value)
        })

        return matchesSearch && matchesFilters
    })
})

const totalInvoicePrice = computed(() => {
    return filteredInvoices.value.reduce((sum, invoice) => sum + invoice.Price, 0)
})

const totalInvoiceDiscount = computed(() => {
    return filteredInvoices.value.reduce((sum, invoice) => sum + invoice.Discount, 0)
})

const totalInvoiceTax = computed(() => {
    return filteredInvoices.value.reduce((sum, invoice) => sum + invoice.Tax, 0)
})

const totalInvoicePayable = computed(() => {
    return filteredInvoices.value.reduce((sum, invoice) => sum + invoice.Payable, 0)
})

// توابع جدید
async function fetchInvoices() {
    try {
        const params = {
            FromDate: fromDate.value,
            ToDate: toDate.value
        }

        const response = await fetchInvoicesApi(params)
        invoices.value = response.data || []
    } catch (error) {
        toast.error('خطا در دریافت فاکتورها')
        console.error('Error fetching invoices:', error)
    }
}

async function fetchInvoiceDetails(invoiceId) {
    try {
        const response = await fetchInvoiceItemsApi(invoiceId)
        invoiceItems.value[invoiceId] = response.data.items || []
        invoiceToppings.value[invoiceId] = response.data.toppings || []
    } catch (error) {
        toast.error('خطا در دریافت جزئیات فاکتور')
        console.error('Error fetching invoice details:', error)
    }
}

async function toggleInvoiceDetails(invoiceId) {
    const index = expandedInvoices.value.indexOf(invoiceId)

    if (index === -1) {
        if (!invoiceItems.value[invoiceId]) {
            await fetchInvoiceDetails(invoiceId)
        }
        expandedInvoices.value.push(invoiceId)
    } else {
        expandedInvoices.value.splice(index, 1)
    }
}

function hasToppings(invoiceId) {
    return invoiceToppings.value[invoiceId] && invoiceToppings.value[invoiceId].length > 0
}

function getToppings(invoiceId) {
    return invoiceToppings.value[invoiceId] || []
}

function applyInvoiceFilters() {
    // فیلترها به صورت computed هستند و به صورت خودکار اعمال می‌شوند
}

function formatPrice(price) {
    return new Intl.NumberFormat('fa-IR').format(price) + ' تومان'
}

watch(() => invoices.value === 'manage-invoices', (newVal) => {
    // با تاخیر 100 میلی‌ثانیه صبر می‌کنیم تا DOM به روز رسانی شود
    setTimeout(loadDatePicker, 1000);
}, { deep: true });


function loadDatePicker() {
    jalaliDatepicker.startWatch({
        autoShow: false
    });

    // فقط inputهایی که هنوز رویداد focus برایشان تنظیم نشده را انتخاب کنید
    const inputList = document.querySelectorAll("input[data-jdp]:not([data-jdp-initialized])");

    for (let i = 0; i < inputList.length; i++) {
        inputList[i].setAttribute('data-jdp-initialized', 'true');

        inputList[i].addEventListener('focus', function () {
            if (this.hasAttribute("data-jdp-option-2")) {
                jalaliDatepicker.updateOptions({
                    date: true,
                    time: false,
                    hasSecond: false,
                    showEmptyBtn: false,
                    maxDate: 'today'
                });
            }
            else {
                jalaliDatepicker.updateOptions({
                    date: true,
                    time: true,
                    hasSecond: false,
                    showEmptyBtn: false,
                    initTime: '23:59'
                });
            }
            jalaliDatepicker.show(this);
        });
    }
}


////////////////////////
///// Virtual Keyboard ///////

const numberModeInputs = []

function handleInputClick(event, inputType) {
    if (IsShowKeyboard.value == true) {
        activeInputType.value = inputType
        showKeyboard.value = true

        isNumberMode.value = numberModeInputs.includes(inputType)

        // تنظیم ref مربوطه
        switch (inputType) {
            case 'searchcategory': activeInputRef.value = searchcategoryref.value; break
            case 'searchgoods': activeInputRef.value = searchgoodsref.value; break
            case 'searchtopitem': activeInputRef.value = searchtopitemref.value; break
            case 'searchtoplevel': activeInputRef.value = searchtoplevelref.value; break
            case 'searchinvoice': activeInputRef.value = searchinvoiceref.value; break
            case 'searchcustomer': activeInputRef.value = searchcustomerref.value; break
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
            case 'searchcategory': activeInputRef.value = searchcategoryref.value; break
            case 'searchgoods': activeInputRef.value = searchgoodsref.value; break
            case 'searchtopitem': activeInputRef.value = searchtopitemref.value; break
            case 'searchtoplevel': activeInputRef.value = searchtoplevelref.value; break
            case 'searchinvoice': activeInputRef.value = searchinvoiceref.value; break
            case 'searchcustomer': activeInputRef.value = searchcustomerref.value; break
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