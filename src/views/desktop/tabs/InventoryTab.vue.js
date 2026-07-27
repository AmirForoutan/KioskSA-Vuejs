import { computed, onMounted, reactive, ref } from "vue";
import { loadInventoryBootstrap, saveInventorySettings, saveWarehouse, saveGoodsLimits, saveInventoryDocument, loadStockReport, loadKardexReport, loadInventoryChangeLogs, rebuildInventoryBalances, } from "../../../services/inventoryApi";
const loading = ref(false);
const message = ref("");
const activeTab = ref("settings");
const haveStockLicense = ref(false);
const warehouses = ref([]);
const fiscalYears = ref([]);
const goods = ref([]);
const valuationMethods = ref([]);
const documentTypes = ref([]);
const stockRows = ref([]);
const kardexRows = ref([]);
const changeLogRows = ref([]);
const stockTakingRows = ref([]);
const goodsSearch = ref("");
const suppliers = ref(loadSuppliersFromStorage());
const supplierLedger = ref(loadSupplierLedgerFromStorage());
const settings = reactive({
    IsWarehouseEnabled: true,
    AllowNegativeStockSale: false,
    InventoryValuationMethod: 2,
    AutoCreateStockReceiptFromPurchaseInvoice: true,
    AutoCreateStockIssueFromSaleInvoice: true,
    RequireWarehouseForSale: true,
    RequireWarehouseForPurchase: true,
    EnableStockTaking: true,
});
const warehouseForm = reactive({
    WarehouseId: 0,
    WarehouseCode: "",
    WarehouseTitle: "",
    IsActive: true,
    IsDefault: false,
    Description: "",
});
const supplierForm = reactive({
    SupplierId: 0,
    SupplierCode: "",
    SupplierTitle: "",
    Phone: "",
    Address: "",
    Description: "",
    IsActive: true,
});
const documentForm = reactive({
    DocumentId: 0,
    DocumentType: 1,
    DocumentNumber: "",
    DocumentDate: todayFa(),
    FiscalYearId: 0,
    WarehouseId: 0,
    PersonId: 0,
    PersonTitle: "",
    PurchaseAmount: 0,
    PaidAmount: 0,
    PaymentDescription: "",
    Description: "",
});
const documentItems = ref([
    { GoodsId: 0, Quantity: 1, UnitPrice: 0, Description: "" },
]);
const reportFilter = reactive({
    FiscalYearId: 0,
    WarehouseId: 0,
    FromDate: "",
    ToDate: "",
    GoodsId: 0,
});
const historyFilter = reactive({
    FromDate: "",
    ToDate: "",
});
const filteredGoods = computed(() => {
    const q = goodsSearch.value.trim().toLowerCase();
    if (!q)
        return goods.value;
    return goods.value.filter((item) => `${item.GoodsCode} ${item.GoodsName}`.toLowerCase().includes(q));
});
const selectedFiscalYear = computed(() => fiscalYears.value.find((f) => f.FiscalYearId === Number(reportFilter.FiscalYearId)) || fiscalYears.value[0]);
const selectedWarehouseTitle = computed(() => warehouses.value.find((w) => w.WarehouseId === Number(reportFilter.WarehouseId))?.WarehouseTitle || "همه انبارها");
const defaultWarehouseId = computed(() => warehouses.value.find((w) => w.IsDefault)?.WarehouseId || warehouses.value[0]?.WarehouseId || 0);
const supplierBalanceRows = computed(() => suppliers.value.map((supplier) => {
    const rows = supplierLedger.value.filter((row) => row.SupplierId === supplier.SupplierId);
    const purchaseAmount = rows.reduce((sum, row) => sum + Number(row.PurchaseAmount || 0), 0);
    const paidAmount = rows.reduce((sum, row) => sum + Number(row.PaidAmount || 0), 0);
    return {
        ...supplier,
        PurchaseAmount: purchaseAmount,
        PaidAmount: paidAmount,
        BalanceAmount: purchaseAmount - paidAmount,
    };
}));
const filteredChangeLogRows = computed(() => filterRowsByDate(changeLogRows.value, (row) => String(row.ChangedAt || "").split("-")[0], historyFilter.FromDate, historyFilter.ToDate));
onMounted(loadAll);
function todayFa() {
    return new Date().toLocaleDateString("fa-IR-u-nu-latn").replace(/-/g, "/");
}
function showMessage(text) {
    message.value = text;
    window.setTimeout(() => {
        if (message.value === text)
            message.value = "";
    }, 3500);
}
function compareDateText(value, fromDate, toDate) {
    const date = String(value || "").trim();
    if (!date)
        return true;
    if (fromDate && date < fromDate)
        return false;
    if (toDate && date > toDate)
        return false;
    return true;
}
function filterRowsByDate(rows, dateSelector, fromDate, toDate) {
    return rows.filter((row) => compareDateText(dateSelector(row), fromDate, toDate));
}
function loadSuppliersFromStorage() {
    try {
        return JSON.parse(localStorage.getItem("pargas_inventory_suppliers") || "[]");
    }
    catch {
        return [];
    }
}
function saveSuppliersToStorage() {
    localStorage.setItem("pargas_inventory_suppliers", JSON.stringify(suppliers.value));
}
function loadSupplierLedgerFromStorage() {
    try {
        return JSON.parse(localStorage.getItem("pargas_inventory_supplier_ledger") || "[]");
    }
    catch {
        return [];
    }
}
function saveSupplierLedgerToStorage() {
    localStorage.setItem("pargas_inventory_supplier_ledger", JSON.stringify(supplierLedger.value));
}
async function loadAll() {
    loading.value = true;
    try {
        const data = await loadInventoryBootstrap();
        haveStockLicense.value = data.haveStockLicense;
        Object.assign(settings, data.settings || settings);
        warehouses.value = data.warehouses || [];
        fiscalYears.value = data.fiscalYears || [];
        goods.value = data.goods || [];
        valuationMethods.value = data.valuationMethods || [];
        documentTypes.value = data.documentTypes || [];
        documentForm.WarehouseId = defaultWarehouseId.value;
        documentForm.FiscalYearId = fiscalYears.value[0]?.FiscalYearId || 0;
        reportFilter.FiscalYearId = fiscalYears.value[0]?.FiscalYearId || 0;
    }
    catch (error) {
        showMessage(error instanceof Error ? error.message : "خطا در دریافت اطلاعات انبار");
    }
    finally {
        loading.value = false;
    }
}
async function saveSettings() {
    try {
        const result = await saveInventorySettings(settings);
        showMessage(result.message || "تنظیمات ذخیره شد");
    }
    catch (error) {
        showMessage(error instanceof Error ? error.message : "خطا در ذخیره تنظیمات");
    }
}
async function submitWarehouse() {
    try {
        const result = await saveWarehouse(warehouseForm);
        showMessage(result.message || "انبار ذخیره شد");
        Object.assign(warehouseForm, { WarehouseId: 0, WarehouseCode: "", WarehouseTitle: "", IsActive: true, IsDefault: false, Description: "" });
        await loadAll();
    }
    catch (error) {
        showMessage(error instanceof Error ? error.message : "خطا در ذخیره انبار");
    }
}
function editWarehouse(row) {
    Object.assign(warehouseForm, row);
}
function submitSupplier() {
    if (!supplierForm.SupplierTitle?.trim()) {
        showMessage("عنوان تأمین‌کننده الزامی است");
        return;
    }
    if (Number(supplierForm.SupplierId) > 0) {
        const index = suppliers.value.findIndex((item) => item.SupplierId === Number(supplierForm.SupplierId));
        if (index >= 0)
            suppliers.value[index] = { ...supplierForm };
    }
    else {
        const nextId = Math.max(0, ...suppliers.value.map((item) => item.SupplierId)) + 1;
        suppliers.value.push({
            SupplierId: nextId,
            SupplierCode: supplierForm.SupplierCode?.trim() || `SUP-${nextId}`,
            SupplierTitle: supplierForm.SupplierTitle.trim(),
            Phone: supplierForm.Phone || "",
            Address: supplierForm.Address || "",
            Description: supplierForm.Description || "",
            IsActive: supplierForm.IsActive !== false,
        });
    }
    saveSuppliersToStorage();
    Object.assign(supplierForm, { SupplierId: 0, SupplierCode: "", SupplierTitle: "", Phone: "", Address: "", Description: "", IsActive: true });
    showMessage("تأمین‌کننده ذخیره شد");
}
function editSupplier(row) {
    Object.assign(supplierForm, row);
    activeTab.value = "suppliers";
}
function onSupplierChange() {
    const supplier = suppliers.value.find((item) => item.SupplierId === Number(documentForm.PersonId));
    documentForm.PersonTitle = supplier?.SupplierTitle || "";
}
function getPaymentStatusTitle(purchaseAmount, paidAmount) {
    if (paidAmount === purchaseAmount)
        return "تسویه شده";
    if (paidAmount < purchaseAmount)
        return "بدهکار به تأمین‌کننده";
    return "پرداخت بیشتر / طلبکار";
}
function recordSupplierLedger(documentNumber) {
    if (Number(documentForm.DocumentType) !== 3 || !Number(documentForm.PersonId))
        return;
    const supplier = suppliers.value.find((item) => item.SupplierId === Number(documentForm.PersonId));
    if (!supplier)
        return;
    const purchaseAmount = Number(documentForm.PurchaseAmount || 0);
    const paidAmount = Number(documentForm.PaidAmount || 0);
    if (purchaseAmount <= 0 && paidAmount <= 0)
        return;
    supplierLedger.value.unshift({
        SupplierId: supplier.SupplierId,
        SupplierTitle: supplier.SupplierTitle,
        DocumentNumber: documentNumber,
        DocumentDate: documentForm.DocumentDate,
        PurchaseAmount: purchaseAmount,
        PaidAmount: paidAmount,
        BalanceAmount: purchaseAmount - paidAmount,
        StatusTitle: getPaymentStatusTitle(purchaseAmount, paidAmount),
        Description: documentForm.PaymentDescription || documentForm.Description,
    });
    saveSupplierLedgerToStorage();
}
async function saveLimits() {
    try {
        const result = await saveGoodsLimits(goods.value);
        showMessage(result.message || "محدوده موجودی کالاها ذخیره شد");
    }
    catch (error) {
        showMessage(error instanceof Error ? error.message : "خطا در ذخیره محدوده موجودی");
    }
}
function addDocumentItem() {
    documentItems.value.push({ GoodsId: 0, Quantity: 1, UnitPrice: 0, Description: "" });
}
function removeDocumentItem(index) {
    if (documentItems.value.length === 1)
        return;
    documentItems.value.splice(index, 1);
}
async function submitDocument() {
    try {
        const items = documentItems.value.filter((item) => Number(item.GoodsId) > 0 && Number(item.Quantity) > 0);
        const result = await saveInventoryDocument({ ...documentForm, Items: items });
        recordSupplierLedger(result.DocumentNumber || documentForm.DocumentNumber || "-");
        showMessage(result.message || "سند انبار ذخیره شد");
        documentForm.DocumentNumber = "";
        documentForm.PersonId = 0;
        documentForm.PersonTitle = "";
        documentForm.PurchaseAmount = 0;
        documentForm.PaidAmount = 0;
        documentForm.PaymentDescription = "";
        documentForm.Description = "";
        documentItems.value = [{ GoodsId: 0, Quantity: 1, UnitPrice: 0, Description: "" }];
        await loadStock();
    }
    catch (error) {
        showMessage(error instanceof Error ? error.message : "خطا در ذخیره سند انبار");
    }
}
async function loadStock() {
    try {
        const result = await loadStockReport(reportFilter);
        stockRows.value = result.rows || [];
        activeTab.value = "reports";
    }
    catch (error) {
        showMessage(error instanceof Error ? error.message : "خطا در گزارش موجودی");
    }
}
async function loadKardex() {
    try {
        const result = await loadKardexReport(reportFilter);
        kardexRows.value = filterRowsByDate(result.rows || [], (row) => row.DocumentDate, reportFilter.FromDate, reportFilter.ToDate);
        activeTab.value = "kardex";
    }
    catch (error) {
        showMessage(error instanceof Error ? error.message : "خطا در کاردکس کالا");
    }
}
async function loadHistory() {
    try {
        const result = await loadInventoryChangeLogs();
        changeLogRows.value = result.rows || [];
        activeTab.value = "history";
    }
    catch (error) {
        showMessage(error instanceof Error ? error.message : "خطا در دریافت سابقه تغییرات");
    }
}
async function rebuildBalances() {
    try {
        const result = await rebuildInventoryBalances(reportFilter.FiscalYearId || selectedFiscalYear.value?.FiscalYearId);
        showMessage(result.message || "بازسازی موجودی انجام شد");
        await loadStock();
    }
    catch (error) {
        showMessage(error instanceof Error ? error.message : "خطا در بازسازی موجودی");
    }
}
async function openStockTaking() {
    activeTab.value = "stocktaking";
    if (!Number(reportFilter.WarehouseId)) {
        reportFilter.WarehouseId = defaultWarehouseId.value;
    }
    if (!Number(reportFilter.WarehouseId)) {
        showMessage("ابتدا از بخش تنظیمات و کالاها، حداقل یک انبار تعریف کنید");
        return;
    }
    await prepareStockTaking();
}
async function prepareStockTaking() {
    activeTab.value = "stocktaking";
    if (!settings.EnableStockTaking) {
        showMessage("انبارگردانی در تنظیمات غیرفعال است");
        return;
    }
    if (!Number(reportFilter.WarehouseId)) {
        reportFilter.WarehouseId = defaultWarehouseId.value;
    }
    if (!Number(reportFilter.WarehouseId)) {
        showMessage("برای انبارگردانی باید از همین بخش، یک انبار مشخص انتخاب کنید");
        return;
    }
    const result = await loadStockReport({ ...reportFilter, FromDate: "", ToDate: "" });
    stockTakingRows.value = (result.rows || []).map((row) => ({
        ...row,
        RealQuantity: Number(row.CurrentQuantity || 0),
        DifferenceQuantity: 0,
    }));
}
function updateStockTakingDiff(row) {
    row.DifferenceQuantity = Number(row.RealQuantity || 0) - Number(row.CurrentQuantity || 0);
}
function toInventoryUnitPrice(row) {
    return Math.round(Number(row.LastPurchasePrice || row.AveragePrice || 0));
}
async function applyStockTaking() {
    if (!Number(reportFilter.WarehouseId)) {
        showMessage("برای ثبت انبارگردانی باید انبار مشخص باشد");
        return;
    }
    if (!stockTakingRows.value.length) {
        showMessage("ابتدا موجودی سیستم را بارگذاری کنید");
        return;
    }
    const increases = stockTakingRows.value
        .filter((row) => Number(row.DifferenceQuantity) > 0)
        .map((row) => ({
        GoodsId: row.GoodsId,
        Quantity: Number(row.DifferenceQuantity),
        UnitPrice: toInventoryUnitPrice(row),
        Description: `انبارگردانی - موجودی سیستمی ${row.CurrentQuantity} / موجودی واقعی ${row.RealQuantity}`,
    }));
    const decreases = stockTakingRows.value
        .filter((row) => Number(row.DifferenceQuantity) < 0)
        .map((row) => ({
        GoodsId: row.GoodsId,
        Quantity: Math.abs(Number(row.DifferenceQuantity)),
        UnitPrice: toInventoryUnitPrice(row),
        Description: `انبارگردانی - موجودی سیستمی ${row.CurrentQuantity} / موجودی واقعی ${row.RealQuantity}`,
    }));
    if (!increases.length && !decreases.length) {
        showMessage("اختلافی برای ثبت انبارگردانی وجود ندارد");
        return;
    }
    try {
        if (increases.length) {
            await saveInventoryDocument({
                DocumentType: 6,
                DocumentDate: todayFa(),
                FiscalYearId: Number(reportFilter.FiscalYearId || selectedFiscalYear.value?.FiscalYearId || 0),
                WarehouseId: Number(reportFilter.WarehouseId),
                PersonTitle: "سیستم",
                Description: "ثبت خودکار اختلاف افزایشی انبارگردانی",
                Items: increases,
            });
        }
        if (decreases.length) {
            await saveInventoryDocument({
                DocumentType: 8,
                DocumentDate: todayFa(),
                FiscalYearId: Number(reportFilter.FiscalYearId || selectedFiscalYear.value?.FiscalYearId || 0),
                WarehouseId: Number(reportFilter.WarehouseId),
                PersonTitle: "سیستم",
                Description: "ثبت خودکار اختلاف کاهشی انبارگردانی",
                Items: decreases,
            });
        }
        showMessage("انبارگردانی ثبت شد و اسناد اصلاحی ایجاد شدند");
        await prepareStockTaking();
    }
    catch (error) {
        showMessage(error instanceof Error ? error.message : "خطا در ثبت انبارگردانی");
    }
}
function exportStockCsv() {
    const header = ["کد کالا", "نام کالا", "موجودی حال حاضر", "ورود بازه", "خروج بازه", "ارزش موجودی", "آخرین خرید", "میانگین", "حداقل", "حداکثر"];
    const lines = stockRows.value.map((r) => [r.GoodsCode, r.GoodsName, r.CurrentQuantity, r.PeriodInQuantity, r.PeriodOutQuantity, r.InventoryValue, r.LastPurchasePrice, r.AveragePrice, r.MinStock, r.MaxStock].join(","));
    const blob = new Blob(["\ufeff" + [header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "inventory-stock-report.csv";
    a.click();
}
function printHtml(title, tableHtml, mode) {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win)
        return;
    const pageSize = mode === "receipt" ? "70mm auto" : mode === "a5" ? "A5" : "A4";
    const bodyClass = mode === "receipt" ? "receipt" : "paper";
    win.document.write(`
    <html lang="fa" dir="rtl">
    <head>
      <title>${title}</title>
      <style>
        @page { size: ${pageSize}; margin: ${mode === "receipt" ? "3mm" : "10mm"}; }
        body { font-family: Tahoma, Arial, sans-serif; color:#111827; margin:0; direction:rtl; }
        .paper { padding: 12px; }
        .receipt { width: 70mm; padding: 2mm; font-size: 11px; }
        h2 { margin: 0 0 8px; text-align:center; }
        .meta { margin: 0 0 10px; text-align:center; color:#4b5563; }
        table { width:100%; border-collapse: collapse; }
        th, td { border:1px solid #d1d5db; padding:6px; text-align:right; }
        .receipt th, .receipt td { border-bottom:1px dashed #9ca3af; border-left:0; border-right:0; border-top:0; padding:4px 2px; }
      </style>
    </head>
    <body class="${bodyClass}">
      <h2>${title}</h2>
      <div class="meta">دوره مالی: ${selectedFiscalYear.value?.Title || "-"} | انبار: ${selectedWarehouseTitle.value} | تاریخ چاپ: ${todayFa()}</div>
      ${tableHtml}
    </body>
    </html>`);
    win.document.close();
    window.setTimeout(() => {
        win.focus();
        win.print();
    }, 250);
}
function printStockReport(mode) {
    const rows = stockRows.value.map((r) => `
    <tr>
      <td>${r.GoodsCode}</td><td>${r.GoodsName}</td><td>${r.CurrentQuantity}</td><td>${r.PeriodInQuantity}</td><td>${r.PeriodOutQuantity}</td><td>${Number(r.InventoryValue).toLocaleString()}</td>
    </tr>`).join("");
    printHtml("گزارش موجودی انبار", `<table><thead><tr><th>کد</th><th>کالا</th><th>موجودی</th><th>ورود</th><th>خروج</th><th>ارزش</th></tr></thead><tbody>${rows}</tbody></table>`, mode);
}
function printKardexReport(mode) {
    const rows = kardexRows.value.map((r) => `
    <tr>
      <td>${r.DocumentDate}</td><td>${r.DocumentNumber}</td><td>${r.GoodsName}</td><td>${r.InQuantity}</td><td>${r.OutQuantity}</td><td>${r.BalanceAfter}</td>
    </tr>`).join("");
    printHtml("کاردکس کالا", `<table><thead><tr><th>تاریخ</th><th>سند</th><th>کالا</th><th>ورود</th><th>خروج</th><th>مانده</th></tr></thead><tbody>${rows}</tbody></table>`, mode);
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['inventory-header']} */ ;
/** @type {__VLS_StyleScopedClasses['inventory-header']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['inventory-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-message']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-card']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-card']} */ ;
/** @type {__VLS_StyleScopedClasses['inventory-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['inventory-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['inventory-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['two']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "inventory-tab" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "inventory-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadAll) },
    ...{ class: "inv-primary" },
    disabled: (__VLS_ctx.loading),
});
if (__VLS_ctx.message) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-message" },
    });
    (__VLS_ctx.message);
}
if (!__VLS_ctx.haveStockLicense) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-warning" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "inv-tabs" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeTab = 'settings';
        } },
    ...{ class: ({ active: __VLS_ctx.activeTab === 'settings' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeTab = 'documents';
        } },
    ...{ class: ({ active: __VLS_ctx.activeTab === 'documents' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeTab = 'reports';
        } },
    ...{ class: ({ active: __VLS_ctx.activeTab === 'reports' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeTab = 'kardex';
        } },
    ...{ class: ({ active: __VLS_ctx.activeTab === 'kardex' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.openStockTaking) },
    ...{ class: ({ active: __VLS_ctx.activeTab === 'stocktaking' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeTab = 'suppliers';
        } },
    ...{ class: ({ active: __VLS_ctx.activeTab === 'suppliers' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadHistory) },
    ...{ class: ({ active: __VLS_ctx.activeTab === 'history' }) },
});
if (__VLS_ctx.activeTab === 'settings') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-grid two" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "checkbox",
    });
    (__VLS_ctx.settings.IsWarehouseEnabled);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "checkbox",
    });
    (__VLS_ctx.settings.AllowNegativeStockSale);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "checkbox",
    });
    (__VLS_ctx.settings.AutoCreateStockReceiptFromPurchaseInvoice);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "checkbox",
    });
    (__VLS_ctx.settings.AutoCreateStockIssueFromSaleInvoice);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "checkbox",
    });
    (__VLS_ctx.settings.EnableStockTaking);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.settings.InventoryValuationMethod),
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.valuationMethods))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (item.id),
            value: (item.id),
        });
        (item.title);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.saveSettings) },
        ...{ class: "inv-primary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-form-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "کد انبار",
    });
    (__VLS_ctx.warehouseForm.WarehouseCode);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "عنوان انبار",
    });
    (__VLS_ctx.warehouseForm.WarehouseTitle);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "توضیحات",
    });
    (__VLS_ctx.warehouseForm.Description);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "checkbox",
    });
    (__VLS_ctx.warehouseForm.IsActive);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "checkbox",
    });
    (__VLS_ctx.warehouseForm.IsDefault);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.submitWarehouse) },
        ...{ class: "inv-primary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [w] of __VLS_getVForSourceType((__VLS_ctx.warehouses))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (w.WarehouseId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (w.WarehouseCode);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (w.WarehouseTitle);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (w.IsDefault ? 'بله' : '-');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeTab === 'settings'))
                        return;
                    __VLS_ctx.editWarehouse(w);
                } },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-card wide" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "جستجوی کالا",
    });
    (__VLS_ctx.goodsSearch);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-table-wrap" },
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [g] of __VLS_getVForSourceType((__VLS_ctx.filteredGoods))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (g.GoodsId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (g.GoodsCode);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (g.GoodsName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "number",
        });
        (g.MinStock);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "number",
        });
        (g.MaxStock);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "number",
        });
        (g.ReorderPoint);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (g.DefaultWarehouseId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (null),
        });
        for (const [w] of __VLS_getVForSourceType((__VLS_ctx.warehouses))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (w.WarehouseId),
                value: (w.WarehouseId),
            });
            (w.WarehouseTitle);
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.saveLimits) },
        ...{ class: "inv-primary" },
    });
}
if (__VLS_ctx.activeTab === 'documents') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-form-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.documentForm.DocumentType),
    });
    for (const [t] of __VLS_getVForSourceType((__VLS_ctx.documentTypes))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (t.id),
            value: (t.id),
        });
        (t.title);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "شماره سند؛ خالی یعنی خودکار",
    });
    (__VLS_ctx.documentForm.DocumentNumber);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "تاریخ",
        'data-jdp': true,
    });
    (__VLS_ctx.documentForm.DocumentDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.documentForm.WarehouseId),
    });
    for (const [w] of __VLS_getVForSourceType((__VLS_ctx.warehouses))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (w.WarehouseId),
            value: (w.WarehouseId),
        });
        (w.WarehouseTitle);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (__VLS_ctx.onSupplierChange) },
        value: (__VLS_ctx.documentForm.PersonId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (0),
    });
    for (const [s] of __VLS_getVForSourceType((__VLS_ctx.suppliers.filter(x => x.IsActive)))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (s.SupplierId),
            value: (s.SupplierId),
        });
        (s.SupplierTitle);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "تأمین‌کننده/شخص",
    });
    (__VLS_ctx.documentForm.PersonTitle);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "توضیحات",
    });
    (__VLS_ctx.documentForm.Description);
    if (Number(__VLS_ctx.documentForm.DocumentType) === 3) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "inv-form-grid" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "number",
            placeholder: "مبلغ خرید",
        });
        (__VLS_ctx.documentForm.PurchaseAmount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "number",
            placeholder: "مبلغ پرداختی",
        });
        (__VLS_ctx.documentForm.PaidAmount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "شرح پرداخت / حساب تامین‌کننده",
        });
        (__VLS_ctx.documentForm.PaymentDescription);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-table-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [item, index] of __VLS_getVForSourceType((__VLS_ctx.documentItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (index),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (item.GoodsId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (0),
        });
        for (const [g] of __VLS_getVForSourceType((__VLS_ctx.goods))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (g.GoodsId),
                value: (g.GoodsId),
            });
            (g.GoodsCode);
            (g.GoodsName);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "number",
        });
        (item.Quantity);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "number",
        });
        (item.UnitPrice);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({});
        (item.Description);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeTab === 'documents'))
                        return;
                    __VLS_ctx.removeDocumentItem(index);
                } },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.addDocumentItem) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.submitDocument) },
        ...{ class: "inv-primary" },
    });
}
if (__VLS_ctx.activeTab === 'reports') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-form-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.reportFilter.FiscalYearId),
    });
    for (const [f] of __VLS_getVForSourceType((__VLS_ctx.fiscalYears))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (f.FiscalYearId),
            value: (f.FiscalYearId),
        });
        (f.Title);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.reportFilter.WarehouseId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (0),
    });
    for (const [w] of __VLS_getVForSourceType((__VLS_ctx.warehouses))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (w.WarehouseId),
            value: (w.WarehouseId),
        });
        (w.WarehouseTitle);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "از تاریخ",
        'data-jdp': true,
    });
    (__VLS_ctx.reportFilter.FromDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "تا تاریخ",
        'data-jdp': true,
    });
    (__VLS_ctx.reportFilter.ToDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.loadStock) },
        ...{ class: "inv-primary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.exportStockCsv) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeTab === 'reports'))
                    return;
                __VLS_ctx.printStockReport('a4');
            } },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeTab === 'reports'))
                    return;
                __VLS_ctx.printStockReport('a5');
            } },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeTab === 'reports'))
                    return;
                __VLS_ctx.printStockReport('receipt');
            } },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.rebuildBalances) },
        ...{ class: "inv-danger" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-table-wrap" },
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [r] of __VLS_getVForSourceType((__VLS_ctx.stockRows))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (r.GoodsId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (r.GoodsCode);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (r.GoodsName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (r.CurrentQuantity);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (r.PeriodInQuantity);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (r.PeriodOutQuantity);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (Number(r.InventoryValue).toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (Number(r.LastPurchasePrice).toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (Number(r.AveragePrice).toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (r.MinStock);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (r.MaxStock);
    }
}
if (__VLS_ctx.activeTab === 'kardex') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-form-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.reportFilter.FiscalYearId),
    });
    for (const [f] of __VLS_getVForSourceType((__VLS_ctx.fiscalYears))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (f.FiscalYearId),
            value: (f.FiscalYearId),
        });
        (f.Title);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.reportFilter.WarehouseId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (0),
    });
    for (const [w] of __VLS_getVForSourceType((__VLS_ctx.warehouses))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (w.WarehouseId),
            value: (w.WarehouseId),
        });
        (w.WarehouseTitle);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.reportFilter.GoodsId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (0),
    });
    for (const [g] of __VLS_getVForSourceType((__VLS_ctx.goods))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (g.GoodsId),
            value: (g.GoodsId),
        });
        (g.GoodsCode);
        (g.GoodsName);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "از تاریخ",
        'data-jdp': true,
    });
    (__VLS_ctx.reportFilter.FromDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "تا تاریخ",
        'data-jdp': true,
    });
    (__VLS_ctx.reportFilter.ToDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.loadKardex) },
        ...{ class: "inv-primary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeTab === 'kardex'))
                    return;
                __VLS_ctx.printKardexReport('a4');
            } },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeTab === 'kardex'))
                    return;
                __VLS_ctx.printKardexReport('a5');
            } },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeTab === 'kardex'))
                    return;
                __VLS_ctx.printKardexReport('receipt');
            } },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-table-wrap" },
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [r] of __VLS_getVForSourceType((__VLS_ctx.kardexRows))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (r.LedgerId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (r.DocumentDate);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (r.DocumentNumber);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (r.WarehouseTitle);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (r.GoodsName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (r.InQuantity);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (r.OutQuantity);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (r.BalanceAfter);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (Number(r.UnitPrice).toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (Number(r.Amount).toLocaleString());
    }
}
if (__VLS_ctx.activeTab === 'stocktaking') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-card stocktaking-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-warning" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-form-grid stocktaking-filter" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.reportFilter.FiscalYearId),
    });
    for (const [f] of __VLS_getVForSourceType((__VLS_ctx.fiscalYears))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (f.FiscalYearId),
            value: (f.FiscalYearId),
        });
        (f.Title);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (__VLS_ctx.prepareStockTaking) },
        value: (__VLS_ctx.reportFilter.WarehouseId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (0),
    });
    for (const [w] of __VLS_getVForSourceType((__VLS_ctx.warehouses))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (w.WarehouseId),
            value: (w.WarehouseId),
        });
        (w.WarehouseTitle);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.prepareStockTaking) },
        ...{ class: "inv-primary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.applyStockTaking) },
        ...{ class: "inv-danger" },
    });
    if (!__VLS_ctx.stockTakingRows.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "inv-warning" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "inv-table-wrap" },
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [r] of __VLS_getVForSourceType((__VLS_ctx.stockTakingRows))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (r.GoodsId),
                ...{ class: ({ diff: Number(r.DifferenceQuantity) !== 0 }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (r.GoodsCode);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (r.GoodsName);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (r.CurrentQuantity);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                ...{ onInput: (...[$event]) => {
                        if (!(__VLS_ctx.activeTab === 'stocktaking'))
                            return;
                        if (!!(!__VLS_ctx.stockTakingRows.length))
                            return;
                        __VLS_ctx.updateStockTakingDiff(r);
                    } },
                type: "number",
            });
            (r.RealQuantity);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (r.DifferenceQuantity);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (Number(r.LastPurchasePrice || r.AveragePrice || 0).toLocaleString());
        }
    }
}
if (__VLS_ctx.activeTab === 'suppliers') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-form-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "کد تأمین‌کننده",
    });
    (__VLS_ctx.supplierForm.SupplierCode);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "نام تأمین‌کننده",
    });
    (__VLS_ctx.supplierForm.SupplierTitle);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "تلفن",
    });
    (__VLS_ctx.supplierForm.Phone);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "آدرس",
    });
    (__VLS_ctx.supplierForm.Address);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "توضیحات",
    });
    (__VLS_ctx.supplierForm.Description);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "checkbox",
    });
    (__VLS_ctx.supplierForm.IsActive);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.submitSupplier) },
        ...{ class: "inv-primary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-table-wrap" },
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
    for (const [s] of __VLS_getVForSourceType((__VLS_ctx.supplierBalanceRows))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (s.SupplierId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (s.SupplierCode);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (s.SupplierTitle);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (s.Phone);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (s.PurchaseAmount.toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (s.PaidAmount.toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (s.BalanceAmount.toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeTab === 'suppliers'))
                        return;
                    __VLS_ctx.editSupplier(s);
                } },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-table-wrap" },
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [row] of __VLS_getVForSourceType((__VLS_ctx.supplierLedger))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (`${row.SupplierId}-${row.DocumentNumber}-${row.DocumentDate}`),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (row.DocumentDate);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (row.SupplierTitle);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (row.DocumentNumber);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (row.PurchaseAmount.toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (row.PaidAmount.toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (row.BalanceAmount.toLocaleString());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (row.StatusTitle);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (row.Description);
    }
}
if (__VLS_ctx.activeTab === 'history') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-form-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "از تاریخ",
        'data-jdp': true,
    });
    (__VLS_ctx.historyFilter.FromDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "تا تاریخ",
        'data-jdp': true,
    });
    (__VLS_ctx.historyFilter.ToDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.loadHistory) },
        ...{ class: "inv-primary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-table-wrap" },
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [r] of __VLS_getVForSourceType((__VLS_ctx.filteredChangeLogRows))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (r.ChangeLogId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (r.ChangedAt);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (r.ChangedBy);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (r.DocumentType);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (r.DocumentNumber);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (r.ActionType);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (r.Description);
    }
}
/** @type {__VLS_StyleScopedClasses['inventory-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['inventory-header']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-message']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['two']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-card']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-card']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-form-row']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-card']} */ ;
/** @type {__VLS_StyleScopedClasses['wide']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-card']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-card']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-card']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stocktaking-card']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['stocktaking-filter']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['diff']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-card']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-card']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['inv-table-wrap']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            message: message,
            activeTab: activeTab,
            haveStockLicense: haveStockLicense,
            warehouses: warehouses,
            fiscalYears: fiscalYears,
            goods: goods,
            valuationMethods: valuationMethods,
            documentTypes: documentTypes,
            stockRows: stockRows,
            kardexRows: kardexRows,
            stockTakingRows: stockTakingRows,
            goodsSearch: goodsSearch,
            suppliers: suppliers,
            supplierLedger: supplierLedger,
            settings: settings,
            warehouseForm: warehouseForm,
            supplierForm: supplierForm,
            documentForm: documentForm,
            documentItems: documentItems,
            reportFilter: reportFilter,
            historyFilter: historyFilter,
            filteredGoods: filteredGoods,
            supplierBalanceRows: supplierBalanceRows,
            filteredChangeLogRows: filteredChangeLogRows,
            loadAll: loadAll,
            saveSettings: saveSettings,
            submitWarehouse: submitWarehouse,
            editWarehouse: editWarehouse,
            submitSupplier: submitSupplier,
            editSupplier: editSupplier,
            onSupplierChange: onSupplierChange,
            saveLimits: saveLimits,
            addDocumentItem: addDocumentItem,
            removeDocumentItem: removeDocumentItem,
            submitDocument: submitDocument,
            loadStock: loadStock,
            loadKardex: loadKardex,
            loadHistory: loadHistory,
            rebuildBalances: rebuildBalances,
            openStockTaking: openStockTaking,
            prepareStockTaking: prepareStockTaking,
            updateStockTakingDiff: updateStockTakingDiff,
            applyStockTaking: applyStockTaking,
            exportStockCsv: exportStockCsv,
            printStockReport: printStockReport,
            printKardexReport: printKardexReport,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
