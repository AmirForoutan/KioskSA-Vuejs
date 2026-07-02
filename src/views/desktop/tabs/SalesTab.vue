<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import VirtualKeyboard from "../../../components/VirtualKeyboard.vue";
import { can } from "../../../components/acl/can";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import {
  clearInvoiceEditRequest,
  INVOICE_EDIT_REQUEST_EVENT,
  peekInvoiceEditRequest,
  type DesktopInvoiceEditDraft,
} from "../../../components/stores/invoice-edit.store";
import {
  clearTableOrderRequest,
  peekTableOrderRequest,
  TABLE_ORDER_REQUEST_EVENT,
} from "../../../components/stores/table-order.store";
import { useAuthState } from "../../../components/stores/auth.store";
import { getCurrency, ShwoKeyboardStatus } from "../../../utilities";
import {
  fetchDesktopCustomerCredit,
  fetchRuntimeConfig,
  loadDesktopTables,
  loadDesktopCatalog,
  loadDesktopToppingData,
  payDesktopPos,
  searchDesktopCustomers,
  sendDesktopInvoice,
  updateDesktopInvoice,
  useDesktopCustomerCredit,
  type ApiEnvelope,
  type DesktopCategory,
  type DesktopCustomer,
  type DesktopDiningTable,
  type DesktopInvoice,
  type DesktopInvoiceCustomerData,
  type DesktopInvoiceItem,
  type DesktopInvoiceTopping,
  type DesktopProduct,
  type DesktopProductTopping,
  type DesktopSettings,
  type DesktopTableGroup,
  type DesktopToppingLevel,
  type DesktopToppingProduct,
} from "../../../services/desktopApi";

type CartRow = {
  id: string;
  item: DesktopProduct;
  quantity: number;
  note: string;
  toppings: DesktopInvoiceTopping[];
};

type DiscountMode = "none" | "percent" | "amount";


const categories = ref<DesktopCategory[]>([]);
const goods = ref<DesktopProduct[]>([]);
const toppingItems = ref<DesktopToppingProduct[]>([]);
const toppingLevels = ref<DesktopToppingLevel[]>([]);
const productToppings = ref<DesktopProductTopping[]>([]);
const selectedCategoryId = ref<number | string | null>(null);
const goodsSearch = ref("");
const customerSearch = ref("");
const customers = ref<DesktopCustomer[]>([]);
const selectedCustomer = ref<DesktopCustomer | null>(null);
const cart = ref<CartRow[]>([]);
const loading = ref(false);
const customerLoading = ref(false);
const isSubmitting = ref(false);
const checkoutOpen = ref(false);
const serviceMessage = ref("");
const currencyIsRial = ref(false);
const connectionId = ref(0);
const orderType = ref<"2" | "3">("2");
const desktopSettings = ref<DesktopSettings | null>(null);
const tableGroups = ref<DesktopTableGroup[]>([]);
const diningTables = ref<DesktopDiningTable[]>([]);
const selectedTableGroupId = ref<number | null>(null);
const selectedTable = ref<DesktopDiningTable | null>(null);
const tablePickerOpen = ref(false);
const cashAmount = ref(0);
const creditAmount = ref(0);
const customerCredit = ref(0);
const creditChecked = ref(false);
const creditLoading = ref(false);
const creditMessage = ref("");
const discountMode = ref<DiscountMode>("none");
const discountPercent = ref(0);
const discountAmount = ref(0);
const toppingModalOpen = ref(false);
const toppingProduct = ref<DesktopProduct | null>(null);
const selectedToppingCounts = ref<Record<string, number>>({});
const auth = useAuthState();
const editingInvoice = ref<DesktopInvoice | null>(null);
const loadedEditRequestAt = ref<number | null>(null);
const loadedTableRequestAt = ref<number | null>(null);
let customerSearchTimer: number | undefined;
let customerSearchRequestId = 0;

useDesktopToastMessage(serviceMessage);
useDesktopToastMessage(creditMessage);

const keyboardEnabled = computed(() => {
  try {
    return ShwoKeyboardStatus();
  } catch {
    return false;
  }
});
const activeInputRef = ref<HTMLInputElement | null>(null);
const isNumberMode = ref(false);

const currencyLabel = computed(() => (currencyIsRial.value ? "ریال" : "تومان"));
const canDiscountPercent = computed(() => can("sales.discount.percent"));
const canDiscountAmount = computed(() => can("sales.discount.amount"));
const maxDiscountPercent = computed(() =>
  canDiscountPercent.value ? Math.min(100, readUserLimit("discountPercentLimit", "DiscountPercentLimit", 100)) : 0
);
const maxDiscountAmount = computed(() =>
  canDiscountAmount.value ? Math.min(subTotal.value, readUserLimit("discountAmountLimit", "DiscountAmountLimit", subTotal.value)) : 0
);
const canSubmit = computed(() => cart.value.length > 0 && !isSubmitting.value);
const orderTypeTitle = computed(() => (orderType.value === "3" ? "بیرون بر" : "سالن"));

const filteredGoods = computed(() => {
  const q = goodsSearch.value.trim().toLowerCase();
  return goods.value.filter((item) => {
    const isActive = item.IsActive !== false;
    const inCategory =
      selectedCategoryId.value === null || String(item.GoodsGroupId) === String(selectedCategoryId.value);
    const title = `${item.GoodsName ?? ""} ${item.GoodsCode ?? ""}`.toLowerCase();
    const matchesSearch = !q || title.includes(q);
    return isActive && inCategory && matchesSearch;
  });
});

const subTotal = computed(() =>
  cart.value.reduce((sum, row) => sum + rowUnitPrice(row) * row.quantity, 0)
);

const taxTotal = computed(() =>
  cart.value.reduce((sum, row) => {
    const percent = money(row.item.TaxPercent) + money(row.item.DutyPercent);
    return sum + (rowUnitPrice(row) * row.quantity * percent) / 100;
  }, 0)
);

const packingTotal = computed(() => {
  if (orderType.value !== "3") return 0;
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

const grandTotal = computed(() =>
  Math.max(subTotal.value + taxTotal.value + packingTotal.value - discountValue.value, 0)
);
const totalItemQuantity = computed(() => cart.value.reduce((sum, row) => sum + row.quantity, 0));
const payableAmount = computed(() => Math.round(grandTotal.value));
const originalPayableAmount = computed(() => Math.round(money(editingInvoice.value?.Payable)));
const editPaymentDifference = computed(() =>
  editingInvoice.value ? payableAmount.value - originalPayableAmount.value : payableAmount.value
);
const paymentTargetAmount = computed(() =>
  editingInvoice.value ? Math.max(0, editPaymentDifference.value) : payableAmount.value
);
const refundAmount = computed(() =>
  editingInvoice.value ? Math.max(0, originalPayableAmount.value - payableAmount.value) : 0
);
const normalizedCashAmount = computed(() => Math.max(0, Math.round(money(cashAmount.value))));
const normalizedCreditAmount = computed(() => Math.max(0, Math.round(money(creditAmount.value))));
const maxCreditUsable = computed(() => Math.min(customerCredit.value, paymentTargetAmount.value));
const paidWithoutPos = computed(() => normalizedCashAmount.value + normalizedCreditAmount.value);
const paymentOverage = computed(() => Math.max(0, paidWithoutPos.value - paymentTargetAmount.value));
const posPayableAmount = computed(() => Math.max(0, paymentTargetAmount.value - paidWithoutPos.value));
const editingOpenTableInvoice = computed(() => editingInvoice.value?.IsSettled === false);
const keepTableOpenForSubmit = computed(() =>
  orderType.value === "2" &&
  (editingOpenTableInvoice.value || desktopSettings.value?.KeepSalonTableOpenAfterSubmit === true)
);
const requiresTableSelection = computed(() =>
  orderType.value === "2" &&
  (keepTableOpenForSubmit.value || desktopSettings.value?.TableSelectionRequired === true)
);
const skipPaymentForTable = computed(() => keepTableOpenForSubmit.value);
const selectedTableTitle = computed(() =>
  selectedTable.value ? `${selectedTable.value.TableTitle} (${selectedTable.value.TableCode})` : "انتخاب نشده"
);
const activeTableGroups = computed(() => tableGroups.value.filter((group) => group.IsActive !== false));
const activeDiningTables = computed(() => diningTables.value.filter((table) => table.IsActive !== false));
const tablesForSelectedGroup = computed(() =>
  diningTables.value.filter((table) => {
    const matchesGroup = selectedTableGroupId.value === null || table.TableGroupId === selectedTableGroupId.value;
    return matchesGroup && table.IsActive !== false;
  })
);
const canConfirmCheckout = computed(() => {
  if (requiresTableSelection.value && !selectedTable.value) return false;
  if (skipPaymentForTable.value) return canSubmit.value;
  const usesCredit = normalizedCreditAmount.value > 0;
  return (
    canSubmit.value &&
    paymentOverage.value === 0 &&
    (!usesCredit ||
      (selectedCustomer.value !== null &&
        creditChecked.value &&
        normalizedCreditAmount.value <= maxCreditUsable.value))
  );
});

watch(grandTotal, () => normalizePaymentAmounts());
watch([discountMode, discountPercent, discountAmount, maxDiscountPercent, maxDiscountAmount], () =>
  normalizeDiscountInputs()
);
watch(orderType, (value) => {
  if (value === "3") selectedTable.value = null;
});

onMounted(async () => {
  window.addEventListener(INVOICE_EDIT_REQUEST_EVENT, handleInvoiceEditRequest);
  window.addEventListener(TABLE_ORDER_REQUEST_EVENT, handleTableOrderRequest);
  try {
    currencyIsRial.value = getCurrency();
  } catch {
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
  } catch (error) {
    serviceMessage.value = error instanceof Error ? `${error.message} - داده نمونه نمایش داده شد` : "داده نمونه نمایش داده شد";
  } finally {
    loading.value = false;
  }
}

async function loadToppings() {
  try {
    const result = await loadDesktopToppingData(connectionId.value);
    toppingItems.value = result.items;
    toppingLevels.value = result.levels;
    productToppings.value = result.links;
  } catch (error) {
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
  } catch {
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
      if (fresh) selectedTable.value = fresh;
    }
    if (selectedTable.value?.TableGroupId) {
      selectedTableGroupId.value = selectedTable.value.TableGroupId;
    } else if (
      selectedTableGroupId.value === null ||
      !result.groups.some((group) => group.TableGroupId === selectedTableGroupId.value)
    ) {
      selectedTableGroupId.value = result.groups[0]?.TableGroupId ?? null;
    }
  } catch (error) {
    tableGroups.value = [];
    diningTables.value = [];
    const message = error instanceof Error ? error.message : "خطا در دریافت میزها";
    serviceMessage.value = serviceMessage.value ? `${serviceMessage.value} | ${message}` : message;
  }
}

function tableById(tableId: unknown) {
  const id = Number(tableId);
  if (!Number.isFinite(id) || id <= 0) return null;
  return diningTables.value.find((table) => Number(table.TableId) === id) || null;
}

function setSelectedTableFromInvoice(invoice: DesktopInvoice) {
  const tableId = Number(invoice.TableId ?? (invoice as Record<string, unknown>).tableId);
  if (!Number.isFinite(tableId) || tableId <= 0) {
    selectedTable.value = null;
    return;
  }

  selectedTable.value =
    tableById(tableId) ||
    ({
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
    } satisfies DesktopDiningTable);
  if (selectedTable.value?.TableGroupId) selectedTableGroupId.value = selectedTable.value.TableGroupId;
}

function canSelectDiningTable(table: DesktopDiningTable) {
  const isCurrent = selectedTable.value?.TableId === table.TableId;
  const isEditingSameInvoice =
    !!editingInvoice.value?.SaleInvoiceId && editingInvoice.value.SaleInvoiceId === table.SaleInvoiceId;
  return !table.IsOccupied || isCurrent || isEditingSameInvoice;
}

function selectDiningTable(table: DesktopDiningTable) {
  if (!canSelectDiningTable(table)) return;
  selectedTable.value = table;
  selectedTableGroupId.value = table.TableGroupId || selectedTableGroupId.value;
  tablePickerOpen.value = false;
}

function selectDiningTableById(tableId: unknown) {
  const table = tableById(tableId);
  if (!table) {
    selectedTable.value = null;
    return;
  }
  selectDiningTable(table);
}

function handleTableDropdownChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  selectDiningTableById(target.value);
}

function tableOptionTitle(table: DesktopDiningTable) {
  const groupTitle = table.GroupTitle ? ` - ${table.GroupTitle}` : "";
  const occupied = table.IsOccupied && selectedTable.value?.TableId !== table.TableId ? " (اشغال)" : "";
  return `${table.TableTitle} (${table.TableCode})${groupTitle}${occupied}`;
}

function openTablePicker() {
  void loadTables();
  tablePickerOpen.value = true;
}

function formatOccupiedDuration(minutes: unknown) {
  const total = Math.max(0, Math.floor(money(minutes)));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function handleInvoiceEditRequest() {
  const draft = peekInvoiceEditRequest();
  if (!draft) return;
  if (loadedEditRequestAt.value === draft.requestedAt) return;
  if (loadInvoiceForEdit(draft)) {
    loadedEditRequestAt.value = draft.requestedAt;
    clearInvoiceEditRequest(draft.requestedAt);
  }
}

function handleTableOrderRequest() {
  const draft = peekTableOrderRequest();
  if (!draft) return;
  if (loadedTableRequestAt.value === draft.requestedAt) return;

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

function loadInvoiceForEdit(draft: DesktopInvoiceEditDraft) {
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

function invoiceOrderType(invoice: DesktopInvoice): "2" | "3" {
  const record = invoice as Record<string, unknown>;
  const typeId = record.saleinvoiceTypeId ?? record.SaleInvoiceTypeId ?? record.InvoiceTypeId;
  if (String(typeId) === "3") return "3";
  const title = String(invoice.InvoiceTypeName || "");
  return title.includes("بیرون") || title.toLowerCase().includes("take") ? "3" : "2";
}

function customerFromInvoice(invoice: DesktopInvoice): DesktopCustomer | null {
  if (!invoice.CustomerName && !invoice.Phone && !invoice.CustomerCode) return null;
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

function cartRowFromInvoiceItem(invoice: DesktopInvoice, item: DesktopInvoiceItem, index: number): CartRow {
  const product = productFromInvoiceItem(item);
  const rowId = `edit-${invoice.SaleInvoiceId}-${item.SaleInvoiceItemId || item.InvoiceItemId || index}`;
  return {
    id: rowId,
    item: product,
    quantity: Math.max(1, money(item.Quantity ?? item.Count ?? item.GoodsCount) || 1),
    note: String((item as Record<string, unknown>).Note || (item as Record<string, unknown>).Description || ""),
    toppings: toppingsFromInvoiceItem(item),
  };
}

function productFromInvoiceItem(item: DesktopInvoiceItem): DesktopProduct {
  const record = item as Record<string, unknown>;
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

function toppingsFromInvoiceItem(item: DesktopInvoiceItem): DesktopInvoiceTopping[] {
  const record = item as Record<string, unknown>;
  const raw = record.Toppings ?? record.toppings ?? record.InvoiceToppings ?? record.invoiceToppings;
  if (!Array.isArray(raw)) return [];

  return raw.map((value, index) => {
    const topping = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
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

function primitiveKey(value: unknown, fallback: string | number): string | number {
  if (typeof value === "string" || typeof value === "number") return value;
  if (value !== undefined && value !== null) return String(value);
  return fallback;
}

function optionalPrimitiveKey(value: unknown): string | number | undefined {
  if (typeof value === "string" || typeof value === "number") return value;
  if (value !== undefined && value !== null) return String(value);
  return undefined;
}

function invoicePaymentPart(invoice: DesktopInvoice, key: "pos" | "cash" | "credit") {
  const pos = money(invoice.PosPrice);
  const cash = money(invoice.CashPrice);
  const credit = money(invoice.CreditPrice);
  if (pos + cash + credit === 0 && money(invoice.Payable) > 0) {
    return key === "pos" ? money(invoice.Payable) : 0;
  }
  if (key === "cash") return cash;
  if (key === "credit") return credit;
  return pos;
}

function applyInvoiceDiscount(invoice: DesktopInvoice) {
  const discount = money(invoice.Discount ?? (invoice as Record<string, unknown>).InvoiceDiscount);
  if (discount <= 0) {
    setDiscountMode("none");
    return;
  }

  if (canDiscountAmount.value) {
    setDiscountMode("amount");
    discountAmount.value = discount;
  } else if (canDiscountPercent.value && subTotal.value > 0) {
    setDiscountMode("percent");
    discountPercent.value = Math.round((discount / subTotal.value) * 100);
  }
}

function bindKeyboard(el: EventTarget | null, numberMode = false) {
  if (!keyboardEnabled.value) return;
  activeInputRef.value = el as HTMLInputElement;
  isNumberMode.value = numberMode;
}

function hideKeyboard() {
  activeInputRef.value = null;
}

function handleKeyPress(_key: string) {
  return;
}

function money(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function readUserLimit(lowerKey: string, upperKey: string, fallback: number) {
  const user = auth.user as Record<string, unknown> | null;
  const raw = user?.[lowerKey] ?? user?.[upperKey];
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function formatMoney(value: number) {
  return Math.round(value).toLocaleString();
}

function idsEqual(left: unknown, right: unknown) {
  return String(left) === String(right);
}

function rowToppingsTotal(row: Pick<CartRow, "toppings">) {
  return row.toppings.reduce((sum, topping) => sum + money(topping.Price) * Math.max(money(topping.Count), 1), 0);
}

function rowUnitPrice(row: Pick<CartRow, "item" | "toppings">) {
  return money(row.item.GoodsPrice) + rowToppingsTotal(row);
}

function toppingKey(link: DesktopProductTopping) {
  return String(link.ToppingId || `${link.GoodsId}-${link.GoodsToppingId}-${link.LevelId}`);
}

function linksForProduct(product: DesktopProduct | null) {
  if (!product) return [];
  return productToppings.value.filter((link) => idsEqual(link.GoodsId, product.GoodsId));
}

function hasToppings(product: DesktopProduct) {
  return linksForProduct(product).length > 0;
}

function findToppingItem(goodsToppingId: number | string) {
  return toppingItems.value.find((item) => idsEqual(item.GoodsId, goodsToppingId));
}

function findToppingLevel(levelId: number | string) {
  return toppingLevels.value.find((level) => idsEqual(level.LevelId, levelId));
}

function toppingItemTitle(link: DesktopProductTopping) {
  return findToppingItem(link.GoodsToppingId)?.GoodsName || `تاپینگ ${link.GoodsToppingId}`;
}

function toppingLevelTitle(levelId: number | string) {
  return findToppingLevel(levelId)?.LevelTitle || `مرحله ${levelId}`;
}

function toppingGroups(product: DesktopProduct | null) {
  const links = linksForProduct(product);
  const levelIds = Array.from(new Set(links.map((link) => String(link.LevelId))));
  return levelIds
    .map((levelId) => ({
      level: findToppingLevel(levelId),
      links: links.filter((link) => idsEqual(link.LevelId, levelId)),
    }))
    .sort((a, b) => money(a.level?.Priority) - money(b.level?.Priority));
}

function selectedToppingCount(link: DesktopProductTopping) {
  return selectedToppingCounts.value[toppingKey(link)] || 0;
}

function selectedLevelCount(levelId: number | string) {
  return linksForProduct(toppingProduct.value)
    .filter((link) => idsEqual(link.LevelId, levelId))
    .reduce((sum, link) => sum + selectedToppingCount(link), 0);
}

function setToppingCount(link: DesktopProductTopping, delta: number) {
  const key = toppingKey(link);
  const current = selectedToppingCount(link);
  const next = Math.max(0, current + delta);
  const itemMax = Math.max(money(link.MaxCount), 1);
  const level = findToppingLevel(link.LevelId);
  const levelMax = Math.max(money(level?.MaxCount || link.MaxCount), 1);
  const currentLevelCount = selectedLevelCount(link.LevelId);

  if (delta > 0 && (current >= itemMax || currentLevelCount >= levelMax)) return;

  selectedToppingCounts.value = {
    ...selectedToppingCounts.value,
    [key]: Math.min(next, itemMax),
  };
}

function buildSelectedToppings(): DesktopInvoiceTopping[] {
  const selected: DesktopInvoiceTopping[] = [];

  for (const link of linksForProduct(toppingProduct.value)) {
    const count = selectedToppingCount(link);
    const item = findToppingItem(link.GoodsToppingId);
    const level = findToppingLevel(link.LevelId);

    if (count <= 0) continue;

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

function categoryTitle(category: DesktopCategory) {
  return category.GroupName || category.GroupTitle || `دسته ${category.GroupId}`;
}

function categoryImage(category: DesktopCategory) {
  const code = category.GroupCode || category.GroupId;
  const version = new Date().toISOString().slice(0, 13).replace(/[^0-9]/g, "");
  return `/img/groups/${code}.png?v=${version}`;
}

function productImage(product: DesktopProduct) {
  const code = product.GoodsCode || product.GoodsId;
  const version = new Date().toISOString().slice(0, 13).replace(/[^0-9]/g, "");
  return `/img/goods/${code}.png?v=${version}`;
}

function handleImageError(event: Event) {
  const image = event.target as HTMLImageElement;
  image.src = "/img/goods/default.png";
}

function handleCategoryImageError(event: Event) {
  const image = event.target as HTMLImageElement;
  image.style.display = "none";
}

function addToCart(product: DesktopProduct) {
  if (hasToppings(product)) {
    toppingProduct.value = product;
    selectedToppingCounts.value = {};
    toppingModalOpen.value = true;
    return;
  }

  addProductToCart(product, []);
}

function toppingsSignature(toppings: DesktopInvoiceTopping[]) {
  return toppings
    .map((item) => `${item.ToppingId}:${item.GoodsId}:${item.Count}`)
    .sort()
    .join("|");
}

function addProductToCart(product: DesktopProduct, toppings: DesktopInvoiceTopping[]) {
  const signature = toppingsSignature(toppings);
  const existing = cart.value.find(
    (row) => idsEqual(row.item.GoodsId, product.GoodsId) && toppingsSignature(row.toppings) === signature
  );

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
  if (!toppingProduct.value) return;

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

function increase(row: CartRow) {
  row.quantity += 1;
}

function decrease(row: CartRow) {
  if (row.quantity > 1) row.quantity -= 1;
  else removeRow(row.id);
}

function removeRow(id: string) {
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
  if (!cart.value.length) return;
  const wasEditing = !!editingInvoice.value;
  resetCart();
  serviceMessage.value = wasEditing ? "ویرایش فاکتور لغو شد" : "فاکتور حذف شد و ثبت نمی‌شود";
}

function setDiscountMode(mode: DiscountMode) {
  discountMode.value = mode;
  if (mode !== "percent") discountPercent.value = 0;
  if (mode !== "amount") discountAmount.value = 0;
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

function customerName(customer: DesktopCustomer) {
  const fullName = customer.FullName || customer.Name;
  if (fullName) return String(fullName);
  const first = customer.Firstname ? String(customer.Firstname) : "";
  const last = customer.Lastname ? String(customer.Lastname) : "";
  return `${first} ${last}`.trim() || "مشتری";
}

function customerPhone(customer: DesktopCustomer) {
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

async function findCustomers(term: string, requestId: number) {
  customerLoading.value = true;
  try {
    const result = await searchDesktopCustomers(term);
    if (requestId !== customerSearchRequestId || term !== customerSearch.value.trim()) return;
    customers.value = result;
  } catch (error) {
    if (requestId !== customerSearchRequestId) return;
    serviceMessage.value = error instanceof Error ? error.message : "خطا در جستجوی مشتری";
    customers.value = [];
  } finally {
    if (requestId === customerSearchRequestId) customerLoading.value = false;
  }
}

function selectCustomer(customer: DesktopCustomer) {
  window.clearTimeout(customerSearchTimer);
  customerSearchRequestId += 1;
  resetCreditState();
  selectedCustomer.value = customer;
  customerSearch.value = `${customerName(customer)} ${customerPhone(customer)}`.trim();
  customers.value = [];
}

function responseIsOk(response: ApiEnvelope) {
  return response.status === true || response.status === "ok" || response.status === undefined;
}

function resetCreditState() {
  customerCredit.value = 0;
  creditChecked.value = false;
  creditLoading.value = false;
  creditMessage.value = "";
  creditAmount.value = 0;
}

function extractRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function extractNumber(payload: unknown, keys: string[]): number {
  const record = extractRecord(payload);
  if (!record) return 0;

  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) return Math.max(0, Math.round(money(value)));
  }

  const data = extractRecord(record.data);
  return data ? extractNumber(data, keys) : 0;
}

function extractInvoiceId(response: ApiEnvelope): number {
  const record = extractRecord(response);
  if (!record) return 0;

  const keys = ["SID", "SaleInvoiceId", "saleInvoiceId", "InvoiceId", "invoiceId", "id"];
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim()) return Number(value) || 0;
  }

  const data = extractRecord(record.data);
  if (data) {
    for (const key of keys) {
      const value = data[key];
      if (value !== undefined && value !== null && String(value).trim()) return Number(value) || 0;
    }
  }

  return 0;
}

function toPosDeviceAmount(amount: number) {
  return Math.round(currencyIsRial.value ? amount : amount * 10);
}

function normalizePaymentAmounts(changed?: "cash" | "credit") {
  const payable = paymentTargetAmount.value;
  let cash = Math.max(0, Math.round(money(cashAmount.value)));
  let credit = Math.max(0, Math.round(money(creditAmount.value)));

  if (!selectedCustomer.value || !creditChecked.value) credit = 0;

  cash = Math.min(cash, payable);
  credit = Math.min(credit, maxCreditUsable.value, payable);

  if (cash + credit > payable) {
    if (changed === "cash") {
      cash = Math.max(0, payable - credit);
    } else {
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
  } catch (error) {
    resetCreditState();
    creditMessage.value = error instanceof Error ? error.message : "خطا در بررسی اعتبار مشتری";
  } finally {
    creditLoading.value = false;
  }
}

function prepareCustomerData(customer: DesktopCustomer | null): DesktopInvoiceCustomerData | { userName: string } {
  if (!customer) return { CustomerId: 1, userName: "مشتری", UserPhone: '', usedCredit: 0, usedDiscount: null, totalDiscount: 0 };

  return {
    ...customer,
    CustomerId: customer.CustomerId || customer.UserId || 1,
    userName: customerName(customer),
    UserPhone: customerPhone(customer),
    usedCredit: normalizedCreditAmount.value,
    usedDiscount:
      customer.usedDiscount && typeof customer.usedDiscount === "object"
        ? (customer.usedDiscount as { DiscountId?: number | string })
        : null,
    totalDiscount: money(customer.totalDiscount),
  };
}

function buildToppingsPayload() {
  return cart.value.reduce<Record<string, DesktopInvoiceTopping[]>>((payload, row) => {
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
  if (!canSubmit.value) return;
  serviceMessage.value = "";
  normalizePaymentAmounts();
  checkoutOpen.value = true;
}

async function submitInvoice() {
  if (!canSubmit.value) return;
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
    const doneMessage =
      editingInvoice.value && refund > 0
        ? `${baseDoneMessage}؛ مبلغ ${formatMoney(refund)} ${currencyLabel.value} باید به مشتری برگردد`
        : baseDoneMessage;
    checkoutOpen.value = false;
    resetCart();
    serviceMessage.value = doneMessage;
  } catch (error) {
    serviceMessage.value = error instanceof Error ? error.message : editingInvoice.value ? "خطا در ویرایش فاکتور" : "خطا در ثبت فاکتور";
  } finally {
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
</script>

<template>
  <div class="sales-shell">
    <aside class="category-panel">
      <div class="panel-head compact">
        <div>
          <div class="panel-title">دسته‌بندی</div>
          <div class="panel-sub">{{ categories.length }} گروه</div>
        </div>
        <button class="icon-btn" :disabled="loading" title="بازخوانی" @click="loadCatalog">↻</button>
      </div>

      <div class="category-list">
        <button class="category-btn" :class="{ active: selectedCategoryId === null }"
          @click="selectedCategoryId = null">
          <span class="category-all-icon">همه</span>
          <span>همه کالاها</span>
        </button>
        <button v-for="category in categories" :key="category.GroupId" class="category-btn"
          :class="{ active: String(category.GroupId) === String(selectedCategoryId) }"
          @click="selectedCategoryId = category.GroupId">
          <img :src="categoryImage(category)" @error="handleCategoryImageError" />
          <span>{{ categoryTitle(category) }}</span>
        </button>
      </div>
    </aside>

    <section class="goods-panel">
      <div class="panel-head">
        <div>
          <div class="panel-title">کالاها</div>
          <div class="panel-sub">{{ filteredGoods.length }} آیتم قابل انتخاب</div>
        </div>
        <input class="desktop-input" placeholder="جستجوی نام یا کد کالا..." v-model="goodsSearch"
          @focus="bindKeyboard($event.target)" @click="bindKeyboard($event.target)" />
      </div>

      <div v-if="loading" class="state-box">در حال دریافت اطلاعات...</div>
      <div v-else class="goods-grid">
        <button v-for="product in filteredGoods" :key="product.GoodsId" class="goods-card" @click="addToCart(product)">
          <img :src="productImage(product)" @error="handleImageError" />
          <div class="goods-name">{{ product.GoodsName }}</div>
          <div class="goods-desc">{{ product.GoodsDescription || "بدون توضیح" }}</div>
          <div class="goods-meta">
            <span>{{ formatMoney(money(product.GoodsPrice)) }} {{ currencyLabel }}</span>
            <span v-if="money(product.StockInventory) > 0">موجودی {{ product.StockInventory }}</span>
          </div>
          <div v-if="hasToppings(product)" class="goods-topping-badge">دارای تاپینگ</div>
        </button>
      </div>
    </section>

    <section class="invoice-panel">
      <div class="panel-head">

        <button class="desktop-btn muted" :disabled="cart.length === 0" @click="cancelDraftInvoice">لغو
          فاکتور</button>
        <button class="desktop-btn primary" :disabled="!canSubmit" @click="openCheckout">
          {{ isSubmitting ? "در حال ثبت" : editingInvoice ? "ادامه ویرایش" : "ادامه ثبت" }}
        </button>

        <div>
          <div class="panel-title">{{ editingInvoice ? "ویرایش فاکتور" : "سبد خرید و فاکتور" }}</div>
          <div class="panel-sub">{{ cart.length }} ردیف، {{ totalItemQuantity }} عدد</div>
        </div>

        <div class="total-badge">{{ formatMoney(grandTotal) }} {{ currencyLabel }}</div>
      </div>

      <div v-if="editingInvoice" class="edit-banner">
        <div>
          <span>فاکتور شماره {{ editingInvoice.SaleInvoiceNumberDay }}</span>
          <small>بعد از اصلاح کالاها، ثبت ویرایش را بزنید.</small>
        </div>
        <button class="mini-btn" @click="cancelDraftInvoice">انصراف از ویرایش</button>
      </div>

      <div class="customer-box">
        <input class="desktop-input" placeholder="جستجوی مشتری با نام یا موبایل..." v-model="customerSearch"
          @input="queueFindCustomers" @focus="bindKeyboard($event.target)" @click="bindKeyboard($event.target)" />
        <div v-if="customerLoading" class="customer-status">در حال جستجو...</div>
        <div v-else-if="customers.length" class="customer-results">
          <button v-for="customer in customers"
            :key="`${customer.UserId || customer.CustomerId || customerPhone(customer)}`"
            @click="selectCustomer(customer)">
            <span>{{ customerName(customer) }}</span>
            <small>{{ customerPhone(customer) }}</small>
          </button>
        </div>
      </div>

      <div v-if="orderType === '2'" class="table-inline-select">
        <div>
          <span>میز سالن</span>
          <small>{{ selectedTableTitle }}</small>
        </div>
        <select class="desktop-input" :value="selectedTable?.TableId || 0" @change="handleTableDropdownChange">
          <option :value="0">انتخاب میز</option>
          <option v-for="table in activeDiningTables" :key="`order-table-${table.TableId}`" :value="table.TableId"
            :disabled="!canSelectDiningTable(table)">
            {{ tableOptionTitle(table) }}
          </option>
        </select>
        <button type="button" class="desktop-btn muted" @click="openTablePicker">چیدمان</button>
      </div>

      <div class="cart-table">
        <div class="cart-section-title">
          <span>لیست کالاهای انتخاب‌شده</span>
          <b>{{ totalItemQuantity.toLocaleString() }} عدد</b>
        </div>

        <div class="cart-row cart-head">
          <div>کالا</div>
          <div>تعداد</div>
          <div>مبلغ</div>
          <div></div>
        </div>

        <div v-if="cart.length === 0" class="empty-cart">فاکتور خالی است</div>

        <div v-for="row in cart" :key="row.id" class="cart-row">
          <div class="cart-product">
            <strong>{{ row.item.GoodsName }}</strong>
            <small>{{ formatMoney(money(row.item.GoodsPrice)) }} {{ currencyLabel }} برای هر عدد</small>
            <div v-if="row.toppings.length" class="cart-toppings">
              <span v-for="topping in row.toppings" :key="`${row.id}-${topping.ToppingId}-${topping.GoodsId}`">
                {{ topping.GoodsName }}
                <b v-if="topping.Count > 1">×{{ topping.Count }}</b>
              </span>
            </div>
            <input v-model="row.note" placeholder="توضیحات" />
          </div>

          <div class="qty-control">
            <button @click="decrease(row)">-</button>
            <span>{{ row.quantity }}</span>
            <button @click="increase(row)">+</button>
          </div>

          <div class="row-price">{{ formatMoney(rowUnitPrice(row) * row.quantity) }}</div>
          <button class="remove-btn" @click="removeRow(row.id)">X</button>
        </div>
      </div>

      <div v-if="canDiscountPercent || canDiscountAmount" class="invoice-controls">
        <div class="discount-box">
          <div class="segmented">
            <button :class="{ active: discountMode === 'none' }" @click="setDiscountMode('none')">بدون تخفیف</button>
            <button v-if="canDiscountPercent" :class="{ active: discountMode === 'percent' }"
              @click="setDiscountMode('percent')">درصدی</button>
            <button v-if="canDiscountAmount" :class="{ active: discountMode === 'amount' }"
              @click="setDiscountMode('amount')">مبلغی</button>
          </div>

          <input v-if="discountMode === 'percent'" class="desktop-input" v-model.number="discountPercent" type="number"
            min="0" :max="maxDiscountPercent" placeholder="درصد تخفیف" @focus="bindKeyboard($event.target, true)"
            @click="bindKeyboard($event.target, true)" />
          <input v-if="discountMode === 'amount'" class="desktop-input" v-model.number="discountAmount" type="number"
            min="0" :max="maxDiscountAmount" placeholder="مبلغ تخفیف" @focus="bindKeyboard($event.target, true)"
            @click="bindKeyboard($event.target, true)" />
        </div>
      </div>

      <div class="totals-box">
        <div><span>جمع کالا</span><b>{{ formatMoney(subTotal) }}</b></div>
        <div><span>مالیات و عوارض</span><b>{{ formatMoney(taxTotal) }}</b></div>
        <div><span>بسته‌بندی</span><b>{{ formatMoney(packingTotal) }}</b></div>
        <div><span>تخفیف</span><b>{{ formatMoney(discountValue) }}</b></div>
        <div class="grand"><span>قابل پرداخت</span><b>{{ formatMoney(grandTotal) }} {{ currencyLabel }}</b></div>
      </div>

      <div v-if="serviceMessage" class="service-message">{{ serviceMessage }}</div>
    </section>

    <div v-if="checkoutOpen" class="checkout-overlay">
      <div class="checkout-modal">
        <div class="checkout-head">
          <div>
            <div class="checkout-title">تکمیل ثبت فاکتور</div>
            <div class="checkout-sub">{{ totalItemQuantity.toLocaleString() }} عدد، {{ cart.length.toLocaleString() }}
              ردیف</div>
          </div>
          <button class="icon-btn" @click="checkoutOpen = false">×</button>
        </div>

        <div class="checkout-body">
          <section class="checkout-section">
            <div class="checkout-label">نوع سفارش</div>
            <div class="choice-grid two">
              <button :class="{ active: orderType === '2' }" @click="orderType = '2'">سالن</button>
              <button :class="{ active: orderType === '3' }" @click="orderType = '3'">بیرون بر</button>
            </div>
          </section>

          <section v-if="orderType === '2'" class="checkout-section">
            <div class="checkout-label">میز سالن</div>
            <div class="table-selection-box">
              <div>
                <span>{{ selectedTableTitle }}</span>
                <small v-if="requiresTableSelection">انتخاب میز برای این سفارش لازم است.</small>
              </div>
              <div class="table-selection-actions">
                <select class="desktop-input" :value="selectedTable?.TableId || 0" @change="handleTableDropdownChange">
                  <option :value="0">انتخاب میز</option>
                  <option v-for="table in activeDiningTables" :key="`checkout-table-${table.TableId}`"
                    :value="table.TableId" :disabled="!canSelectDiningTable(table)">
                    {{ tableOptionTitle(table) }}
                  </option>
                </select>
                <button type="button" class="desktop-btn muted" @click="openTablePicker">چیدمان</button>
              </div>
            </div>
          </section>

          <section class="checkout-section">
            <div class="checkout-label">{{ editingInvoice ? "تسویه اختلاف ویرایش" : "نحوه تسویه" }}</div>
            <div v-if="editingInvoice && editPaymentDifference > 0" class="payment-note">
              مبلغ فاکتور {{ formatMoney(editPaymentDifference) }} {{ currencyLabel }} بیشتر شده و فقط همین اختلاف
              دریافت می‌شود.
            </div>
            <div v-else-if="editingInvoice && refundAmount > 0" class="checkout-warning">
              مبلغ فاکتور {{ formatMoney(refundAmount) }} {{ currencyLabel }} کمتر شده؛ این مبلغ باید به مشتری برگردد.
            </div>
            <div v-else-if="editingInvoice" class="payment-note">
              مبلغ نهایی تغییری نکرده و دریافت اضافه‌ای لازم نیست.
            </div>
            <div v-if="skipPaymentForTable" class="payment-note table-hold-note">
              این فاکتور روی میز ثبت می‌شود و تا زمان تسویه از صفحه میزها، مبلغی به کارتخوان یا رسید مالی ارسال نمی‌شود.
            </div>
            <div v-else class="payment-split">
              <div class="pay-input-grid">
                <label class="pay-field">
                  <span>نقدی</span>
                  <input class="desktop-input" type="number" min="0" :max="paymentTargetAmount"
                    v-model.number="cashAmount" @input="normalizePaymentAmounts('cash')"
                    @focus="bindKeyboard($event.target, true)" @click="bindKeyboard($event.target, true)" />
                  <button type="button" class="mini-btn" @click="fillCashAmount">مانده نقدی</button>
                </label>

                <label class="pay-field">
                  <span>اعتباری</span>
                  <input class="desktop-input" type="number" min="0" :max="maxCreditUsable"
                    :disabled="!selectedCustomer || !creditChecked || customerCredit <= 0" v-model.number="creditAmount"
                    @input="normalizePaymentAmounts('credit')" @focus="bindKeyboard($event.target, true)"
                    @click="bindKeyboard($event.target, true)" />
                  <button type="button" class="mini-btn" :disabled="!selectedCustomer || !creditChecked"
                    @click="fillCreditAmount">حداکثر اعتبار</button>
                </label>

                <div class="pay-field readonly-pay">
                  <span>کارتخوان</span>
                  <b>{{ formatMoney(posPayableAmount) }} {{ currencyLabel }}</b>
                  <small>مانده قابل ارسال به کارتخوان</small>
                </div>
              </div>

              <div class="credit-tools">
                <div>
                  <span>مشتری</span>
                  <b>{{ selectedCustomer ? customerName(selectedCustomer) : "انتخاب نشده" }}</b>
                </div>
                <div class="payment-tool-actions">
                  <button type="button" class="desktop-btn muted" :disabled="!selectedCustomer || creditLoading"
                    @click="checkSelectedCustomerCredit">
                    {{ creditLoading ? "در حال بررسی" : "بررسی اعتبار" }}
                  </button>
                  <button type="button" class="desktop-btn muted" @click="clearPaymentAmounts">پاک کردن مبالغ</button>
                </div>
              </div>

              <div v-if="creditMessage" class="credit-status">{{ creditMessage }}</div>
              <div v-if="posPayableAmount > 0" class="payment-note">
                {{ formatMoney(posPayableAmount) }} {{ currencyLabel }} به کارتخوان ارسال می‌شود.
              </div>
            </div>
          </section>

          <div v-if="requiresTableSelection && !selectedTable" class="checkout-warning">
            برای سفارش سالن میز را انتخاب کنید.
          </div>
          <div v-if="!skipPaymentForTable && normalizedCreditAmount > 0 && !selectedCustomer" class="checkout-warning">
            برای پرداخت اعتباری باید مشتری انتخاب شود.
          </div>
          <div v-else-if="!skipPaymentForTable && normalizedCreditAmount > 0 && !creditChecked"
            class="checkout-warning">
            قبل از ثبت، اعتبار مشتری را بررسی کنید.
          </div>
          <div v-if="!skipPaymentForTable && paymentOverage > 0" class="checkout-warning">
            مجموع نقدی و اعتباری بیشتر از مبلغ فاکتور است.
          </div>

          <div class="checkout-summary">
            <div><span>نوع سفارش</span><b>{{ orderTypeTitle }}</b></div>
            <div v-if="orderType === '2'"><span>میز</span><b>{{ selectedTableTitle }}</b></div>
            <div><span>مشتری</span><b>{{ selectedCustomer ? customerName(selectedCustomer) : "انتخاب نشده" }}</b></div>
            <div v-if="editingInvoice"><span>مبلغ قبلی</span><b>{{ formatMoney(originalPayableAmount) }} {{
              currencyLabel }}</b></div>
            <div v-if="editingInvoice">
              <span>{{ editPaymentDifference >= 0 ? "مابه‌التفاوت" : "مبلغ عودت" }}</span>
              <b>{{ formatMoney(Math.abs(editPaymentDifference)) }} {{ currencyLabel }}</b>
            </div>
            <div v-if="!skipPaymentForTable"><span>نقدی</span><b>{{ formatMoney(normalizedCashAmount) }} {{
              currencyLabel }}</b></div>
            <div v-if="!skipPaymentForTable"><span>اعتباری</span><b>{{ formatMoney(normalizedCreditAmount) }} {{
              currencyLabel }}</b></div>
            <div v-if="!skipPaymentForTable"><span>کارتخوان</span><b>{{ formatMoney(posPayableAmount) }} {{
              currencyLabel }}</b></div>
            <div v-else><span>وضعیت</span><b>باز روی میز</b></div>
            <div class="grand"><span>مبلغ نهایی</span><b>{{ formatMoney(grandTotal) }} {{ currencyLabel }}</b></div>
          </div>
        </div>

        <div class="checkout-actions">
          <button class="desktop-btn muted" :disabled="cart.length === 0" @click="cancelDraftInvoice">لغو
            فاکتور</button>
          <button class="desktop-btn muted" @click="checkoutOpen = false">برگشت</button>
          <button class="desktop-btn primary" :disabled="!canConfirmCheckout" @click="submitInvoice">
            {{ isSubmitting ? "در حال ثبت" : editingInvoice ? "ثبت ویرایش فاکتور" : "ثبت نهایی فاکتور" }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="tablePickerOpen" class="table-picker-overlay">
      <div class="table-picker-modal">
        <div class="checkout-head">
          <div>
            <div class="checkout-title">انتخاب میز</div>
            <div class="checkout-sub">{{ diningTables.length.toLocaleString() }} میز تعریف‌شده</div>
          </div>
          <button class="icon-btn" @click="tablePickerOpen = false">×</button>
        </div>

        <div class="table-picker-body">
          <div class="table-group-tabs">
            <button :class="{ active: selectedTableGroupId === null }" @click="selectedTableGroupId = null">همه</button>
            <button v-for="group in activeTableGroups" :key="group.TableGroupId"
              :class="{ active: selectedTableGroupId === group.TableGroupId }"
              @click="selectedTableGroupId = group.TableGroupId">
              {{ group.GroupTitle }}
            </button>
          </div>

          <div class="table-picker-grid">
            <button v-for="table in tablesForSelectedGroup" :key="table.TableId" class="table-pick-card"
              :class="{ occupied: table.IsOccupied, selected: selectedTable?.TableId === table.TableId }"
              :disabled="!canSelectDiningTable(table)" @click="selectDiningTable(table)">
              <span v-if="table.IsOccupied" class="table-card-money">{{ formatMoney(money(table.Payable)) }} {{
                currencyLabel }}</span>
              <span v-if="table.IsOccupied" class="table-card-time">{{ formatOccupiedDuration(table.OccupiedMinutes)
                }}</span>
              <b>{{ table.TableTitle }}</b>
              <small>{{ table.TableCode }}</small>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="toppingModalOpen && toppingProduct" class="topping-overlay">
      <div class="topping-modal">
        <div class="topping-head">
          <div>
            <div class="checkout-title">{{ toppingProduct.GoodsName }}</div>
            <div class="checkout-sub">انتخاب تاپینگ</div>
          </div>
          <button class="icon-btn" @click="closeToppingModal">×</button>
        </div>

        <div class="topping-body">
          <section v-for="group in toppingGroups(toppingProduct)"
            :key="String(group.level?.LevelId || group.links[0]?.LevelId)" class="topping-group">
            <div class="topping-group-title">
              <span>{{ group.level?.LevelTitle || toppingLevelTitle(group.links[0]?.LevelId) }}</span>
              <small>حداقل {{ group.level?.MinCount ?? group.links[0]?.MinCount }} / حداکثر {{ group.level?.MaxCount ??
                group.links[0]?.MaxCount }}</small>
            </div>

            <div class="topping-options">
              <div v-for="link in group.links" :key="toppingKey(link)" class="topping-option">
                <div>
                  <strong>{{ toppingItemTitle(link) }}</strong>
                  <small>{{ formatMoney(money(link.Price)) }} {{ currencyLabel }}</small>
                </div>
                <div class="qty-control topping-qty">
                  <button @click="setToppingCount(link, -1)">-</button>
                  <span>{{ selectedToppingCount(link) }}</span>
                  <button @click="setToppingCount(link, 1)">+</button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div class="checkout-actions">
          <button class="desktop-btn muted" @click="closeToppingModal">انصراف</button>
          <button class="desktop-btn primary" @click="confirmToppings">افزودن به سبد</button>
        </div>
      </div>
    </div>

    <VirtualKeyboard v-if="activeInputRef" :input-ref="activeInputRef" :is-number-mode="isNumberMode"
      @key-press="handleKeyPress" @hide="hideKeyboard" />
  </div>
</template>

<style scoped>
.sales-shell {
  height: 100%;
  min-height: 0;
  display: grid;
  direction: ltr;
  grid-template-columns: clamp(290px, 10vw, 180px) minmax(230px, 1fr) minmax(540px, min(58vw, 520px));
  grid-template-areas: "categories goods invoice";
  gap: 12px;
}

.category-panel {
  grid-area: categories;
}

.goods-panel {
  grid-area: goods;
}

.invoice-panel {
  grid-area: invoice;
  position: relative;
}

.category-panel,
.goods-panel,
.invoice-panel {
  direction: rtl;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  overflow-y: scroll;
}

.panel-head {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.panel-head.compact {
  min-height: 64px;
}

.panel-title {
  font-size: 17px;
  font-weight: 900;
}

.panel-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #a7b0c3;
}

.icon-btn,
.desktop-btn,
.desktop-input,
.category-btn,
.goods-card,
.remove-btn,
.segmented button,
.customer-results button {
  border-radius: 8px;
  font-family: inherit;
}

.icon-btn {
  min-width: 42px;
  min-height: 42px;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
}

.category-list {
  padding: 10px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-btn {
  min-height: 46px;
  padding: 9px 10px;
  text-align: right;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-btn.active {
  font-weight: 900;
  background: rgba(20, 184, 166, 0.14);
  border-color: rgba(20, 184, 166, 0.34);
}

.category-btn img {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: 8px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.05);
}

.category-all-icon {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  color: #ccfbf1;
  background: rgba(20, 184, 166, 0.12);
  border: 1px solid rgba(20, 184, 166, 0.22);
  font-size: 12px;
  font-weight: 900;
}

.category-btn span {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.desktop-input {
  min-height: 46px;
  padding: 9px 11px;
  font-size: 15px;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.goods-panel .desktop-input {
  width: min(360px, 100%);
}

.state-box,
.empty-cart {
  margin: 12px;
  padding: 14px;
  border-radius: 8px;
  color: #a7b0c3;
  background: rgba(255, 255, 255, 0.025);
}

.goods-grid {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(138px, 1fr));
  align-content: start;
  gap: 10px;
}

.goods-card {
  min-height: 210px;
  padding: 10px;
  text-align: right;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.07);
  cursor: pointer;
  display: grid;
  grid-template-rows: 78px auto auto auto auto;
  gap: 7px;
}

.goods-card:hover {
  border-color: rgba(20, 184, 166, 0.28);
}

.goods-card img {
  width: 100%;
  height: 78px;
  border-radius: 8px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.04);
}

.goods-name {
  font-weight: 900;
}

.goods-desc,
.goods-meta {
  font-size: 12px;
  color: #a7b0c3;
}

.goods-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.goods-topping-badge {
  width: max-content;
  max-width: 100%;
  border-radius: 8px;
  padding: 3px 7px;
  font-size: 11px;
  color: #ccfbf1;
  background: rgba(20, 184, 166, 0.14);
  border: 1px solid rgba(20, 184, 166, 0.24);
}

.total-badge {
  min-height: 42px;
  display: flex;
  align-items: center;
  border-radius: 8px;
  padding: 8px 11px;
  color: #bbf7d0;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.22);
  font-weight: 900;
}

.customer-box {
  position: relative;
  z-index: 40;
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.edit-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 10px 12px 0;
  border-radius: 8px;
  padding: 10px 12px;
  color: #ccfbf1;
  background: rgba(20, 184, 166, 0.12);
  border: 1px solid rgba(20, 184, 166, 0.24);
}

.edit-banner div {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.edit-banner span {
  font-weight: 900;
}

.edit-banner small {
  color: #a7f3d0;
}

.customer-box .desktop-input {
  width: 90%;
}

.table-inline-select {
  display: grid;
  grid-template-columns: minmax(120px, 0.75fr) minmax(0, 1fr) 104px;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.table-inline-select div {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.table-inline-select span {
  color: #eef2ff;
  font-weight: 900;
}

.table-inline-select small {
  min-width: 0;
  overflow: hidden;
  color: #ccfbf1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-inline-select .desktop-input {
  min-width: 0;
  width: 100%;
}

.customer-status {
  margin-top: 8px;
  color: #a7b0c3;
  font-size: 13px;
}

.customer-results {
  position: absolute;
  z-index: 80;
  top: calc(100% - 6px);
  right: 12px;
  left: 12px;
  max-height: min(320px, calc(100vh - 260px));
  overflow: auto;
  border-radius: 8px;
  padding: 6px;
  background: #171b24;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 22px 56px rgba(0, 0, 0, 0.42);
}

.customer-results button {
  width: 100%;
  min-height: 42px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: #eef2ff;
  background: transparent;
  border: 0;
  padding: 8px;
  cursor: pointer;
}

.customer-results button:hover {
  background: rgba(255, 255, 255, 0.05);
}

.cart-table {
  flex: 2 1 340px;
  min-height: clamp(250px, 42vh, 520px);
  overflow: auto;
  background: rgba(20, 184, 166, 0.035);
}

.cart-section-title {
  position: sticky;
  top: 0;
  z-index: 3;
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 12px;
  color: #eef2ff;
  background: rgba(20, 184, 166, 0.1);
  border-bottom: 1px solid rgba(20, 184, 166, 0.22);
  font-weight: 900;
}

.cart-row {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) 96px 96px 54px;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.cart-head {
  position: sticky;
  top: 42px;
  z-index: 2;
  min-height: 42px;
  font-weight: 900;
  color: #a7b0c3;
  background: rgba(16, 19, 26, 0.96);
}

.cart-product {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cart-product strong {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cart-product small {
  color: #a7b0c3;
}

.cart-toppings {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.cart-toppings span {
  border-radius: 8px;
  padding: 3px 6px;
  font-size: 11px;
  color: #dbeafe;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.22);
}

.cart-toppings b {
  margin-right: 4px;
  color: #eef2ff;
}

.cart-product input {
  min-height: 34px;
  border-radius: 8px;
  padding: 6px 8px;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.qty-control {
  display: grid;
  grid-template-columns: 32px 1fr 32px;
  align-items: center;
  gap: 5px;
}

.qty-control button,
.remove-btn {
  min-height: 34px;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
}

.qty-control span,
.row-price {
  text-align: center;
  font-weight: 900;
  padding: 0;
}

.remove-btn {
  color: #fecaca;
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.22);
  padding: 10px 0px 8px 0px;
}

.invoice-controls {
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.segmented {
  display: flex;
  gap: 6px;
  padding: 5px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.segmented button {
  flex: 1;
  min-height: 38px;
  color: #eef2ff;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
}

.segmented button.active {
  font-weight: 900;
  color: #fef3c7;
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.28);
}

.discount-box {
  display: grid;
  grid-template-columns: 1fr 150px;
  gap: 8px;
}

.totals-box {
  padding: 9px 12px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.totals-box div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: #a7b0c3;
}

.totals-box b {
  color: #eef2ff;
}

.totals-box .grand {
  grid-column: 1 / -1;
  margin-top: 5px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: #eef2ff;
  font-size: 16px;
  font-weight: 900;
}

.invoice-actions {
  padding: 10px 12px 12px;
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 8px;
}

.desktop-btn {
  min-height: 48px;
  color: #eef2ff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
}

.desktop-btn.primary {
  font-weight: 900;
  background: rgba(20, 184, 166, 0.18);
  border-color: rgba(20, 184, 166, 0.34);
}

.desktop-btn.muted {
  background: rgba(255, 255, 255, 0.04);
}

.desktop-btn:disabled,
.icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.service-message {
  margin: 0 12px 12px;
  border-radius: 8px;
  padding: 10px 12px;
  color: #fde68a;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.22);
}

.checkout-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 24px;
  direction: rtl;
  background: rgba(0, 0, 0, 0.64);
}

.topping-overlay {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: grid;
  place-items: center;
  padding: 24px;
  direction: rtl;
  background: rgba(0, 0, 0, 0.64);
}

.table-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 115;
  display: grid;
  place-items: center;
  padding: 24px;
  direction: rtl;
  background: rgba(0, 0, 0, 0.64);
}

.checkout-modal {
  width: min(620px, calc(100vw - 48px));
  max-height: calc(100vh - 48px);
  overflow: hidden;
  border-radius: 8px;
  background: #171b24;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.38);
  display: flex;
  flex-direction: column;
}

.topping-modal {
  width: min(720px, calc(100vw - 48px));
  max-height: calc(100vh - 48px);
  overflow: hidden;
  border-radius: 8px;
  background: #171b24;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.38);
  display: flex;
  flex-direction: column;
}

.table-picker-modal {
  width: min(860px, calc(100vw - 48px));
  max-height: calc(100vh - 48px);
  overflow: hidden;
  border-radius: 8px;
  background: #171b24;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.38);
  display: flex;
  flex-direction: column;
}

.checkout-head,
.topping-head,
.checkout-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.checkout-actions {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: 0;
}

.checkout-title {
  font-size: 18px;
  font-weight: 900;
}

.checkout-sub,
.checkout-label {
  color: #a7b0c3;
  font-size: 13px;
}

.checkout-body {
  overflow: auto;
  padding: 14px;
  display: grid;
  gap: 14px;
}

.topping-body {
  overflow: auto;
  padding: 14px;
  display: grid;
  gap: 12px;
}

.topping-group {
  display: grid;
  gap: 8px;
}

.topping-group-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #eef2ff;
  font-weight: 900;
}

.topping-group-title small {
  color: #a7b0c3;
  font-weight: 500;
}

.topping-options {
  display: grid;
  gap: 8px;
}

.topping-option {
  min-height: 58px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 110px;
  align-items: center;
  gap: 12px;
  border-radius: 8px;
  padding: 9px 0 10px 30px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.topping-option strong,
.topping-option small {
  display: block;
}

.topping-option small {
  margin-top: 4px;
  color: #a7b0c3;
}

.topping-qty {
  grid-template-columns: 32px 1fr 32px;
}

.checkout-section {
  display: grid;
  gap: 8px;
}

.choice-grid {
  display: grid;
  gap: 8px;
}

.choice-grid.two {
  grid-template-columns: repeat(2, 1fr);
}

.choice-grid.three {
  grid-template-columns: repeat(3, 1fr);
}

.choice-grid button {
  min-height: 52px;
  border-radius: 8px;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
}

.choice-grid button.active {
  font-weight: 900;
  color: #ccfbf1;
  background: rgba(20, 184, 166, 0.16);
  border-color: rgba(20, 184, 166, 0.34);
}

.checkout-warning {
  border-radius: 8px;
  padding: 10px 12px;
  color: #fecaca;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.22);
}

.payment-split {
  display: grid;
  gap: 10px;
  border-radius: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.table-selection-box {
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 8px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.table-selection-box div {
  display: grid;
  gap: 4px;
}

.table-selection-box span {
  color: #eef2ff;
  font-weight: 900;
}

.table-selection-box small,
.table-hold-note {
  color: #ccfbf1;
}

.table-selection-actions {
  min-width: min(360px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 104px;
  gap: 8px;
}

.table-selection-actions .desktop-input {
  min-width: 0;
  width: 100%;
}

.table-picker-body {
  overflow: auto;
  padding: 14px;
  display: grid;
  gap: 12px;
}

.table-group-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.table-group-tabs button {
  min-height: 40px;
  border-radius: 8px;
  padding: 7px 12px;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  white-space: nowrap;
}

.table-group-tabs button.active {
  color: #ccfbf1;
  background: rgba(20, 184, 166, 0.16);
  border-color: rgba(20, 184, 166, 0.34);
}

.table-picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 10px;
}

.table-pick-card {
  aspect-ratio: 1 / 0.82;
  min-height: 112px;
  display: grid;
  grid-template-rows: 18px 18px 1fr 18px;
  align-items: center;
  justify-items: center;
  gap: 4px;
  border-radius: 8px;
  padding: 10px;
  color: #eef2ff;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.24);
  cursor: pointer;
}

.table-pick-card.occupied {
  color: #fecaca;
  background: rgba(239, 68, 68, 0.16);
  border-color: rgba(239, 68, 68, 0.34);
}

.table-pick-card.selected {
  color: #ccfbf1;
  border-color: rgba(20, 184, 166, 0.58);
  box-shadow: inset 0 0 0 1px rgba(20, 184, 166, 0.38);
}

.table-pick-card:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.table-pick-card b,
.table-pick-card small,
.table-card-money,
.table-card-time {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-pick-card b {
  font-size: 16px;
  font-weight: 900;
}

.table-pick-card small,
.table-card-time {
  color: #a7b0c3;
}

.table-card-money {
  font-weight: 900;
}

.pay-input-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.pay-field {
  min-width: 0;
  display: grid;
  gap: 7px;
  color: #a7b0c3;
  font-size: 12px;
}

.pay-field input {
  min-width: 0;
}

.readonly-pay {
  align-content: center;
  min-height: 96px;
  border-radius: 8px;
  padding: 10px;
  background: rgba(20, 184, 166, 0.1);
  border: 1px solid rgba(20, 184, 166, 0.2);
}

.readonly-pay b {
  color: #ccfbf1;
  font-size: 18px;
  font-weight: 900;
}

.readonly-pay small {
  color: #94a3b8;
  font-size: 11px;
}

.mini-btn {
  min-height: 30px;
  border-radius: 8px;
  color: #ccfbf1;
  background: rgba(20, 184, 166, 0.12);
  border: 1px solid rgba(20, 184, 166, 0.22);
  cursor: pointer;
}

.mini-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.credit-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-radius: 8px;
  padding: 10px;
  background: rgba(15, 23, 42, 0.45);
}

.credit-tools div {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.payment-tool-actions {
  display: flex !important;
  grid-template-columns: none !important;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.credit-tools span,
.credit-status,
.payment-note {
  color: #a7b0c3;
  font-size: 12px;
}

.credit-tools b {
  overflow: hidden;
  color: #eef2ff;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.credit-status {
  color: #bfdbfe;
}

.payment-note {
  color: #ccfbf1;
}

.checkout-summary {
  display: grid;
  gap: 8px;
  border-radius: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.checkout-summary div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #a7b0c3;
}

.checkout-summary b {
  color: #eef2ff;
}

.checkout-summary .grand {
  margin-top: 6px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 16px;
  font-weight: 900;
}

@media (max-width: 1180px) {
  .sales-shell {
    grid-template-columns: 210px minmax(210px, 0.78fr) minmax(520px, 1.35fr);
    gap: 8px;
  }

  .panel-head {
    min-height: 62px;
  }

  .panel-head {
    padding: 10px;
  }

  .goods-grid {
    padding: 10px;
    grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
  }

  .goods-card {
    min-height: 245px;
  }

  .customer-box {
    padding: 9px 10px;
  }

  .customer-results {
    right: 10px;
    left: 10px;
    max-height: min(300px, calc(100vh - 230px));
  }

  .cart-table {
    min-height: clamp(240px, 46vh, 500px);
  }

  .cart-row {
    grid-template-columns: minmax(125px, 1fr) 86px 86px 46px;
    gap: 6px;
    padding: 9px 10px;
  }

  .qty-control {
    grid-template-columns: 30px 1fr 30px;
  }

  .remove-btn {
    padding: 8px 0;
  }

  .totals-box {
    padding: 8px 10px;
    gap: 6px 10px;
    font-size: 13px;
  }

  .invoice-actions {
    grid-template-columns: 104px 1fr;
    padding: 8px 10px 10px;
  }

  .desktop-btn {
    min-height: 44px;
  }

  .pay-input-grid {
    grid-template-columns: 1fr;
  }

  .credit-tools {
    align-items: stretch;
    flex-direction: column;
  }

  .payment-tool-actions {
    justify-content: stretch;
  }

  .payment-tool-actions button {
    flex: 1 1 160px;
  }
}
</style>
