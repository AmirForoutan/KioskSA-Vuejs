import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import VirtualKeyboard from "../../../components/VirtualKeyboard.vue";
import { can } from "../../../components/acl/can";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import { clearInvoiceEditRequest, INVOICE_EDIT_REQUEST_EVENT, peekInvoiceEditRequest, } from "../../../components/stores/invoice-edit.store";
import { clearTableOrderRequest, peekTableOrderRequest, TABLE_ORDER_REQUEST_EVENT, } from "../../../components/stores/table-order.store";
import { useAuthState } from "../../../components/stores/auth.store";
import { getCurrency, ShwoKeyboardStatus } from "../../../utilities";
import { fetchDesktopCustomerCredit, fetchRuntimeConfig, loadDesktopTables, loadDesktopCatalog, loadDesktopToppingData, payDesktopPos, searchDesktopCustomers, sendDesktopInvoice, updateDesktopInvoice, useDesktopCustomerCredit, } from "../../../services/desktopApi";
const categories = ref([]);
const goods = ref([]);
const toppingItems = ref([]);
const toppingLevels = ref([]);
const productToppings = ref([]);
const selectedCategoryId = ref(null);
const goodsSearch = ref("");
const customerSearch = ref("");
const customers = ref([]);
const selectedCustomer = ref(null);
const cart = ref([]);
const loading = ref(false);
const customerLoading = ref(false);
const isSubmitting = ref(false);
const checkoutOpen = ref(false);
const serviceMessage = ref("");
const currencyIsRial = ref(false);
const connectionId = ref(0);
const orderType = ref("2");
const desktopSettings = ref(null);
const tableGroups = ref([]);
const diningTables = ref([]);
const selectedTableGroupId = ref(null);
const selectedTable = ref(null);
const tablePickerOpen = ref(false);
const cashAmount = ref(0);
const creditAmount = ref(0);
const customerCredit = ref(0);
const creditChecked = ref(false);
const creditLoading = ref(false);
const creditMessage = ref("");
const discountMode = ref("none");
const discountPercent = ref(0);
const discountAmount = ref(0);
const toppingModalOpen = ref(false);
const toppingProduct = ref(null);
const selectedToppingCounts = ref({});
const auth = useAuthState();
const editingInvoice = ref(null);
const loadedEditRequestAt = ref(null);
const loadedTableRequestAt = ref(null);
let customerSearchTimer;
let customerSearchRequestId = 0;
useDesktopToastMessage(serviceMessage);
useDesktopToastMessage(creditMessage);
const keyboardEnabled = computed(() => {
    try {
        return ShwoKeyboardStatus();
    }
    catch {
        return false;
    }
});
const activeInputRef = ref(null);
const isNumberMode = ref(false);
const currencyLabel = computed(() => (currencyIsRial.value ? "ریال" : "تومان"));
const canDiscountPercent = computed(() => can("sales.discount.percent"));
const canDiscountAmount = computed(() => can("sales.discount.amount"));
const maxDiscountPercent = computed(() => canDiscountPercent.value ? Math.min(100, readUserLimit("discountPercentLimit", "DiscountPercentLimit", 100)) : 0);
const maxDiscountAmount = computed(() => canDiscountAmount.value ? Math.min(subTotal.value, readUserLimit("discountAmountLimit", "DiscountAmountLimit", subTotal.value)) : 0);
const canSubmit = computed(() => cart.value.length > 0 && !isSubmitting.value);
const orderTypeTitle = computed(() => (orderType.value === "3" ? "بیرون بر" : "سالن"));
const filteredGoods = computed(() => {
    const q = goodsSearch.value.trim().toLowerCase();
    return goods.value.filter((item) => {
        const isActive = item.IsActive !== false;
        const inCategory = selectedCategoryId.value === null || String(item.GoodsGroupId) === String(selectedCategoryId.value);
        const title = `${item.GoodsName ?? ""} ${item.GoodsCode ?? ""}`.toLowerCase();
        const matchesSearch = !q || title.includes(q);
        return isActive && inCategory && matchesSearch;
    });
});
const subTotal = computed(() => cart.value.reduce((sum, row) => sum + rowUnitPrice(row) * row.quantity, 0));
const taxTotal = computed(() => cart.value.reduce((sum, row) => {
    const percent = money(row.item.TaxPercent) + money(row.item.DutyPercent);
    return sum + (rowUnitPrice(row) * row.quantity * percent) / 100;
}, 0));
const packingTotal = computed(() => {
    if (orderType.value !== "3")
        return 0;
    return cart.value.reduce((sum, row) => sum + money(row.item.PackingPrice) * row.quantity, 0);
});
const discountValue = computed(() => {
    if (discountMode.value === "percent" && canDiscountPercent.value) {
        const percent = clamp(money(discountPercent.value), 0, maxDiscountPercent.value);
        return Math.min(subTotal.value, Math.floor((subTotal.value * percent) / 100));
    }
    if (discountMode.value === "amount" && canDiscountAmount.value) {
        return Math.min(subTotal.value, maxDiscountAmount.value, Math.max(discountAmount.value, 0));
    }
    return 0;
});
const grandTotal = computed(() => Math.max(subTotal.value + taxTotal.value + packingTotal.value - discountValue.value, 0));
const totalItemQuantity = computed(() => cart.value.reduce((sum, row) => sum + row.quantity, 0));
const payableAmount = computed(() => Math.round(grandTotal.value));
const originalPayableAmount = computed(() => Math.round(money(editingInvoice.value?.Payable)));
const editPaymentDifference = computed(() => editingInvoice.value ? payableAmount.value - originalPayableAmount.value : payableAmount.value);
const paymentTargetAmount = computed(() => editingInvoice.value ? Math.max(0, editPaymentDifference.value) : payableAmount.value);
const refundAmount = computed(() => editingInvoice.value ? Math.max(0, originalPayableAmount.value - payableAmount.value) : 0);
const normalizedCashAmount = computed(() => Math.max(0, Math.round(money(cashAmount.value))));
const normalizedCreditAmount = computed(() => Math.max(0, Math.round(money(creditAmount.value))));
const maxCreditUsable = computed(() => Math.min(customerCredit.value, paymentTargetAmount.value));
const paidWithoutPos = computed(() => normalizedCashAmount.value + normalizedCreditAmount.value);
const paymentOverage = computed(() => Math.max(0, paidWithoutPos.value - paymentTargetAmount.value));
const posPayableAmount = computed(() => Math.max(0, paymentTargetAmount.value - paidWithoutPos.value));
const editingOpenTableInvoice = computed(() => editingInvoice.value?.IsSettled === false);
const keepTableOpenForSubmit = computed(() => orderType.value === "2" &&
    (editingOpenTableInvoice.value || desktopSettings.value?.KeepSalonTableOpenAfterSubmit === true));
const requiresTableSelection = computed(() => orderType.value === "2" &&
    (keepTableOpenForSubmit.value || desktopSettings.value?.TableSelectionRequired === true));
const skipPaymentForTable = computed(() => keepTableOpenForSubmit.value);
const selectedTableTitle = computed(() => selectedTable.value ? `${selectedTable.value.TableTitle} (${selectedTable.value.TableCode})` : "انتخاب نشده");
const activeTableGroups = computed(() => tableGroups.value.filter((group) => group.IsActive !== false));
const activeDiningTables = computed(() => diningTables.value.filter((table) => table.IsActive !== false));
const tablesForSelectedGroup = computed(() => diningTables.value.filter((table) => {
    const matchesGroup = selectedTableGroupId.value === null || table.TableGroupId === selectedTableGroupId.value;
    return matchesGroup && table.IsActive !== false;
}));
const canConfirmCheckout = computed(() => {
    if (requiresTableSelection.value && !selectedTable.value)
        return false;
    if (skipPaymentForTable.value)
        return canSubmit.value;
    const usesCredit = normalizedCreditAmount.value > 0;
    return (canSubmit.value &&
        paymentOverage.value === 0 &&
        (!usesCredit ||
            (selectedCustomer.value !== null &&
                creditChecked.value &&
                normalizedCreditAmount.value <= maxCreditUsable.value)));
});
watch(grandTotal, () => normalizePaymentAmounts());
watch([discountMode, discountPercent, discountAmount, maxDiscountPercent, maxDiscountAmount], () => normalizeDiscountInputs());
watch(orderType, (value) => {
    if (value === "3")
        selectedTable.value = null;
});
onMounted(async () => {
    window.addEventListener(INVOICE_EDIT_REQUEST_EVENT, handleInvoiceEditRequest);
    window.addEventListener(TABLE_ORDER_REQUEST_EVENT, handleTableOrderRequest);
    try {
        currencyIsRial.value = getCurrency();
    }
    catch {
        currencyIsRial.value = false;
    }
    handleInvoiceEditRequest();
    await Promise.all([loadCatalog(), loadRuntimeSettings(), loadTables()]);
    handleInvoiceEditRequest();
    handleTableOrderRequest();
});
onBeforeUnmount(() => {
    window.clearTimeout(customerSearchTimer);
    window.removeEventListener(INVOICE_EDIT_REQUEST_EVENT, handleInvoiceEditRequest);
    window.removeEventListener(TABLE_ORDER_REQUEST_EVENT, handleTableOrderRequest);
});
async function loadCatalog() {
    loading.value = true;
    serviceMessage.value = "";
    try {
        const result = await loadDesktopCatalog(connectionId.value);
        categories.value = result.categories.length ? result.categories : [];
        goods.value = result.goods.length ? result.goods : [];
        selectedCategoryId.value = null;
        if (!result.categories.length || !result.goods.length) {
            serviceMessage.value = "داده سرویس کامل نبود؛ داده نمونه نمایش داده شد";
        }
        await loadToppings();
    }
    catch (error) {
        serviceMessage.value = error instanceof Error ? `${error.message} - داده نمونه نمایش داده شد` : "داده نمونه نمایش داده شد";
    }
    finally {
        loading.value = false;
    }
}
async function loadToppings() {
    try {
        const result = await loadDesktopToppingData(connectionId.value);
        toppingItems.value = result.items;
        toppingLevels.value = result.levels;
        productToppings.value = result.links;
    }
    catch (error) {
        toppingItems.value = [];
        toppingLevels.value = [];
        productToppings.value = [];
        const message = error instanceof Error ? error.message : "خطا در دریافت تاپینگ‌ها";
        serviceMessage.value = serviceMessage.value ? `${serviceMessage.value} | ${message}` : message;
    }
}
async function loadRuntimeSettings() {
    try {
        desktopSettings.value = await fetchRuntimeConfig();
    }
    catch {
        desktopSettings.value = null;
    }
}
async function loadTables() {
    try {
        const result = await loadDesktopTables();
        tableGroups.value = result.groups;
        diningTables.value = result.tables;
        if (selectedTable.value) {
            const fresh = tableById(selectedTable.value.TableId);
            if (fresh)
                selectedTable.value = fresh;
        }
        if (selectedTable.value?.TableGroupId) {
            selectedTableGroupId.value = selectedTable.value.TableGroupId;
        }
        else if (selectedTableGroupId.value === null ||
            !result.groups.some((group) => group.TableGroupId === selectedTableGroupId.value)) {
            selectedTableGroupId.value = result.groups[0]?.TableGroupId ?? null;
        }
    }
    catch (error) {
        tableGroups.value = [];
        diningTables.value = [];
        const message = error instanceof Error ? error.message : "خطا در دریافت میزها";
        serviceMessage.value = serviceMessage.value ? `${serviceMessage.value} | ${message}` : message;
    }
}
function tableById(tableId) {
    const id = Number(tableId);
    if (!Number.isFinite(id) || id <= 0)
        return null;
    return diningTables.value.find((table) => Number(table.TableId) === id) || null;
}
function setSelectedTableFromInvoice(invoice) {
    const tableId = Number(invoice.TableId ?? invoice.tableId);
    if (!Number.isFinite(tableId) || tableId <= 0) {
        selectedTable.value = null;
        return;
    }
    selectedTable.value =
        tableById(tableId) ||
            {
                TableId: tableId,
                TableGroupId: 0,
                TableTitle: String(invoice.TableTitle || `میز ${tableId}`),
                TableCode: String(invoice.TableCode || tableId),
                IsActive: true,
                IsOccupied: true,
                SaleInvoiceId: invoice.SaleInvoiceId,
                SaleInvoiceNumberDay: invoice.SaleInvoiceNumberDay,
                Payable: invoice.Payable,
                OpenedAt: invoice.TableOpenedAt,
                OccupiedMinutes: 0,
            };
    if (selectedTable.value?.TableGroupId)
        selectedTableGroupId.value = selectedTable.value.TableGroupId;
}
function canSelectDiningTable(table) {
    const isCurrent = selectedTable.value?.TableId === table.TableId;
    const isEditingSameInvoice = !!editingInvoice.value?.SaleInvoiceId && editingInvoice.value.SaleInvoiceId === table.SaleInvoiceId;
    return !table.IsOccupied || isCurrent || isEditingSameInvoice;
}
function selectDiningTable(table) {
    if (!canSelectDiningTable(table))
        return;
    selectedTable.value = table;
    selectedTableGroupId.value = table.TableGroupId || selectedTableGroupId.value;
    tablePickerOpen.value = false;
}
function selectDiningTableById(tableId) {
    const table = tableById(tableId);
    if (!table) {
        selectedTable.value = null;
        return;
    }
    selectDiningTable(table);
}
function handleTableDropdownChange(event) {
    const target = event.target;
    selectDiningTableById(target.value);
}
function tableOptionTitle(table) {
    const groupTitle = table.GroupTitle ? ` - ${table.GroupTitle}` : "";
    const occupied = table.IsOccupied && selectedTable.value?.TableId !== table.TableId ? " (اشغال)" : "";
    return `${table.TableTitle} (${table.TableCode})${groupTitle}${occupied}`;
}
function openTablePicker() {
    void loadTables();
    tablePickerOpen.value = true;
}
function formatOccupiedDuration(minutes) {
    const total = Math.max(0, Math.floor(money(minutes)));
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}
function handleInvoiceEditRequest() {
    const draft = peekInvoiceEditRequest();
    if (!draft)
        return;
    if (loadedEditRequestAt.value === draft.requestedAt)
        return;
    if (loadInvoiceForEdit(draft)) {
        loadedEditRequestAt.value = draft.requestedAt;
        clearInvoiceEditRequest(draft.requestedAt);
    }
}
function handleTableOrderRequest() {
    const draft = peekTableOrderRequest();
    if (!draft)
        return;
    if (loadedTableRequestAt.value === draft.requestedAt)
        return;
    const fresh = tableById(draft.table.TableId);
    const table = fresh || draft.table;
    if (table.IsActive === false) {
        loadedTableRequestAt.value = draft.requestedAt;
        clearTableOrderRequest(draft.requestedAt);
        serviceMessage.value = "این میز غیرفعال است و برای سفارش قابل انتخاب نیست";
        return;
    }
    orderType.value = "2";
    selectedTable.value = table;
    selectedTableGroupId.value = table.TableGroupId || selectedTableGroupId.value;
    tablePickerOpen.value = false;
    checkoutOpen.value = false;
    loadedTableRequestAt.value = draft.requestedAt;
    clearTableOrderRequest(draft.requestedAt);
    serviceMessage.value = `میز ${table.TableTitle} برای سفارش سالن انتخاب شد`;
}
function loadInvoiceForEdit(draft) {
    if (!draft.items.length) {
        serviceMessage.value = "اقلام فاکتور از سرویس دریافت نشد؛ دوباره دکمه ویرایش را بزنید";
        return false;
    }
    resetCart();
    editingInvoice.value = draft.invoice;
    orderType.value = invoiceOrderType(draft.invoice);
    const rows = draft.items
        .filter((item) => item && typeof item === "object")
        .map((item, index) => cartRowFromInvoiceItem(draft.invoice, item, index));
    if (!rows.length) {
        serviceMessage.value = "ساخت سبد از اقلام فاکتور انجام نشد؛ ساختار اقلام دریافتی معتبر نیست";
        return false;
    }
    cart.value = rows;
    setSelectedTableFromInvoice(draft.invoice);
    selectedCustomer.value = customerFromInvoice(draft.invoice);
    customerSearch.value = selectedCustomer.value
        ? `${customerName(selectedCustomer.value)} ${customerPhone(selectedCustomer.value)}`.trim()
        : "";
    customers.value = [];
    cashAmount.value = 0;
    creditAmount.value = 0;
    customerCredit.value = Math.max(creditAmount.value, money(selectedCustomer.value?.Credit));
    creditChecked.value = false;
    applyInvoiceDiscount(draft.invoice);
    normalizePaymentAmounts();
    normalizeDiscountInputs();
    checkoutOpen.value = false;
    serviceMessage.value = `فاکتور شماره ${draft.invoice.SaleInvoiceNumberDay} برای ویرایش باز شد`;
    return true;
}
function invoiceOrderType(invoice) {
    const record = invoice;
    const typeId = record.saleinvoiceTypeId ?? record.SaleInvoiceTypeId ?? record.InvoiceTypeId;
    if (String(typeId) === "3")
        return "3";
    const title = String(invoice.InvoiceTypeName || "");
    return title.includes("بیرون") || title.toLowerCase().includes("take") ? "3" : "2";
}
function customerFromInvoice(invoice) {
    if (!invoice.CustomerName && !invoice.Phone && !invoice.CustomerCode)
        return null;
    return {
        CustomerId: invoice.CustomerCode || 1,
        UserId: invoice.CustomerCode || 1,
        FullName: invoice.CustomerName || "",
        Name: invoice.CustomerName || "",
        PhoneNumber: invoice.Phone || "",
        Mobile: invoice.Phone || "",
        Credit: invoicePaymentPart(invoice, "credit"),
        CreditBalance: invoicePaymentPart(invoice, "credit"),
    };
}
function cartRowFromInvoiceItem(invoice, item, index) {
    const product = productFromInvoiceItem(item);
    const rowId = `edit-${invoice.SaleInvoiceId}-${item.SaleInvoiceItemId || item.InvoiceItemId || index}`;
    return {
        id: rowId,
        item: product,
        quantity: Math.max(1, money(item.Quantity ?? item.Count ?? item.GoodsCount) || 1),
        note: String(item.Note || item.Description || ""),
        toppings: toppingsFromInvoiceItem(item),
    };
}
function productFromInvoiceItem(item) {
    const record = item;
    const goodsId = item.GoodsId ?? item.ProductId ?? record.GoodsID ?? record.Goodsid ?? record.goodsId;
    const goodsCode = item.GoodsCode ?? item.ProductCode ?? record.Code ?? record.GoodsCode;
    const unitPrice = money(item.GoodsPrice ?? item.Price ?? item.ProductPrice);
    const fallbackId = `invoice-item-${item.SaleInvoiceItemId || item.InvoiceItemId || Date.now()}`;
    const found = goods.value.find((product) => {
        const idMatches = goodsId !== undefined && goodsId !== null && idsEqual(product.GoodsId, goodsId);
        const codeMatches = goodsCode !== undefined && goodsCode !== null && idsEqual(product.GoodsCode, goodsCode);
        return idMatches || codeMatches;
    });
    return {
        ...(found || {}),
        GoodsId: found?.GoodsId ?? primitiveKey(goodsId, fallbackId),
        GoodsCode: found?.GoodsCode ?? optionalPrimitiveKey(goodsCode),
        GoodsName: found?.GoodsName ?? item.GoodsName ?? item.ProductTitle ?? item.ProductName ?? "کالای فاکتور",
        GoodsDescription: found?.GoodsDescription ?? "",
        GoodsGroupId: found?.GoodsGroupId ?? selectedCategoryId.value ?? 0,
        GoodsPrice: unitPrice || money(found?.GoodsPrice),
        TaxPercent: found?.TaxPercent ?? 0,
        DutyPercent: found?.DutyPercent ?? 0,
        PackingPrice: found?.PackingPrice ?? 0,
        IsActive: found?.IsActive ?? true,
    };
}
function toppingsFromInvoiceItem(item) {
    const record = item;
    const raw = record.Toppings ?? record.toppings ?? record.InvoiceToppings ?? record.invoiceToppings;
    if (!Array.isArray(raw))
        return [];
    return raw.map((value, index) => {
        const topping = value && typeof value === "object" ? value : {};
        return {
            ToppingProductId: primitiveKey(topping.ToppingProductId ?? topping.GoodsId ?? topping.GoodsToppingId, index),
            ToppingId: primitiveKey(topping.ToppingId ?? topping.Id, index),
            GoodsName: String(topping.GoodsName || topping.ProductTitle || topping.ProductName || "تاپینگ"),
            GoodsId: primitiveKey(topping.GoodsId ?? topping.GoodsToppingId, index),
            Price: money(topping.Price ?? topping.GoodsPrice),
            LevelId: primitiveKey(topping.LevelId, 0),
            LevelName: String(topping.LevelName || topping.LevelTitle || ""),
            Count: Math.max(1, money(topping.Count ?? topping.Quantity ?? topping.GoodsCount) || 1),
        };
    });
}
function primitiveKey(value, fallback) {
    if (typeof value === "string" || typeof value === "number")
        return value;
    if (value !== undefined && value !== null)
        return String(value);
    return fallback;
}
function optionalPrimitiveKey(value) {
    if (typeof value === "string" || typeof value === "number")
        return value;
    if (value !== undefined && value !== null)
        return String(value);
    return undefined;
}
function invoicePaymentPart(invoice, key) {
    const pos = money(invoice.PosPrice);
    const cash = money(invoice.CashPrice);
    const credit = money(invoice.CreditPrice);
    if (pos + cash + credit === 0 && money(invoice.Payable) > 0) {
        return key === "pos" ? money(invoice.Payable) : 0;
    }
    if (key === "cash")
        return cash;
    if (key === "credit")
        return credit;
    return pos;
}
function applyInvoiceDiscount(invoice) {
    const discount = money(invoice.Discount ?? invoice.InvoiceDiscount);
    if (discount <= 0) {
        setDiscountMode("none");
        return;
    }
    if (canDiscountAmount.value) {
        setDiscountMode("amount");
        discountAmount.value = discount;
    }
    else if (canDiscountPercent.value && subTotal.value > 0) {
        setDiscountMode("percent");
        discountPercent.value = Math.round((discount / subTotal.value) * 100);
    }
}
function bindKeyboard(el, numberMode = false) {
    if (!keyboardEnabled.value)
        return;
    activeInputRef.value = el;
    isNumberMode.value = numberMode;
}
function hideKeyboard() {
    activeInputRef.value = null;
}
function handleKeyPress(_key) {
    return;
}
function money(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
function readUserLimit(lowerKey, upperKey, fallback) {
    const user = auth.user;
    const raw = user?.[lowerKey] ?? user?.[upperKey];
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}
function formatMoney(value) {
    return Math.round(value).toLocaleString();
}
function idsEqual(left, right) {
    return String(left) === String(right);
}
function rowToppingsTotal(row) {
    return row.toppings.reduce((sum, topping) => sum + money(topping.Price) * Math.max(money(topping.Count), 1), 0);
}
function rowUnitPrice(row) {
    return money(row.item.GoodsPrice) + rowToppingsTotal(row);
}
function toppingKey(link) {
    return String(link.ToppingId || `${link.GoodsId}-${link.GoodsToppingId}-${link.LevelId}`);
}
function linksForProduct(product) {
    if (!product)
        return [];
    return productToppings.value.filter((link) => idsEqual(link.GoodsId, product.GoodsId));
}
function hasToppings(product) {
    return linksForProduct(product).length > 0;
}
function findToppingItem(goodsToppingId) {
    return toppingItems.value.find((item) => idsEqual(item.GoodsId, goodsToppingId));
}
function findToppingLevel(levelId) {
    return toppingLevels.value.find((level) => idsEqual(level.LevelId, levelId));
}
function toppingItemTitle(link) {
    return findToppingItem(link.GoodsToppingId)?.GoodsName || `تاپینگ ${link.GoodsToppingId}`;
}
function toppingLevelTitle(levelId) {
    return findToppingLevel(levelId)?.LevelTitle || `مرحله ${levelId}`;
}
function toppingGroups(product) {
    const links = linksForProduct(product);
    const levelIds = Array.from(new Set(links.map((link) => String(link.LevelId))));
    return levelIds
        .map((levelId) => ({
        level: findToppingLevel(levelId),
        links: links.filter((link) => idsEqual(link.LevelId, levelId)),
    }))
        .sort((a, b) => money(a.level?.Priority) - money(b.level?.Priority));
}
function selectedToppingCount(link) {
    return selectedToppingCounts.value[toppingKey(link)] || 0;
}
function selectedLevelCount(levelId) {
    return linksForProduct(toppingProduct.value)
        .filter((link) => idsEqual(link.LevelId, levelId))
        .reduce((sum, link) => sum + selectedToppingCount(link), 0);
}
function setToppingCount(link, delta) {
    const key = toppingKey(link);
    const current = selectedToppingCount(link);
    const next = Math.max(0, current + delta);
    const itemMax = Math.max(money(link.MaxCount), 1);
    const level = findToppingLevel(link.LevelId);
    const levelMax = Math.max(money(level?.MaxCount || link.MaxCount), 1);
    const currentLevelCount = selectedLevelCount(link.LevelId);
    if (delta > 0 && (current >= itemMax || currentLevelCount >= levelMax))
        return;
    selectedToppingCounts.value = {
        ...selectedToppingCounts.value,
        [key]: Math.min(next, itemMax),
    };
}
function buildSelectedToppings() {
    const selected = [];
    for (const link of linksForProduct(toppingProduct.value)) {
        const count = selectedToppingCount(link);
        const item = findToppingItem(link.GoodsToppingId);
        const level = findToppingLevel(link.LevelId);
        if (count <= 0)
            continue;
        selected.push({
            ToppingProductId: link.GoodsToppingId,
            ToppingId: link.ToppingId,
            GoodsName: item?.GoodsName || `تاپینگ ${link.GoodsToppingId}`,
            GoodsId: link.GoodsToppingId,
            Price: money(link.Price),
            LevelId: link.LevelId,
            LevelName: level?.LevelTitle || "",
            Count: count,
        });
    }
    return selected;
}
function categoryTitle(category) {
    return category.GroupName || category.GroupTitle || `دسته ${category.GroupId}`;
}
function categoryImage(category) {
    const code = category.GroupCode || category.GroupId;
    const version = new Date().toISOString().slice(0, 13).replace(/[^0-9]/g, "");
    return `/img/groups/${code}.png?v=${version}`;
}
function productImage(product) {
    const code = product.GoodsCode || product.GoodsId;
    const version = new Date().toISOString().slice(0, 13).replace(/[^0-9]/g, "");
    return `/img/goods/${code}.png?v=${version}`;
}
function handleImageError(event) {
    const image = event.target;
    image.src = "/img/goods/default.png";
}
function handleCategoryImageError(event) {
    const image = event.target;
    image.style.display = "none";
}
function addToCart(product) {
    if (hasToppings(product)) {
        toppingProduct.value = product;
        selectedToppingCounts.value = {};
        toppingModalOpen.value = true;
        return;
    }
    addProductToCart(product, []);
}
function toppingsSignature(toppings) {
    return toppings
        .map((item) => `${item.ToppingId}:${item.GoodsId}:${item.Count}`)
        .sort()
        .join("|");
}
function addProductToCart(product, toppings) {
    const signature = toppingsSignature(toppings);
    const existing = cart.value.find((row) => idsEqual(row.item.GoodsId, product.GoodsId) && toppingsSignature(row.toppings) === signature);
    if (existing) {
        existing.quantity += 1;
        return;
    }
    cart.value.push({
        id: `${Date.now()}-${product.GoodsId}`,
        item: { ...product },
        quantity: 1,
        note: "",
        toppings,
    });
}
function confirmToppings() {
    if (!toppingProduct.value)
        return;
    const invalidLevel = toppingGroups(toppingProduct.value).find(({ level, links }) => {
        const min = money(level?.MinCount ?? links[0]?.MinCount);
        const selected = links.reduce((sum, link) => sum + selectedToppingCount(link), 0);
        return selected < min;
    });
    if (invalidLevel) {
        serviceMessage.value = `حداقل انتخاب مرحله ${invalidLevel.level?.LevelTitle || ""} رعایت نشده است`;
        return;
    }
    addProductToCart(toppingProduct.value, buildSelectedToppings());
    toppingModalOpen.value = false;
    toppingProduct.value = null;
    selectedToppingCounts.value = {};
}
function closeToppingModal() {
    toppingModalOpen.value = false;
    toppingProduct.value = null;
    selectedToppingCounts.value = {};
}
function increase(row) {
    row.quantity += 1;
}
function decrease(row) {
    if (row.quantity > 1)
        row.quantity -= 1;
    else
        removeRow(row.id);
}
function removeRow(id) {
    cart.value = cart.value.filter((row) => row.id !== id);
}
function resetCart() {
    cart.value = [];
    editingInvoice.value = null;
    loadedEditRequestAt.value = null;
    checkoutOpen.value = false;
    toppingModalOpen.value = false;
    toppingProduct.value = null;
    selectedToppingCounts.value = {};
    selectedCustomer.value = null;
    selectedTable.value = null;
    tablePickerOpen.value = false;
    customerSearch.value = "";
    customers.value = [];
    cashAmount.value = 0;
    creditAmount.value = 0;
    resetCreditState();
    discountMode.value = "none";
    discountPercent.value = 0;
    discountAmount.value = 0;
}
function cancelDraftInvoice() {
    if (!cart.value.length)
        return;
    const wasEditing = !!editingInvoice.value;
    resetCart();
    serviceMessage.value = wasEditing ? "ویرایش فاکتور لغو شد" : "فاکتور حذف شد و ثبت نمی‌شود";
}
function setDiscountMode(mode) {
    discountMode.value = mode;
    if (mode !== "percent")
        discountPercent.value = 0;
    if (mode !== "amount")
        discountAmount.value = 0;
    normalizeDiscountInputs();
}
function normalizeDiscountInputs() {
    if (discountMode.value === "percent") {
        if (!canDiscountPercent.value) {
            setDiscountMode("none");
            return;
        }
        discountPercent.value = clamp(money(discountPercent.value), 0, maxDiscountPercent.value);
    }
    if (discountMode.value === "amount") {
        if (!canDiscountAmount.value) {
            setDiscountMode("none");
            return;
        }
        discountAmount.value = clamp(money(discountAmount.value), 0, maxDiscountAmount.value);
    }
}
function customerName(customer) {
    const fullName = customer.FullName || customer.Name;
    if (fullName)
        return String(fullName);
    const first = customer.Firstname ? String(customer.Firstname) : "";
    const last = customer.Lastname ? String(customer.Lastname) : "";
    return `${first} ${last}`.trim() || "مشتری";
}
function customerPhone(customer) {
    return String(customer.PhoneNumber || customer.Mobile || "");
}
function queueFindCustomers() {
    const term = customerSearch.value.trim();
    selectedCustomer.value = null;
    resetCreditState();
    customerSearchRequestId += 1;
    window.clearTimeout(customerSearchTimer);
    if (term.length < 2) {
        customers.value = [];
        customerLoading.value = false;
        return;
    }
    customerLoading.value = true;
    const requestId = customerSearchRequestId;
    customerSearchTimer = window.setTimeout(() => void findCustomers(term, requestId), 450);
}
async function findCustomers(term, requestId) {
    customerLoading.value = true;
    try {
        const result = await searchDesktopCustomers(term);
        if (requestId !== customerSearchRequestId || term !== customerSearch.value.trim())
            return;
        customers.value = result;
    }
    catch (error) {
        if (requestId !== customerSearchRequestId)
            return;
        serviceMessage.value = error instanceof Error ? error.message : "خطا در جستجوی مشتری";
        customers.value = [];
    }
    finally {
        if (requestId === customerSearchRequestId)
            customerLoading.value = false;
    }
}
function selectCustomer(customer) {
    window.clearTimeout(customerSearchTimer);
    customerSearchRequestId += 1;
    resetCreditState();
    selectedCustomer.value = customer;
    customerSearch.value = `${customerName(customer)} ${customerPhone(customer)}`.trim();
    customers.value = [];
}
function responseIsOk(response) {
    return response.status === true || response.status === "ok" || response.status === undefined;
}
function resetCreditState() {
    customerCredit.value = 0;
    creditChecked.value = false;
    creditLoading.value = false;
    creditMessage.value = "";
    creditAmount.value = 0;
}
function extractRecord(value) {
    return value && typeof value === "object" ? value : null;
}
function extractNumber(payload, keys) {
    const record = extractRecord(payload);
    if (!record)
        return 0;
    for (const key of keys) {
        const value = record[key];
        if (value !== undefined && value !== null)
            return Math.max(0, Math.round(money(value)));
    }
    const data = extractRecord(record.data);
    return data ? extractNumber(data, keys) : 0;
}
function extractInvoiceId(response) {
    const record = extractRecord(response);
    if (!record)
        return 0;
    const keys = ["SID", "SaleInvoiceId", "saleInvoiceId", "InvoiceId", "invoiceId", "id"];
    for (const key of keys) {
        const value = record[key];
        if (value !== undefined && value !== null && String(value).trim())
            return Number(value) || 0;
    }
    const data = extractRecord(record.data);
    if (data) {
        for (const key of keys) {
            const value = data[key];
            if (value !== undefined && value !== null && String(value).trim())
                return Number(value) || 0;
        }
    }
    return 0;
}
function toPosDeviceAmount(amount) {
    return Math.round(currencyIsRial.value ? amount : amount * 10);
}
function normalizePaymentAmounts(changed) {
    const payable = paymentTargetAmount.value;
    let cash = Math.max(0, Math.round(money(cashAmount.value)));
    let credit = Math.max(0, Math.round(money(creditAmount.value)));
    if (!selectedCustomer.value || !creditChecked.value)
        credit = 0;
    cash = Math.min(cash, payable);
    credit = Math.min(credit, maxCreditUsable.value, payable);
    if (cash + credit > payable) {
        if (changed === "cash") {
            cash = Math.max(0, payable - credit);
        }
        else {
            credit = Math.max(0, Math.min(maxCreditUsable.value, payable - cash));
        }
    }
    cashAmount.value = cash;
    creditAmount.value = credit;
}
function fillCashAmount() {
    cashAmount.value = Math.max(0, paymentTargetAmount.value - normalizedCreditAmount.value);
    normalizePaymentAmounts("cash");
}
function fillCreditAmount() {
    if (!selectedCustomer.value) {
        creditMessage.value = "برای استفاده از اعتبار، ابتدا مشتری را انتخاب کنید";
        return;
    }
    if (!creditChecked.value) {
        creditMessage.value = "ابتدا اعتبار مشتری را بررسی کنید";
        return;
    }
    creditAmount.value = Math.min(maxCreditUsable.value, Math.max(0, paymentTargetAmount.value - normalizedCashAmount.value));
    normalizePaymentAmounts("credit");
}
function clearPaymentAmounts() {
    cashAmount.value = 0;
    creditAmount.value = 0;
}
async function checkSelectedCustomerCredit() {
    if (!selectedCustomer.value) {
        creditMessage.value = "برای بررسی اعتبار، ابتدا مشتری را انتخاب کنید";
        return;
    }
    const phone = customerPhone(selectedCustomer.value).trim();
    if (!phone) {
        creditMessage.value = "شماره موبایل مشتری ثبت نشده است";
        return;
    }
    creditLoading.value = true;
    creditMessage.value = "";
    try {
        const result = await fetchDesktopCustomerCredit(phone);
        if (!responseIsOk(result)) {
            resetCreditState();
            creditMessage.value = result.message || "اعتبار مشتری قابل دریافت نیست";
            return;
        }
        const credit = extractNumber(result, ["Credit", "credit", "CreditBalance", "creditBalance", "Balance"]);
        customerCredit.value = credit;
        creditChecked.value = true;
        selectedCustomer.value = {
            ...selectedCustomer.value,
            Credit: credit,
            CreditBalance: credit,
            CustomerId: result.UID || selectedCustomer.value.CustomerId || selectedCustomer.value.UserId,
        };
        normalizePaymentAmounts("credit");
        creditMessage.value =
            credit > 0
                ? `اعتبار قابل استفاده: ${formatMoney(Math.min(credit, paymentTargetAmount.value))} ${currencyLabel.value}`
                : "این مشتری اعتبار قابل استفاده ندارد";
    }
    catch (error) {
        resetCreditState();
        creditMessage.value = error instanceof Error ? error.message : "خطا در بررسی اعتبار مشتری";
    }
    finally {
        creditLoading.value = false;
    }
}
function prepareCustomerData(customer) {
    if (!customer)
        return { CustomerId: 1, userName: "مشتری", UserPhone: '', usedCredit: 0, usedDiscount: null, totalDiscount: 0 };
    return {
        ...customer,
        CustomerId: customer.CustomerId || customer.UserId || 1,
        userName: customerName(customer),
        UserPhone: customerPhone(customer),
        usedCredit: normalizedCreditAmount.value,
        usedDiscount: customer.usedDiscount && typeof customer.usedDiscount === "object"
            ? customer.usedDiscount
            : null,
        totalDiscount: money(customer.totalDiscount),
    };
}
function buildToppingsPayload() {
    return cart.value.reduce((payload, row) => {
        payload[row.id] = row.toppings.map((topping) => ({ ...topping }));
        return payload;
    }, {});
}
function buildPayDetails() {
    if (skipPaymentForTable.value) {
        return {
            PosPrice: 0,
            CashPrice: 0,
            CreditPrice: 0,
        };
    }
    normalizePaymentAmounts();
    const payable = paymentTargetAmount.value;
    const cash = Math.min(normalizedCashAmount.value, payable);
    const credit = Math.min(normalizedCreditAmount.value, Math.max(0, payable - cash));
    return {
        PosPrice: Math.max(0, payable - cash - credit),
        CashPrice: cash,
        CreditPrice: credit,
    };
}
function openCheckout() {
    if (!canSubmit.value)
        return;
    serviceMessage.value = "";
    normalizePaymentAmounts();
    checkoutOpen.value = true;
}
async function submitInvoice() {
    if (!canSubmit.value)
        return;
    normalizePaymentAmounts();
    const payDetails = buildPayDetails();
    if (requiresTableSelection.value && !selectedTable.value) {
        serviceMessage.value = "برای سفارش سالن باید میز انتخاب شود";
        checkoutOpen.value = true;
        tablePickerOpen.value = true;
        return;
    }
    if (payDetails.CreditPrice > 0 && !selectedCustomer.value) {
        serviceMessage.value = "برای پرداخت اعتباری باید مشتری انتخاب شود";
        checkoutOpen.value = true;
        return;
    }
    if (payDetails.CreditPrice > 0 && (!creditChecked.value || payDetails.CreditPrice > maxCreditUsable.value)) {
        serviceMessage.value = "ابتدا اعتبار مشتری را بررسی کنید و مبلغ اعتباری را اصلاح کنید";
        checkoutOpen.value = true;
        return;
    }
    isSubmitting.value = true;
    serviceMessage.value = "";
    try {
        const invoicePayload = {
            SaleInvoiceId: editingInvoice.value?.SaleInvoiceId,
            InvoiceId: editingInvoice.value?.SaleInvoiceId,
            customerData: prepareCustomerData(selectedCustomer.value),
            items: cart.value.map((row) => ({
                id: row.id,
                item: row.item,
                quantity: row.quantity,
                note: row.note,
            })),
            toppings: buildToppingsPayload(),
            tax: Math.round(taxTotal.value),
            packingFee: Math.round(packingTotal.value),
            SumItems: Math.round(subTotal.value),
            PayableAmount: Math.round(grandTotal.value),
            PreviousPayableAmount: Math.round(originalPayableAmount.value),
            PaymentDifference: Math.round(editPaymentDifference.value),
            CurrencyName: currencyLabel.value,
            InvoiceDiscount: Math.round(discountValue.value),
            saleinvoiceTypeId: Number(orderType.value),
            BranchId: connectionId.value,
            TableId: selectedTable.value?.TableId ?? Number(editingInvoice.value?.TableId || 0),
            KeepTableOpen: keepTableOpenForSubmit.value,
            SkipFinancialReceipt: skipPaymentForTable.value,
            IsSettled: !keepTableOpenForSubmit.value,
            PayDetails: payDetails,
        };
        if (payDetails.PosPrice > 0) {
            const posResult = await payDesktopPos(toPosDeviceAmount(payDetails.PosPrice));
            if (!responseIsOk(posResult)) {
                serviceMessage.value = posResult.message || "پرداخت POS تایید نشد";
                return;
            }
        }
        const invoiceResult = editingInvoice.value
            ? await updateDesktopInvoice(editingInvoice.value.SaleInvoiceId, invoicePayload)
            : await sendDesktopInvoice(invoicePayload);
        if (!responseIsOk(invoiceResult)) {
            serviceMessage.value = invoiceResult.message || (editingInvoice.value ? "ویرایش فاکتور ناموفق بود" : "ثبت فاکتور ناموفق بود");
            return;
        }
        if (payDetails.CreditPrice > 0 && selectedCustomer.value) {
            const creditResult = await useDesktopCustomerCredit({
                SaleInvoiceId: editingInvoice.value?.SaleInvoiceId || extractInvoiceId(invoiceResult),
                CustomerPhone: customerPhone(selectedCustomer.value),
                TotalDebt: payDetails.CreditPrice,
                CashAmount: 0,
                PosAmount: 0,
                CreditAmount: payDetails.CreditPrice,
            });
            if (!responseIsOk(creditResult)) {
                serviceMessage.value = creditResult.message || "فاکتور ثبت شد اما کسر اعتبار مشتری ناموفق بود";
                return;
            }
        }
        const refund = refundAmount.value;
        const baseDoneMessage = invoiceResult.message || (editingInvoice.value ? "فاکتور ویرایش شد" : "فاکتور ثبت شد");
        const doneMessage = editingInvoice.value && refund > 0
            ? `${baseDoneMessage}؛ مبلغ ${formatMoney(refund)} ${currencyLabel.value} باید به مشتری برگردد`
            : baseDoneMessage;
        checkoutOpen.value = false;
        resetCart();
        serviceMessage.value = doneMessage;
    }
    catch (error) {
        serviceMessage.value = error instanceof Error ? error.message : editingInvoice.value ? "خطا در ویرایش فاکتور" : "خطا در ثبت فاکتور";
    }
    finally {
        isSubmitting.value = false;
    }
}
function todayDate() {
    const now = new Date();
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
}
function currentTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['category-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['goods-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['invoice-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['category-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['category-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['category-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['category-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-input']} */ ;
/** @type {__VLS_StyleScopedClasses['goods-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-input']} */ ;
/** @type {__VLS_StyleScopedClasses['goods-card']} */ ;
/** @type {__VLS_StyleScopedClasses['goods-card']} */ ;
/** @type {__VLS_StyleScopedClasses['goods-card']} */ ;
/** @type {__VLS_StyleScopedClasses['goods-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['edit-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['edit-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['edit-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-box']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-input']} */ ;
/** @type {__VLS_StyleScopedClasses['table-inline-select']} */ ;
/** @type {__VLS_StyleScopedClasses['table-inline-select']} */ ;
/** @type {__VLS_StyleScopedClasses['table-inline-select']} */ ;
/** @type {__VLS_StyleScopedClasses['table-inline-select']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-input']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-results']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-results']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-results']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-product']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-product']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-toppings']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-toppings']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-product']} */ ;
/** @type {__VLS_StyleScopedClasses['qty-control']} */ ;
/** @type {__VLS_StyleScopedClasses['remove-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['qty-control']} */ ;
/** @type {__VLS_StyleScopedClasses['remove-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['segmented']} */ ;
/** @type {__VLS_StyleScopedClasses['segmented']} */ ;
/** @type {__VLS_StyleScopedClasses['segmented']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['totals-box']} */ ;
/** @type {__VLS_StyleScopedClasses['totals-box']} */ ;
/** @type {__VLS_StyleScopedClasses['totals-box']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-group-title']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-option']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-option']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-option']} */ ;
/** @type {__VLS_StyleScopedClasses['choice-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['choice-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['choice-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['choice-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['table-selection-box']} */ ;
/** @type {__VLS_StyleScopedClasses['table-selection-box']} */ ;
/** @type {__VLS_StyleScopedClasses['table-selection-box']} */ ;
/** @type {__VLS_StyleScopedClasses['table-selection-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-input']} */ ;
/** @type {__VLS_StyleScopedClasses['table-group-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['table-group-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['table-pick-card']} */ ;
/** @type {__VLS_StyleScopedClasses['table-pick-card']} */ ;
/** @type {__VLS_StyleScopedClasses['table-pick-card']} */ ;
/** @type {__VLS_StyleScopedClasses['table-pick-card']} */ ;
/** @type {__VLS_StyleScopedClasses['table-pick-card']} */ ;
/** @type {__VLS_StyleScopedClasses['table-pick-card']} */ ;
/** @type {__VLS_StyleScopedClasses['table-pick-card']} */ ;
/** @type {__VLS_StyleScopedClasses['table-card-time']} */ ;
/** @type {__VLS_StyleScopedClasses['table-card-money']} */ ;
/** @type {__VLS_StyleScopedClasses['pay-field']} */ ;
/** @type {__VLS_StyleScopedClasses['readonly-pay']} */ ;
/** @type {__VLS_StyleScopedClasses['readonly-pay']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['credit-tools']} */ ;
/** @type {__VLS_StyleScopedClasses['credit-tools']} */ ;
/** @type {__VLS_StyleScopedClasses['credit-tools']} */ ;
/** @type {__VLS_StyleScopedClasses['credit-status']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-note']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['grand']} */ ;
/** @type {__VLS_StyleScopedClasses['sales-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head']} */ ;
/** @type {__VLS_StyleScopedClasses['goods-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['goods-card']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-box']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-results']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-table']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-row']} */ ;
/** @type {__VLS_StyleScopedClasses['qty-control']} */ ;
/** @type {__VLS_StyleScopedClasses['remove-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['totals-box']} */ ;
/** @type {__VLS_StyleScopedClasses['invoice-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['pay-input-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['credit-tools']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-tool-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-tool-actions']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sales-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "category-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-head compact" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-sub" },
});
(__VLS_ctx.categories.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadCatalog) },
    ...{ class: "icon-btn" },
    disabled: (__VLS_ctx.loading),
    title: "بازخوانی",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "category-list" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.selectedCategoryId = null;
        } },
    ...{ class: "category-btn" },
    ...{ class: ({ active: __VLS_ctx.selectedCategoryId === null }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "category-all-icon" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
for (const [category] of __VLS_getVForSourceType((__VLS_ctx.categories))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectedCategoryId = category.GroupId;
            } },
        key: (category.GroupId),
        ...{ class: "category-btn" },
        ...{ class: ({ active: String(category.GroupId) === String(__VLS_ctx.selectedCategoryId) }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        ...{ onError: (__VLS_ctx.handleCategoryImageError) },
        src: (__VLS_ctx.categoryImage(category)),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.categoryTitle(category));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "goods-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-sub" },
});
(__VLS_ctx.filteredGoods.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.bindKeyboard($event.target);
        } },
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.bindKeyboard($event.target);
        } },
    ...{ class: "desktop-input" },
    placeholder: "جستجوی نام یا کد کالا...",
});
(__VLS_ctx.goodsSearch);
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "state-box" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "goods-grid" },
    });
    for (const [product] of __VLS_getVForSourceType((__VLS_ctx.filteredGoods))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    __VLS_ctx.addToCart(product);
                } },
            key: (product.GoodsId),
            ...{ class: "goods-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            ...{ onError: (__VLS_ctx.handleImageError) },
            src: (__VLS_ctx.productImage(product)),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "goods-name" },
        });
        (product.GoodsName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "goods-desc" },
        });
        (product.GoodsDescription || "بدون توضیح");
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "goods-meta" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatMoney(__VLS_ctx.money(product.GoodsPrice)));
        (__VLS_ctx.currencyLabel);
        if (__VLS_ctx.money(product.StockInventory) > 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (product.StockInventory);
        }
        if (__VLS_ctx.hasToppings(product)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "goods-topping-badge" },
            });
        }
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "invoice-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.cancelDraftInvoice) },
    ...{ class: "desktop-btn muted" },
    disabled: (__VLS_ctx.cart.length === 0),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.openCheckout) },
    ...{ class: "desktop-btn primary" },
    disabled: (!__VLS_ctx.canSubmit),
});
(__VLS_ctx.isSubmitting ? "در حال ثبت" : __VLS_ctx.editingInvoice ? "ادامه ویرایش" : "ادامه ثبت");
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title" },
});
(__VLS_ctx.editingInvoice ? "ویرایش فاکتور" : "سبد خرید و فاکتور");
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-sub" },
});
(__VLS_ctx.cart.length);
(__VLS_ctx.totalItemQuantity);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "total-badge" },
});
(__VLS_ctx.formatMoney(__VLS_ctx.grandTotal));
(__VLS_ctx.currencyLabel);
if (__VLS_ctx.editingInvoice) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "edit-banner" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.editingInvoice.SaleInvoiceNumberDay);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.cancelDraftInvoice) },
        ...{ class: "mini-btn" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "customer-box" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onInput: (__VLS_ctx.queueFindCustomers) },
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.bindKeyboard($event.target);
        } },
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.bindKeyboard($event.target);
        } },
    ...{ class: "desktop-input" },
    placeholder: "جستجوی مشتری با نام یا موبایل...",
});
(__VLS_ctx.customerSearch);
if (__VLS_ctx.customerLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "customer-status" },
    });
}
else if (__VLS_ctx.customers.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "customer-results" },
    });
    for (const [customer] of __VLS_getVForSourceType((__VLS_ctx.customers))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.customerLoading))
                        return;
                    if (!(__VLS_ctx.customers.length))
                        return;
                    __VLS_ctx.selectCustomer(customer);
                } },
            key: (`${customer.UserId || customer.CustomerId || __VLS_ctx.customerPhone(customer)}`),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.customerName(customer));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (__VLS_ctx.customerPhone(customer));
    }
}
if (__VLS_ctx.orderType === '2') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-inline-select" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.selectedTableTitle);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (__VLS_ctx.handleTableDropdownChange) },
        ...{ class: "desktop-input" },
        value: (__VLS_ctx.selectedTable?.TableId || 0),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (0),
    });
    for (const [table] of __VLS_getVForSourceType((__VLS_ctx.activeDiningTables))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (`order-table-${table.TableId}`),
            value: (table.TableId),
            disabled: (!__VLS_ctx.canSelectDiningTable(table)),
        });
        (__VLS_ctx.tableOptionTitle(table));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.openTablePicker) },
        type: "button",
        ...{ class: "desktop-btn muted" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cart-table" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cart-section-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.totalItemQuantity.toLocaleString());
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cart-row cart-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
if (__VLS_ctx.cart.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "empty-cart" },
    });
}
for (const [row] of __VLS_getVForSourceType((__VLS_ctx.cart))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (row.id),
        ...{ class: "cart-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cart-product" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (row.item.GoodsName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.formatMoney(__VLS_ctx.money(row.item.GoodsPrice)));
    (__VLS_ctx.currencyLabel);
    if (row.toppings.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "cart-toppings" },
        });
        for (const [topping] of __VLS_getVForSourceType((row.toppings))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                key: (`${row.id}-${topping.ToppingId}-${topping.GoodsId}`),
            });
            (topping.GoodsName);
            if (topping.Count > 1) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
                (topping.Count);
            }
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "توضیحات",
    });
    (row.note);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "qty-control" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.decrease(row);
            } },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (row.quantity);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.increase(row);
            } },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row-price" },
    });
    (__VLS_ctx.formatMoney(__VLS_ctx.rowUnitPrice(row) * row.quantity));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.removeRow(row.id);
            } },
        ...{ class: "remove-btn" },
    });
}
if (__VLS_ctx.canDiscountPercent || __VLS_ctx.canDiscountAmount) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "invoice-controls" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "discount-box" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "segmented" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.canDiscountPercent || __VLS_ctx.canDiscountAmount))
                    return;
                __VLS_ctx.setDiscountMode('none');
            } },
        ...{ class: ({ active: __VLS_ctx.discountMode === 'none' }) },
    });
    if (__VLS_ctx.canDiscountPercent) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.canDiscountPercent || __VLS_ctx.canDiscountAmount))
                        return;
                    if (!(__VLS_ctx.canDiscountPercent))
                        return;
                    __VLS_ctx.setDiscountMode('percent');
                } },
            ...{ class: ({ active: __VLS_ctx.discountMode === 'percent' }) },
        });
    }
    if (__VLS_ctx.canDiscountAmount) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.canDiscountPercent || __VLS_ctx.canDiscountAmount))
                        return;
                    if (!(__VLS_ctx.canDiscountAmount))
                        return;
                    __VLS_ctx.setDiscountMode('amount');
                } },
            ...{ class: ({ active: __VLS_ctx.discountMode === 'amount' }) },
        });
    }
    if (__VLS_ctx.discountMode === 'percent') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onFocus: (...[$event]) => {
                    if (!(__VLS_ctx.canDiscountPercent || __VLS_ctx.canDiscountAmount))
                        return;
                    if (!(__VLS_ctx.discountMode === 'percent'))
                        return;
                    __VLS_ctx.bindKeyboard($event.target, true);
                } },
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.canDiscountPercent || __VLS_ctx.canDiscountAmount))
                        return;
                    if (!(__VLS_ctx.discountMode === 'percent'))
                        return;
                    __VLS_ctx.bindKeyboard($event.target, true);
                } },
            ...{ class: "desktop-input" },
            type: "number",
            min: "0",
            max: (__VLS_ctx.maxDiscountPercent),
            placeholder: "درصد تخفیف",
        });
        (__VLS_ctx.discountPercent);
    }
    if (__VLS_ctx.discountMode === 'amount') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onFocus: (...[$event]) => {
                    if (!(__VLS_ctx.canDiscountPercent || __VLS_ctx.canDiscountAmount))
                        return;
                    if (!(__VLS_ctx.discountMode === 'amount'))
                        return;
                    __VLS_ctx.bindKeyboard($event.target, true);
                } },
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.canDiscountPercent || __VLS_ctx.canDiscountAmount))
                        return;
                    if (!(__VLS_ctx.discountMode === 'amount'))
                        return;
                    __VLS_ctx.bindKeyboard($event.target, true);
                } },
            ...{ class: "desktop-input" },
            type: "number",
            min: "0",
            max: (__VLS_ctx.maxDiscountAmount),
            placeholder: "مبلغ تخفیف",
        });
        (__VLS_ctx.discountAmount);
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "totals-box" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.formatMoney(__VLS_ctx.subTotal));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.formatMoney(__VLS_ctx.taxTotal));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.formatMoney(__VLS_ctx.packingTotal));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.formatMoney(__VLS_ctx.discountValue));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "grand" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.formatMoney(__VLS_ctx.grandTotal));
(__VLS_ctx.currencyLabel);
if (__VLS_ctx.serviceMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "service-message" },
    });
    (__VLS_ctx.serviceMessage);
}
if (__VLS_ctx.checkoutOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "checkout-overlay" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "checkout-modal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "checkout-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "checkout-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "checkout-sub" },
    });
    (__VLS_ctx.totalItemQuantity.toLocaleString());
    (__VLS_ctx.cart.length.toLocaleString());
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.checkoutOpen))
                    return;
                __VLS_ctx.checkoutOpen = false;
            } },
        ...{ class: "icon-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "checkout-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "checkout-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "checkout-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "choice-grid two" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.checkoutOpen))
                    return;
                __VLS_ctx.orderType = '2';
            } },
        ...{ class: ({ active: __VLS_ctx.orderType === '2' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.checkoutOpen))
                    return;
                __VLS_ctx.orderType = '3';
            } },
        ...{ class: ({ active: __VLS_ctx.orderType === '3' }) },
    });
    if (__VLS_ctx.orderType === '2') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
            ...{ class: "checkout-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "checkout-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "table-selection-box" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.selectedTableTitle);
        if (__VLS_ctx.requiresTableSelection) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "table-selection-actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ onChange: (__VLS_ctx.handleTableDropdownChange) },
            ...{ class: "desktop-input" },
            value: (__VLS_ctx.selectedTable?.TableId || 0),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (0),
        });
        for (const [table] of __VLS_getVForSourceType((__VLS_ctx.activeDiningTables))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (`checkout-table-${table.TableId}`),
                value: (table.TableId),
                disabled: (!__VLS_ctx.canSelectDiningTable(table)),
            });
            (__VLS_ctx.tableOptionTitle(table));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.openTablePicker) },
            type: "button",
            ...{ class: "desktop-btn muted" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "checkout-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "checkout-label" },
    });
    (__VLS_ctx.editingInvoice ? "تسویه اختلاف ویرایش" : "نحوه تسویه");
    if (__VLS_ctx.editingInvoice && __VLS_ctx.editPaymentDifference > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "payment-note" },
        });
        (__VLS_ctx.formatMoney(__VLS_ctx.editPaymentDifference));
        (__VLS_ctx.currencyLabel);
    }
    else if (__VLS_ctx.editingInvoice && __VLS_ctx.refundAmount > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "checkout-warning" },
        });
        (__VLS_ctx.formatMoney(__VLS_ctx.refundAmount));
        (__VLS_ctx.currencyLabel);
    }
    else if (__VLS_ctx.editingInvoice) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "payment-note" },
        });
    }
    if (__VLS_ctx.skipPaymentForTable) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "payment-note table-hold-note" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "payment-split" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "pay-input-grid" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "pay-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onInput: (...[$event]) => {
                    if (!(__VLS_ctx.checkoutOpen))
                        return;
                    if (!!(__VLS_ctx.skipPaymentForTable))
                        return;
                    __VLS_ctx.normalizePaymentAmounts('cash');
                } },
            ...{ onFocus: (...[$event]) => {
                    if (!(__VLS_ctx.checkoutOpen))
                        return;
                    if (!!(__VLS_ctx.skipPaymentForTable))
                        return;
                    __VLS_ctx.bindKeyboard($event.target, true);
                } },
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.checkoutOpen))
                        return;
                    if (!!(__VLS_ctx.skipPaymentForTable))
                        return;
                    __VLS_ctx.bindKeyboard($event.target, true);
                } },
            ...{ class: "desktop-input" },
            type: "number",
            min: "0",
            max: (__VLS_ctx.paymentTargetAmount),
        });
        (__VLS_ctx.cashAmount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.fillCashAmount) },
            type: "button",
            ...{ class: "mini-btn" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "pay-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onInput: (...[$event]) => {
                    if (!(__VLS_ctx.checkoutOpen))
                        return;
                    if (!!(__VLS_ctx.skipPaymentForTable))
                        return;
                    __VLS_ctx.normalizePaymentAmounts('credit');
                } },
            ...{ onFocus: (...[$event]) => {
                    if (!(__VLS_ctx.checkoutOpen))
                        return;
                    if (!!(__VLS_ctx.skipPaymentForTable))
                        return;
                    __VLS_ctx.bindKeyboard($event.target, true);
                } },
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.checkoutOpen))
                        return;
                    if (!!(__VLS_ctx.skipPaymentForTable))
                        return;
                    __VLS_ctx.bindKeyboard($event.target, true);
                } },
            ...{ class: "desktop-input" },
            type: "number",
            min: "0",
            max: (__VLS_ctx.maxCreditUsable),
            disabled: (!__VLS_ctx.selectedCustomer || !__VLS_ctx.creditChecked || __VLS_ctx.customerCredit <= 0),
        });
        (__VLS_ctx.creditAmount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.fillCreditAmount) },
            type: "button",
            ...{ class: "mini-btn" },
            disabled: (!__VLS_ctx.selectedCustomer || !__VLS_ctx.creditChecked),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "pay-field readonly-pay" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
        (__VLS_ctx.formatMoney(__VLS_ctx.posPayableAmount));
        (__VLS_ctx.currencyLabel);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "credit-tools" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
        (__VLS_ctx.selectedCustomer ? __VLS_ctx.customerName(__VLS_ctx.selectedCustomer) : "انتخاب نشده");
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "payment-tool-actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.checkSelectedCustomerCredit) },
            type: "button",
            ...{ class: "desktop-btn muted" },
            disabled: (!__VLS_ctx.selectedCustomer || __VLS_ctx.creditLoading),
        });
        (__VLS_ctx.creditLoading ? "در حال بررسی" : "بررسی اعتبار");
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.clearPaymentAmounts) },
            type: "button",
            ...{ class: "desktop-btn muted" },
        });
        if (__VLS_ctx.creditMessage) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "credit-status" },
            });
            (__VLS_ctx.creditMessage);
        }
        if (__VLS_ctx.posPayableAmount > 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "payment-note" },
            });
            (__VLS_ctx.formatMoney(__VLS_ctx.posPayableAmount));
            (__VLS_ctx.currencyLabel);
        }
    }
    if (__VLS_ctx.requiresTableSelection && !__VLS_ctx.selectedTable) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "checkout-warning" },
        });
    }
    if (!__VLS_ctx.skipPaymentForTable && __VLS_ctx.normalizedCreditAmount > 0 && !__VLS_ctx.selectedCustomer) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "checkout-warning" },
        });
    }
    else if (!__VLS_ctx.skipPaymentForTable && __VLS_ctx.normalizedCreditAmount > 0 && !__VLS_ctx.creditChecked) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "checkout-warning" },
        });
    }
    if (!__VLS_ctx.skipPaymentForTable && __VLS_ctx.paymentOverage > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "checkout-warning" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "checkout-summary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    (__VLS_ctx.orderTypeTitle);
    if (__VLS_ctx.orderType === '2') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
        (__VLS_ctx.selectedTableTitle);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    (__VLS_ctx.selectedCustomer ? __VLS_ctx.customerName(__VLS_ctx.selectedCustomer) : "انتخاب نشده");
    if (__VLS_ctx.editingInvoice) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
        (__VLS_ctx.formatMoney(__VLS_ctx.originalPayableAmount));
        (__VLS_ctx.currencyLabel);
    }
    if (__VLS_ctx.editingInvoice) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.editPaymentDifference >= 0 ? "مابه‌التفاوت" : "مبلغ عودت");
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
        (__VLS_ctx.formatMoney(Math.abs(__VLS_ctx.editPaymentDifference)));
        (__VLS_ctx.currencyLabel);
    }
    if (!__VLS_ctx.skipPaymentForTable) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
        (__VLS_ctx.formatMoney(__VLS_ctx.normalizedCashAmount));
        (__VLS_ctx.currencyLabel);
    }
    if (!__VLS_ctx.skipPaymentForTable) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
        (__VLS_ctx.formatMoney(__VLS_ctx.normalizedCreditAmount));
        (__VLS_ctx.currencyLabel);
    }
    if (!__VLS_ctx.skipPaymentForTable) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
        (__VLS_ctx.formatMoney(__VLS_ctx.posPayableAmount));
        (__VLS_ctx.currencyLabel);
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grand" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    (__VLS_ctx.formatMoney(__VLS_ctx.grandTotal));
    (__VLS_ctx.currencyLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "checkout-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.cancelDraftInvoice) },
        ...{ class: "desktop-btn muted" },
        disabled: (__VLS_ctx.cart.length === 0),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.checkoutOpen))
                    return;
                __VLS_ctx.checkoutOpen = false;
            } },
        ...{ class: "desktop-btn muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.submitInvoice) },
        ...{ class: "desktop-btn primary" },
        disabled: (!__VLS_ctx.canConfirmCheckout),
    });
    (__VLS_ctx.isSubmitting ? "در حال ثبت" : __VLS_ctx.editingInvoice ? "ثبت ویرایش فاکتور" : "ثبت نهایی فاکتور");
}
if (__VLS_ctx.tablePickerOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-picker-overlay" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-picker-modal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "checkout-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "checkout-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "checkout-sub" },
    });
    (__VLS_ctx.diningTables.length.toLocaleString());
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.tablePickerOpen))
                    return;
                __VLS_ctx.tablePickerOpen = false;
            } },
        ...{ class: "icon-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-picker-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-group-tabs" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.tablePickerOpen))
                    return;
                __VLS_ctx.selectedTableGroupId = null;
            } },
        ...{ class: ({ active: __VLS_ctx.selectedTableGroupId === null }) },
    });
    for (const [group] of __VLS_getVForSourceType((__VLS_ctx.activeTableGroups))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.tablePickerOpen))
                        return;
                    __VLS_ctx.selectedTableGroupId = group.TableGroupId;
                } },
            key: (group.TableGroupId),
            ...{ class: ({ active: __VLS_ctx.selectedTableGroupId === group.TableGroupId }) },
        });
        (group.GroupTitle);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-picker-grid" },
    });
    for (const [table] of __VLS_getVForSourceType((__VLS_ctx.tablesForSelectedGroup))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.tablePickerOpen))
                        return;
                    __VLS_ctx.selectDiningTable(table);
                } },
            key: (table.TableId),
            ...{ class: "table-pick-card" },
            ...{ class: ({ occupied: table.IsOccupied, selected: __VLS_ctx.selectedTable?.TableId === table.TableId }) },
            disabled: (!__VLS_ctx.canSelectDiningTable(table)),
        });
        if (table.IsOccupied) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "table-card-money" },
            });
            (__VLS_ctx.formatMoney(__VLS_ctx.money(table.Payable)));
            (__VLS_ctx.currencyLabel);
        }
        if (table.IsOccupied) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "table-card-time" },
            });
            (__VLS_ctx.formatOccupiedDuration(table.OccupiedMinutes));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
        (table.TableTitle);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (table.TableCode);
    }
}
if (__VLS_ctx.toppingModalOpen && __VLS_ctx.toppingProduct) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "topping-overlay" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "topping-modal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "topping-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "checkout-title" },
    });
    (__VLS_ctx.toppingProduct.GoodsName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "checkout-sub" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeToppingModal) },
        ...{ class: "icon-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "topping-body" },
    });
    for (const [group] of __VLS_getVForSourceType((__VLS_ctx.toppingGroups(__VLS_ctx.toppingProduct)))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
            key: (String(group.level?.LevelId || group.links[0]?.LevelId)),
            ...{ class: "topping-group" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "topping-group-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (group.level?.LevelTitle || __VLS_ctx.toppingLevelTitle(group.links[0]?.LevelId));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (group.level?.MinCount ?? group.links[0]?.MinCount);
        (group.level?.MaxCount ??
            group.links[0]?.MaxCount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "topping-options" },
        });
        for (const [link] of __VLS_getVForSourceType((group.links))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (__VLS_ctx.toppingKey(link)),
                ...{ class: "topping-option" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.toppingItemTitle(link));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            (__VLS_ctx.formatMoney(__VLS_ctx.money(link.Price)));
            (__VLS_ctx.currencyLabel);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "qty-control topping-qty" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.toppingModalOpen && __VLS_ctx.toppingProduct))
                            return;
                        __VLS_ctx.setToppingCount(link, -1);
                    } },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.selectedToppingCount(link));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.toppingModalOpen && __VLS_ctx.toppingProduct))
                            return;
                        __VLS_ctx.setToppingCount(link, 1);
                    } },
            });
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "checkout-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeToppingModal) },
        ...{ class: "desktop-btn muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.confirmToppings) },
        ...{ class: "desktop-btn primary" },
    });
}
if (__VLS_ctx.activeInputRef) {
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
/** @type {__VLS_StyleScopedClasses['sales-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['category-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head']} */ ;
/** @type {__VLS_StyleScopedClasses['compact']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['category-list']} */ ;
/** @type {__VLS_StyleScopedClasses['category-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['category-all-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['category-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['goods-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-input']} */ ;
/** @type {__VLS_StyleScopedClasses['state-box']} */ ;
/** @type {__VLS_StyleScopedClasses['goods-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['goods-card']} */ ;
/** @type {__VLS_StyleScopedClasses['goods-name']} */ ;
/** @type {__VLS_StyleScopedClasses['goods-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['goods-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['goods-topping-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['invoice-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['total-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['edit-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-box']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-input']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-status']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-results']} */ ;
/** @type {__VLS_StyleScopedClasses['table-inline-select']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-input']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-table']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-row']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-head']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-cart']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-row']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-product']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-toppings']} */ ;
/** @type {__VLS_StyleScopedClasses['qty-control']} */ ;
/** @type {__VLS_StyleScopedClasses['row-price']} */ ;
/** @type {__VLS_StyleScopedClasses['remove-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['invoice-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['discount-box']} */ ;
/** @type {__VLS_StyleScopedClasses['segmented']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-input']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-input']} */ ;
/** @type {__VLS_StyleScopedClasses['totals-box']} */ ;
/** @type {__VLS_StyleScopedClasses['grand']} */ ;
/** @type {__VLS_StyleScopedClasses['service-message']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-head']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-title']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-body']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-section']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-label']} */ ;
/** @type {__VLS_StyleScopedClasses['choice-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['two']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-section']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-label']} */ ;
/** @type {__VLS_StyleScopedClasses['table-selection-box']} */ ;
/** @type {__VLS_StyleScopedClasses['table-selection-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-input']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-section']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-label']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-note']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-note']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-note']} */ ;
/** @type {__VLS_StyleScopedClasses['table-hold-note']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-split']} */ ;
/** @type {__VLS_StyleScopedClasses['pay-input-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['pay-field']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-input']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['pay-field']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-input']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['pay-field']} */ ;
/** @type {__VLS_StyleScopedClasses['readonly-pay']} */ ;
/** @type {__VLS_StyleScopedClasses['credit-tools']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-tool-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['credit-status']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-note']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['grand']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['table-picker-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['table-picker-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-head']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-title']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['table-picker-body']} */ ;
/** @type {__VLS_StyleScopedClasses['table-group-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['table-picker-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['table-pick-card']} */ ;
/** @type {__VLS_StyleScopedClasses['occupied']} */ ;
/** @type {__VLS_StyleScopedClasses['selected']} */ ;
/** @type {__VLS_StyleScopedClasses['table-card-money']} */ ;
/** @type {__VLS_StyleScopedClasses['table-card-time']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-head']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-title']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-body']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-group']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-group-title']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-options']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-option']} */ ;
/** @type {__VLS_StyleScopedClasses['qty-control']} */ ;
/** @type {__VLS_StyleScopedClasses['topping-qty']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            VirtualKeyboard: VirtualKeyboard,
            categories: categories,
            selectedCategoryId: selectedCategoryId,
            goodsSearch: goodsSearch,
            customerSearch: customerSearch,
            customers: customers,
            selectedCustomer: selectedCustomer,
            cart: cart,
            loading: loading,
            customerLoading: customerLoading,
            isSubmitting: isSubmitting,
            checkoutOpen: checkoutOpen,
            serviceMessage: serviceMessage,
            orderType: orderType,
            diningTables: diningTables,
            selectedTableGroupId: selectedTableGroupId,
            selectedTable: selectedTable,
            tablePickerOpen: tablePickerOpen,
            cashAmount: cashAmount,
            creditAmount: creditAmount,
            customerCredit: customerCredit,
            creditChecked: creditChecked,
            creditLoading: creditLoading,
            creditMessage: creditMessage,
            discountMode: discountMode,
            discountPercent: discountPercent,
            discountAmount: discountAmount,
            toppingModalOpen: toppingModalOpen,
            toppingProduct: toppingProduct,
            editingInvoice: editingInvoice,
            activeInputRef: activeInputRef,
            isNumberMode: isNumberMode,
            currencyLabel: currencyLabel,
            canDiscountPercent: canDiscountPercent,
            canDiscountAmount: canDiscountAmount,
            maxDiscountPercent: maxDiscountPercent,
            maxDiscountAmount: maxDiscountAmount,
            canSubmit: canSubmit,
            orderTypeTitle: orderTypeTitle,
            filteredGoods: filteredGoods,
            subTotal: subTotal,
            taxTotal: taxTotal,
            packingTotal: packingTotal,
            discountValue: discountValue,
            grandTotal: grandTotal,
            totalItemQuantity: totalItemQuantity,
            originalPayableAmount: originalPayableAmount,
            editPaymentDifference: editPaymentDifference,
            paymentTargetAmount: paymentTargetAmount,
            refundAmount: refundAmount,
            normalizedCashAmount: normalizedCashAmount,
            normalizedCreditAmount: normalizedCreditAmount,
            maxCreditUsable: maxCreditUsable,
            paymentOverage: paymentOverage,
            posPayableAmount: posPayableAmount,
            requiresTableSelection: requiresTableSelection,
            skipPaymentForTable: skipPaymentForTable,
            selectedTableTitle: selectedTableTitle,
            activeTableGroups: activeTableGroups,
            activeDiningTables: activeDiningTables,
            tablesForSelectedGroup: tablesForSelectedGroup,
            canConfirmCheckout: canConfirmCheckout,
            loadCatalog: loadCatalog,
            canSelectDiningTable: canSelectDiningTable,
            selectDiningTable: selectDiningTable,
            handleTableDropdownChange: handleTableDropdownChange,
            tableOptionTitle: tableOptionTitle,
            openTablePicker: openTablePicker,
            formatOccupiedDuration: formatOccupiedDuration,
            bindKeyboard: bindKeyboard,
            hideKeyboard: hideKeyboard,
            handleKeyPress: handleKeyPress,
            money: money,
            formatMoney: formatMoney,
            rowUnitPrice: rowUnitPrice,
            toppingKey: toppingKey,
            hasToppings: hasToppings,
            toppingItemTitle: toppingItemTitle,
            toppingLevelTitle: toppingLevelTitle,
            toppingGroups: toppingGroups,
            selectedToppingCount: selectedToppingCount,
            setToppingCount: setToppingCount,
            categoryTitle: categoryTitle,
            categoryImage: categoryImage,
            productImage: productImage,
            handleImageError: handleImageError,
            handleCategoryImageError: handleCategoryImageError,
            addToCart: addToCart,
            confirmToppings: confirmToppings,
            closeToppingModal: closeToppingModal,
            increase: increase,
            decrease: decrease,
            removeRow: removeRow,
            cancelDraftInvoice: cancelDraftInvoice,
            setDiscountMode: setDiscountMode,
            customerName: customerName,
            customerPhone: customerPhone,
            queueFindCustomers: queueFindCustomers,
            selectCustomer: selectCustomer,
            normalizePaymentAmounts: normalizePaymentAmounts,
            fillCashAmount: fillCashAmount,
            fillCreditAmount: fillCreditAmount,
            clearPaymentAmounts: clearPaymentAmounts,
            checkSelectedCustomerCredit: checkSelectedCustomerCredit,
            openCheckout: openCheckout,
            submitInvoice: submitInvoice,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
