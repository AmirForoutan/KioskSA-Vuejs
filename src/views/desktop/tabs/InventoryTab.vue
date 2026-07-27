<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  loadInventoryBootstrap,
  saveInventorySettings,
  saveWarehouse,
  saveGoodsLimits,
  saveInventoryDocument,
  loadStockReport,
  loadKardexReport,
  loadInventoryChangeLogs,
  rebuildInventoryBalances,
  type FiscalYear,
  type InventoryDocumentItem,
  type InventoryGoods,
  type InventorySettings,
  type InventoryStockReportRow,
  type InventoryKardexRow,
  type InventoryChangeLogRow,
  type Warehouse,
} from "../../../services/inventoryApi";

type StockTakingRow = InventoryStockReportRow & {
  RealQuantity: number;
  DifferenceQuantity: number;
};

const loading = ref(false);
const message = ref("");
const activeTab = ref<"settings" | "documents" | "reports" | "kardex" | "stocktaking" | "history">("settings");
const haveStockLicense = ref(false);
const warehouses = ref<Warehouse[]>([]);
const fiscalYears = ref<FiscalYear[]>([]);
const goods = ref<InventoryGoods[]>([]);
const valuationMethods = ref<{ id: number; title: string }[]>([]);
const documentTypes = ref<{ id: number; title: string }[]>([]);
const stockRows = ref<InventoryStockReportRow[]>([]);
const kardexRows = ref<InventoryKardexRow[]>([]);
const changeLogRows = ref<InventoryChangeLogRow[]>([]);
const stockTakingRows = ref<StockTakingRow[]>([]);
const goodsSearch = ref("");

const settings = reactive<InventorySettings>({
  IsWarehouseEnabled: true,
  AllowNegativeStockSale: false,
  InventoryValuationMethod: 2,
  AutoCreateStockReceiptFromPurchaseInvoice: true,
  AutoCreateStockIssueFromSaleInvoice: true,
  RequireWarehouseForSale: true,
  RequireWarehouseForPurchase: true,
  EnableStockTaking: true,
});

const warehouseForm = reactive<Partial<Warehouse>>({
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
  DocumentDate: todayFa(),
  FiscalYearId: 0,
  WarehouseId: 0,
  PersonTitle: "",
  Description: "",
});

const documentItems = ref<InventoryDocumentItem[]>([
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
  if (!q) return goods.value;
  return goods.value.filter((item) => `${item.GoodsCode} ${item.GoodsName}`.toLowerCase().includes(q));
});

const selectedFiscalYear = computed(() => fiscalYears.value.find((f) => f.FiscalYearId === Number(reportFilter.FiscalYearId)) || fiscalYears.value[0]);
const selectedWarehouseTitle = computed(() => warehouses.value.find((w) => w.WarehouseId === Number(reportFilter.WarehouseId))?.WarehouseTitle || "همه انبارها");

onMounted(loadAll);

function todayFa() {
  return new Date().toLocaleDateString("fa-IR-u-nu-latn").replace(/-/g, "/");
}

function showMessage(text: string) {
  message.value = text;
  window.setTimeout(() => {
    if (message.value === text) message.value = "";
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
  } catch (error) {
    showMessage(error instanceof Error ? error.message : "خطا در دریافت اطلاعات انبار");
  } finally {
    loading.value = false;
  }
}

async function saveSettings() {
  try {
    const result = await saveInventorySettings(settings);
    showMessage(result.message || "تنظیمات ذخیره شد");
  } catch (error) {
    showMessage(error instanceof Error ? error.message : "خطا در ذخیره تنظیمات");
  }
}

async function submitWarehouse() {
  try {
    const result = await saveWarehouse(warehouseForm);
    showMessage(result.message || "انبار ذخیره شد");
    Object.assign(warehouseForm, { WarehouseId: 0, WarehouseCode: "", WarehouseTitle: "", IsActive: true, IsDefault: false, Description: "" });
    await loadAll();
  } catch (error) {
    showMessage(error instanceof Error ? error.message : "خطا در ذخیره انبار");
  }
}

function editWarehouse(row: Warehouse) {
  Object.assign(warehouseForm, row);
}

async function saveLimits() {
  try {
    const result = await saveGoodsLimits(goods.value);
    showMessage(result.message || "محدوده موجودی کالاها ذخیره شد");
  } catch (error) {
    showMessage(error instanceof Error ? error.message : "خطا در ذخیره محدوده موجودی");
  }
}

function addDocumentItem() {
  documentItems.value.push({ GoodsId: 0, Quantity: 1, UnitPrice: 0, Description: "" });
}

function removeDocumentItem(index: number) {
  if (documentItems.value.length === 1) return;
  documentItems.value.splice(index, 1);
}

async function submitDocument() {
  try {
    const items = documentItems.value.filter((item) => Number(item.GoodsId) > 0 && Number(item.Quantity) > 0);
    const result = await saveInventoryDocument({ ...documentForm, Items: items });
    showMessage(result.message || "سند انبار ذخیره شد");
    documentForm.DocumentNumber = "";
    documentForm.PersonTitle = "";
    documentForm.Description = "";
    documentItems.value = [{ GoodsId: 0, Quantity: 1, UnitPrice: 0, Description: "" }];
    await loadStock();
  } catch (error) {
    showMessage(error instanceof Error ? error.message : "خطا در ذخیره سند انبار");
  }
}

async function loadStock() {
  try {
    const result = await loadStockReport(reportFilter);
    stockRows.value = result.rows || [];
    activeTab.value = "reports";
  } catch (error) {
    showMessage(error instanceof Error ? error.message : "خطا در گزارش موجودی");
  }
}

async function loadKardex() {
  try {
    const result = await loadKardexReport(reportFilter);
    kardexRows.value = result.rows || [];
    activeTab.value = "kardex";
  } catch (error) {
    showMessage(error instanceof Error ? error.message : "خطا در کاردکس کالا");
  }
}

async function loadHistory() {
  try {
    const result = await loadInventoryChangeLogs();
    changeLogRows.value = result.rows || [];
    activeTab.value = "history";
  } catch (error) {
    showMessage(error instanceof Error ? error.message : "خطا در دریافت سابقه تغییرات");
  }
}

async function rebuildBalances() {
  try {
    const result = await rebuildInventoryBalances(reportFilter.FiscalYearId || selectedFiscalYear.value?.FiscalYearId);
    showMessage(result.message || "بازسازی موجودی انجام شد");
    await loadStock();
  } catch (error) {
    showMessage(error instanceof Error ? error.message : "خطا در بازسازی موجودی");
  }
}

async function prepareStockTaking() {
  if (!settings.EnableStockTaking) {
    showMessage("انبارگردانی در تنظیمات غیرفعال است");
    return;
  }
  if (!Number(reportFilter.WarehouseId)) {
    showMessage("برای انبارگردانی باید یک انبار مشخص انتخاب کنید");
    return;
  }

  const result = await loadStockReport({ ...reportFilter, FromDate: "", ToDate: "" });
  stockTakingRows.value = (result.rows || []).map((row) => ({
    ...row,
    RealQuantity: Number(row.CurrentQuantity || 0),
    DifferenceQuantity: 0,
  }));
  activeTab.value = "stocktaking";
}

function updateStockTakingDiff(row: StockTakingRow) {
  row.DifferenceQuantity = Number(row.RealQuantity || 0) - Number(row.CurrentQuantity || 0);
}

async function applyStockTaking() {
  if (!Number(reportFilter.WarehouseId)) {
    showMessage("برای ثبت انبارگردانی باید انبار مشخص باشد");
    return;
  }

  const increases = stockTakingRows.value
    .filter((row) => Number(row.DifferenceQuantity) > 0)
    .map((row) => ({
      GoodsId: row.GoodsId,
      Quantity: Number(row.DifferenceQuantity),
      UnitPrice: Number(row.LastPurchasePrice || row.AveragePrice || 0),
      Description: `انبارگردانی - موجودی سیستمی ${row.CurrentQuantity} / موجودی واقعی ${row.RealQuantity}`,
    }));

  const decreases = stockTakingRows.value
    .filter((row) => Number(row.DifferenceQuantity) < 0)
    .map((row) => ({
      GoodsId: row.GoodsId,
      Quantity: Math.abs(Number(row.DifferenceQuantity)),
      UnitPrice: Number(row.LastPurchasePrice || row.AveragePrice || 0),
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
    await rebuildBalances();
    await prepareStockTaking();
  } catch (error) {
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

function printHtml(title: string, tableHtml: string, mode: "a4" | "a5" | "receipt") {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
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

function printStockReport(mode: "a4" | "a5" | "receipt") {
  const rows = stockRows.value.map((r) => `
    <tr>
      <td>${r.GoodsCode}</td><td>${r.GoodsName}</td><td>${r.CurrentQuantity}</td><td>${r.PeriodInQuantity}</td><td>${r.PeriodOutQuantity}</td><td>${Number(r.InventoryValue).toLocaleString()}</td>
    </tr>`).join("");
  printHtml("گزارش موجودی انبار", `<table><thead><tr><th>کد</th><th>کالا</th><th>موجودی</th><th>ورود</th><th>خروج</th><th>ارزش</th></tr></thead><tbody>${rows}</tbody></table>`, mode);
}

function printKardexReport(mode: "a4" | "a5" | "receipt") {
  const rows = kardexRows.value.map((r) => `
    <tr>
      <td>${r.DocumentDate}</td><td>${r.DocumentNumber}</td><td>${r.GoodsName}</td><td>${r.InQuantity}</td><td>${r.OutQuantity}</td><td>${r.BalanceAfter}</td>
    </tr>`).join("");
  printHtml("کاردکس کالا", `<table><thead><tr><th>تاریخ</th><th>سند</th><th>کالا</th><th>ورود</th><th>خروج</th><th>مانده</th></tr></thead><tbody>${rows}</tbody></table>`, mode);
}
</script>

<template>
  <section class="inventory-tab">
    <header class="inventory-header">
      <div>
        <h2>انبار</h2>
        <p>فاکتور خرید، رسید ورود و خروج، اصلاح موجودی، انبارگردانی، گزارش موجودی و کاردکس کالا</p>
      </div>
      <button class="inv-primary" @click="loadAll" :disabled="loading">بروزرسانی</button>
    </header>

    <div v-if="message" class="inv-message">{{ message }}</div>
    <div v-if="!haveStockLicense" class="inv-warning">لایسنس انبار برای این سیستم فعال نیست.</div>

    <nav class="inv-tabs">
      <button :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">تنظیمات و کالاها</button>
      <button :class="{ active: activeTab === 'documents' }" @click="activeTab = 'documents'">اسناد انبار</button>
      <button :class="{ active: activeTab === 'reports' }" @click="activeTab = 'reports'">گزارش موجودی</button>
      <button :class="{ active: activeTab === 'kardex' }" @click="activeTab = 'kardex'">کاردکس کالا</button>
      <button :class="{ active: activeTab === 'stocktaking' }" @click="prepareStockTaking">انبارگردانی</button>
      <button :class="{ active: activeTab === 'history' }" @click="loadHistory">سابقه تغییرات</button>
    </nav>

    <div v-if="activeTab === 'settings'" class="inv-grid two">
      <div class="inv-card">
        <h3>تنظیمات انبار</h3>
        <label><input type="checkbox" v-model="settings.IsWarehouseEnabled" /> انبار فعال باشد</label>
        <label><input type="checkbox" v-model="settings.AllowNegativeStockSale" /> اجازه ثبت فاکتور با موجودی منفی</label>
        <label><input type="checkbox" v-model="settings.AutoCreateStockReceiptFromPurchaseInvoice" /> ایجاد رسید ورود از فاکتور خرید</label>
        <label><input type="checkbox" v-model="settings.AutoCreateStockIssueFromSaleInvoice" /> ایجاد خروج انبار از فروش</label>
        <label><input type="checkbox" v-model="settings.EnableStockTaking" /> انبارگردانی فعال باشد</label>
        <label>روش ارزش‌گذاری موجودی</label>
        <select v-model.number="settings.InventoryValuationMethod">
          <option v-for="item in valuationMethods" :key="item.id" :value="item.id">{{ item.title }}</option>
        </select>
        <button class="inv-primary" @click="saveSettings">ذخیره تنظیمات</button>
      </div>

      <div class="inv-card">
        <h3>انبارها</h3>
        <div class="inv-form-row">
          <input v-model="warehouseForm.WarehouseCode" placeholder="کد انبار" />
          <input v-model="warehouseForm.WarehouseTitle" placeholder="عنوان انبار" />
        </div>
        <input v-model="warehouseForm.Description" placeholder="توضیحات" />
        <label><input type="checkbox" v-model="warehouseForm.IsActive" /> فعال</label>
        <label><input type="checkbox" v-model="warehouseForm.IsDefault" /> انبار پیش‌فرض</label>
        <button class="inv-primary" @click="submitWarehouse">ذخیره انبار</button>
        <table>
          <thead><tr><th>کد</th><th>عنوان</th><th>پیش‌فرض</th><th></th></tr></thead>
          <tbody>
            <tr v-for="w in warehouses" :key="w.WarehouseId">
              <td>{{ w.WarehouseCode }}</td><td>{{ w.WarehouseTitle }}</td><td>{{ w.IsDefault ? 'بله' : '-' }}</td>
              <td><button @click="editWarehouse(w)">ویرایش</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="inv-card wide">
        <h3>حداقل، حداکثر و نقطه سفارش کالاها</h3>
        <input v-model="goodsSearch" placeholder="جستجوی کالا" />
        <div class="inv-table-wrap">
          <table>
            <thead><tr><th>کد</th><th>نام کالا</th><th>حداقل</th><th>حداکثر</th><th>نقطه سفارش</th><th>انبار پیش‌فرض</th></tr></thead>
            <tbody>
              <tr v-for="g in filteredGoods" :key="g.GoodsId">
                <td>{{ g.GoodsCode }}</td>
                <td>{{ g.GoodsName }}</td>
                <td><input type="number" v-model.number="g.MinStock" /></td>
                <td><input type="number" v-model.number="g.MaxStock" /></td>
                <td><input type="number" v-model.number="g.ReorderPoint" /></td>
                <td>
                  <select v-model.number="g.DefaultWarehouseId">
                    <option :value="null">پیش‌فرض سیستم</option>
                    <option v-for="w in warehouses" :key="w.WarehouseId" :value="w.WarehouseId">{{ w.WarehouseTitle }}</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <button class="inv-primary" @click="saveLimits">ذخیره محدوده موجودی کالاها</button>
      </div>
    </div>

    <div v-if="activeTab === 'documents'" class="inv-card">
      <h3>ثبت سند انبار</h3>
      <div class="inv-form-grid">
        <select v-model.number="documentForm.DocumentType"><option v-for="t in documentTypes" :key="t.id" :value="t.id">{{ t.title }}</option></select>
        <input v-model="documentForm.DocumentNumber" placeholder="شماره سند؛ خالی یعنی خودکار" />
        <input v-model="documentForm.DocumentDate" placeholder="تاریخ" />
        <select v-model.number="documentForm.WarehouseId"><option v-for="w in warehouses" :key="w.WarehouseId" :value="w.WarehouseId">{{ w.WarehouseTitle }}</option></select>
        <input v-model="documentForm.PersonTitle" placeholder="تامین‌کننده/شخص" />
        <input v-model="documentForm.Description" placeholder="توضیحات" />
      </div>
      <div class="inv-table-wrap">
        <table>
          <thead><tr><th>کالا</th><th>تعداد</th><th>قیمت واحد</th><th>توضیح</th><th></th></tr></thead>
          <tbody>
            <tr v-for="(item, index) in documentItems" :key="index">
              <td><select v-model.number="item.GoodsId"><option :value="0">انتخاب کالا</option><option v-for="g in goods" :key="g.GoodsId" :value="g.GoodsId">{{ g.GoodsCode }} - {{ g.GoodsName }}</option></select></td>
              <td><input type="number" v-model.number="item.Quantity" /></td>
              <td><input type="number" v-model.number="item.UnitPrice" /></td>
              <td><input v-model="item.Description" /></td>
              <td><button @click="removeDocumentItem(index)">حذف</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <button @click="addDocumentItem">افزودن قلم</button>
      <button class="inv-primary" @click="submitDocument">ثبت سند</button>
    </div>

    <div v-if="activeTab === 'reports'" class="inv-card">
      <h3>گزارش موجودی</h3>
      <div class="inv-form-grid">
        <select v-model.number="reportFilter.FiscalYearId"><option v-for="f in fiscalYears" :key="f.FiscalYearId" :value="f.FiscalYearId">{{ f.Title }}</option></select>
        <select v-model.number="reportFilter.WarehouseId"><option :value="0">همه انبارها</option><option v-for="w in warehouses" :key="w.WarehouseId" :value="w.WarehouseId">{{ w.WarehouseTitle }}</option></select>
        <input v-model="reportFilter.FromDate" placeholder="از تاریخ" />
        <input v-model="reportFilter.ToDate" placeholder="تا تاریخ" />
      </div>
      <button class="inv-primary" @click="loadStock">نمایش گزارش</button>
      <button @click="exportStockCsv">خروجی اکسل/CSV</button>
      <button @click="printStockReport('a4')">چاپ A4</button>
      <button @click="printStockReport('a5')">چاپ A5</button>
      <button @click="printStockReport('receipt')">چاپ فیش ۷ سانت</button>
      <button class="inv-danger" @click="rebuildBalances">بازسازی موجودی از کاردکس</button>
      <div class="inv-table-wrap">
        <table>
          <thead><tr><th>کد</th><th>کالا</th><th>موجودی حال حاضر</th><th>ورود بازه</th><th>خروج بازه</th><th>ارزش</th><th>آخرین خرید</th><th>میانگین</th><th>حداقل</th><th>حداکثر</th></tr></thead>
          <tbody>
            <tr v-for="r in stockRows" :key="r.GoodsId">
              <td>{{ r.GoodsCode }}</td><td>{{ r.GoodsName }}</td><td>{{ r.CurrentQuantity }}</td><td>{{ r.PeriodInQuantity }}</td><td>{{ r.PeriodOutQuantity }}</td><td>{{ Number(r.InventoryValue).toLocaleString() }}</td><td>{{ Number(r.LastPurchasePrice).toLocaleString() }}</td><td>{{ Number(r.AveragePrice).toLocaleString() }}</td><td>{{ r.MinStock }}</td><td>{{ r.MaxStock }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="activeTab === 'kardex'" class="inv-card">
      <h3>کاردکس کالا</h3>
      <div class="inv-form-grid">
        <select v-model.number="reportFilter.FiscalYearId"><option v-for="f in fiscalYears" :key="f.FiscalYearId" :value="f.FiscalYearId">{{ f.Title }}</option></select>
        <select v-model.number="reportFilter.WarehouseId"><option :value="0">همه انبارها</option><option v-for="w in warehouses" :key="w.WarehouseId" :value="w.WarehouseId">{{ w.WarehouseTitle }}</option></select>
        <select v-model.number="reportFilter.GoodsId"><option :value="0">همه کالاها</option><option v-for="g in goods" :key="g.GoodsId" :value="g.GoodsId">{{ g.GoodsCode }} - {{ g.GoodsName }}</option></select>
      </div>
      <button class="inv-primary" @click="loadKardex">نمایش کاردکس</button>
      <button @click="printKardexReport('a4')">چاپ A4</button>
      <button @click="printKardexReport('a5')">چاپ A5</button>
      <button @click="printKardexReport('receipt')">چاپ فیش ۷ سانت</button>
      <div class="inv-table-wrap">
        <table>
          <thead><tr><th>تاریخ</th><th>سند</th><th>انبار</th><th>کالا</th><th>ورود</th><th>خروج</th><th>مانده</th><th>قیمت</th><th>مبلغ</th></tr></thead>
          <tbody>
            <tr v-for="r in kardexRows" :key="r.LedgerId">
              <td>{{ r.DocumentDate }}</td><td>{{ r.DocumentNumber }}</td><td>{{ r.WarehouseTitle }}</td><td>{{ r.GoodsName }}</td><td>{{ r.InQuantity }}</td><td>{{ r.OutQuantity }}</td><td>{{ r.BalanceAfter }}</td><td>{{ Number(r.UnitPrice).toLocaleString() }}</td><td>{{ Number(r.Amount).toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="activeTab === 'stocktaking'" class="inv-card">
      <h3>انبارگردانی</h3>
      <div class="inv-warning">برای انبارگردانی، یک انبار مشخص انتخاب کنید، سپس موجودی واقعی را وارد کنید. سیستم اختلاف را به سند اصلاحی ورود یا خروج تبدیل می‌کند.</div>
      <div class="inv-form-grid">
        <select v-model.number="reportFilter.FiscalYearId"><option v-for="f in fiscalYears" :key="f.FiscalYearId" :value="f.FiscalYearId">{{ f.Title }}</option></select>
        <select v-model.number="reportFilter.WarehouseId"><option :value="0">انتخاب انبار</option><option v-for="w in warehouses" :key="w.WarehouseId" :value="w.WarehouseId">{{ w.WarehouseTitle }}</option></select>
      </div>
      <button class="inv-primary" @click="prepareStockTaking">بارگذاری موجودی سیستم</button>
      <button class="inv-danger" @click="applyStockTaking">ثبت اختلاف انبارگردانی</button>
      <div class="inv-table-wrap">
        <table>
          <thead><tr><th>کد</th><th>کالا</th><th>موجودی سیستم</th><th>موجودی واقعی</th><th>اختلاف</th><th>آخرین خرید</th></tr></thead>
          <tbody>
            <tr v-for="r in stockTakingRows" :key="r.GoodsId" :class="{ diff: Number(r.DifferenceQuantity) !== 0 }">
              <td>{{ r.GoodsCode }}</td>
              <td>{{ r.GoodsName }}</td>
              <td>{{ r.CurrentQuantity }}</td>
              <td><input type="number" v-model.number="r.RealQuantity" @input="updateStockTakingDiff(r)" /></td>
              <td>{{ r.DifferenceQuantity }}</td>
              <td>{{ Number(r.LastPurchasePrice || r.AveragePrice || 0).toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="activeTab === 'history'" class="inv-card">
      <h3>سابقه تغییرات رسیدها و فاکتورهای انبار</h3>
      <button class="inv-primary" @click="loadHistory">بروزرسانی سابقه</button>
      <div class="inv-table-wrap">
        <table>
          <thead><tr><th>زمان</th><th>کاربر</th><th>نوع سند</th><th>شماره سند</th><th>عملیات</th><th>شرح</th></tr></thead>
          <tbody>
            <tr v-for="r in changeLogRows" :key="r.ChangeLogId">
              <td>{{ r.ChangedAt }}</td><td>{{ r.ChangedBy }}</td><td>{{ r.DocumentType }}</td><td>{{ r.DocumentNumber }}</td><td>{{ r.ActionType }}</td><td>{{ r.Description }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.inventory-tab { direction: rtl; color: #e5e7eb; height: 100%; overflow: auto; }
.inventory-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.inventory-header h2 { margin: 0; font-size: 24px; }
.inventory-header p { margin: 4px 0 0; color: #94a3b8; }
.inv-tabs { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.inv-tabs button, .inventory-tab button { border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.05); color: #e5e7eb; border-radius: 10px; padding: 9px 12px; cursor: pointer; margin: 3px; }
.inv-tabs button.active, .inv-primary { background: rgba(20,184,166,.18) !important; border-color: rgba(20,184,166,.45) !important; color: #ccfbf1 !important; }
.inv-danger { background: rgba(239,68,68,.16) !important; border-color: rgba(239,68,68,.35) !important; color: #fecaca !important; }
.inv-message, .inv-warning { padding: 10px 12px; border-radius: 12px; margin-bottom: 10px; }
.inv-message { background: rgba(59,130,246,.14); border: 1px solid rgba(59,130,246,.28); }
.inv-warning { background: rgba(245,158,11,.14); border: 1px solid rgba(245,158,11,.3); color: #fde68a; }
.inv-grid.two { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; }
.inv-card { background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.08); border-radius: 16px; padding: 14px; margin-bottom: 12px; }
.inv-card.wide { grid-column: 1 / -1; }
.inv-card h3 { margin: 0 0 12px; }
.inv-form-row, .inv-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; margin-bottom: 10px; }
.inventory-tab input, .inventory-tab select { width: 100%; min-height: 38px; border-radius: 10px; border: 1px solid rgba(255,255,255,.1); background: #111827; color: #e5e7eb; padding: 7px 9px; box-sizing: border-box; }
.inventory-tab label { display: block; margin: 8px 0; color: #d1d5db; }
.inv-table-wrap { max-height: 420px; overflow: auto; border-radius: 12px; border: 1px solid rgba(255,255,255,.08); margin-top: 10px; }
table { width: 100%; border-collapse: collapse; min-width: 820px; }
th, td { padding: 9px 10px; border-bottom: 1px solid rgba(255,255,255,.07); text-align: right; }
th { position: sticky; top: 0; background: #151b27; z-index: 1; color: #cbd5e1; }
tr.diff { background: rgba(245,158,11,.1); }
@media (max-width: 900px) { .inv-grid.two { grid-template-columns: 1fr; } }
</style>