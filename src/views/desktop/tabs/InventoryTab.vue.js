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
const goodsSearch = ref("");
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
const documentForm = reactive({
    DocumentId: 0,
    DocumentType: 1,
    DocumentNumber: "",
    DocumentDate: new Date().toLocaleDateString("fa-IR-u-nu-latn").replace(/-/g, "/"),
    FiscalYearId: 0,
    WarehouseId: 0,
    PersonTitle: "",
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
const filteredGoods = computed(() => {
    const q = goodsSearch.value.trim().toLowerCase();
    if (!q)
        return goods.value;
    return goods.value.filter((item) => `${item.GoodsCode} ${item.GoodsName}`.toLowerCase().includes(q));
});
const selectedFiscalYear = computed(() => fiscalYears.value.find((f) => f.FiscalYearId === Number(reportFilter.FiscalYearId)) || fiscalYears.value[0]);
onMounted(loadAll);
function showMessage(text) {
    message.value = text;
    window.setTimeout(() => {
        if (message.value === text)
            message.value = "";
    }, 3500);
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
        documentForm.WarehouseId = warehouses.value.find((w) => w.IsDefault)?.WarehouseId || warehouses.value[0]?.WarehouseId || 0;
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
        const result = await saveInventoryDocument({
            ...documentForm,
            Items: items,
        });
        showMessage(result.message || "سند انبار ذخیره شد");
        documentForm.DocumentNumber = "";
        documentForm.PersonTitle = "";
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
        kardexRows.value = result.rows || [];
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
function exportStockCsv() {
    const header = ["کد کالا", "نام کالا", "موجودی حال حاضر", "ورود بازه", "خروج بازه", "ارزش موجودی", "آخرین خرید", "میانگین", "حداقل", "حداکثر"];
    const lines = stockRows.value.map((r) => [r.GoodsCode, r.GoodsName, r.CurrentQuantity, r.PeriodInQuantity, r.PeriodOutQuantity, r.InventoryValue, r.LastPurchasePrice, r.AveragePrice, r.MinStock, r.MaxStock].join(","));
    const blob = new Blob(["\ufeff" + [header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "inventory-stock-report.csv";
    a.click();
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "تامین‌کننده/شخص",
    });
    (__VLS_ctx.documentForm.PersonTitle);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "توضیحات",
    });
    (__VLS_ctx.documentForm.Description);
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
    });
    (__VLS_ctx.reportFilter.FromDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "تا تاریخ",
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.loadKardex) },
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
if (__VLS_ctx.activeTab === 'history') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inv-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
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
    for (const [r] of __VLS_getVForSourceType((__VLS_ctx.changeLogRows))) {
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
            changeLogRows: changeLogRows,
            goodsSearch: goodsSearch,
            settings: settings,
            warehouseForm: warehouseForm,
            documentForm: documentForm,
            documentItems: documentItems,
            reportFilter: reportFilter,
            filteredGoods: filteredGoods,
            loadAll: loadAll,
            saveSettings: saveSettings,
            submitWarehouse: submitWarehouse,
            editWarehouse: editWarehouse,
            saveLimits: saveLimits,
            addDocumentItem: addDocumentItem,
            removeDocumentItem: removeDocumentItem,
            submitDocument: submitDocument,
            loadStock: loadStock,
            loadKardex: loadKardex,
            loadHistory: loadHistory,
            rebuildBalances: rebuildBalances,
            exportStockCsv: exportStockCsv,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
