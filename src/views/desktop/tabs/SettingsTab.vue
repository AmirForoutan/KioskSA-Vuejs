<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { can } from "../../../components/acl/can";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import {
  deleteDesktopPosSetting,
  deleteDesktopPrinterSetting,
  fetchRuntimeConfig,
  loadDesktopDeviceSettings,
  saveDesktopSettings,
  saveDesktopPosSetting,
  saveDesktopPrinterSetting,
  testDesktopService,
  type DesktopDeviceSettings,
  type DesktopPosSetting,
  type DesktopPrinterSetting,
  type DesktopSettings,
} from "../../../services/desktopApi";

type ToggleKey =
  | "Currency"
  | "kioskOrder"
  | "scaleOrder"
  | "IsClub"
  | "IsSalon"
  | "IsTakeAway"
  | "showTables"
  | "TableSelectionRequired"
  | "KeepSalonTableOpenAfterSubmit"
  | "ShowKioskOrderTypeSelector"
  | "IsCollapseCart"
  | "ScaleAutoPay"
  | "IsMultiInvoice"
  | "showOrderRegistration"
  | "showDiscountCart"
  | "ShowStandByVideo"
  | "ShowKeyBoard";

const defaults: DesktopSettings = {
  Currency: false,
  kioskOrder: true,
  scaleOrder: false,
  IsClub: false,
  IsSalon: true,
  IsTakeAway: false,
  showTables: false,
  TableSelectionRequired: false,
  KeepSalonTableOpenAfterSubmit: false,
  ShowKioskOrderTypeSelector: false,
  IsCollapseCart: false,
  ScaleAutoPay: false,
  IsMultiInvoice: false,
  showOrderRegistration: true,
  showDiscountCart: false,
  ShowStandByVideo: false,
  ShowKeyBoard: false,
  StandByTimer: 10,
  ResetTimer: 1,
  viewMode: 3,
  ServiceAddress: "http://localhost:5005",
  ServiceAPIAddress: "http://localhost:5005",
};

const settings = ref<DesktopSettings>({ ...defaults });
const emptyDevices: DesktopDeviceSettings = {
  currentComputerName: "",
  currentComputerId: 0,
  computers: [],
  windowsPrinters: [],
  printTemplates: [],
  printUsageTypes: [],
  printerSettings: [],
  posTypes: [],
  posSettings: [],
};

const devices = ref<DesktopDeviceSettings>({ ...emptyDevices });
const printerForm = ref<DesktopPrinterSetting>({
  PrinterId: 0,
  PrinterTitle: "",
  ComputerId: 0,
  PrinterName: "",
  PrintTemplateId: 0,
  Copies: 1,
  PrintUsageType: 0,
  IsActive: true,
});
const posForm = ref<DesktopPosSetting>({
  PosSettingId: 0,
  ComputerId: 0,
  PosType: 1,
  IpAddress: "",
  Port: 0,
  IsActive: true,
  IsTestMode: false,
});
const loading = ref(false);
const loadingDevices = ref(false);
const saving = ref(false);
const savingPrinter = ref(false);
const savingPos = ref(false);
const testing = ref(false);
const message = ref("");
const serviceOk = ref<boolean | null>(null);

useDesktopToastMessage(message);

const toggleGroups: Array<{ title: string; items: Array<{ key: ToggleKey; label: string }> }> = [
  {
    title: "فروش و سفارش",
    items: [
      { key: "kioskOrder", label: "سفارش کیوسک" },
      { key: "scaleOrder", label: "تسویه ترازو" },
      { key: "IsSalon", label: "سالن" },
      { key: "IsTakeAway", label: "بیرون‌بر" },
      { key: "showOrderRegistration", label: "پنل ثبت سفارش" },
      { key: "showTables", label: "نمایش میزها" },
      { key: "TableSelectionRequired", label: "انتخاب میز اجباری" },
      { key: "KeepSalonTableOpenAfterSubmit", label: "باز ماندن میز بعد از ثبت" },
      { key: "ShowKioskOrderTypeSelector", label: "انتخاب نوع سفارش در کیوسک" },
    ],
  },
  {
    title: "مالی و باشگاه",
    items: [
      { key: "Currency", label: "مبنای ریال" },
      { key: "IsClub", label: "باشگاه مشتریان" },
      { key: "showDiscountCart", label: "کارت تخفیف" },
      { key: "ScaleAutoPay", label: "پرداخت خودکار ترازو" },
      { key: "IsMultiInvoice", label: "چند فاکتوره ترازو" },
    ],
  },
  {
    title: "نمایش و دستگاه",
    items: [
      { key: "IsCollapseCart", label: "سبد جمع‌شونده" },
      { key: "ShowStandByVideo", label: "نمایش ویدئوی آماده‌باش" },
      { key: "ShowKeyBoard", label: "کیبورد مجازی" },
    ],
  },
];

const canManage = computed(() => can("settings.manage"));
const currentComputerTitle = computed(() => {
  const current = devices.value.computers.find((computer) => computer.ComputerId === devices.value.currentComputerId);
  return current?.ComputerName || devices.value.currentComputerName || "نامشخص";
});
const posExistsForSelectedComputer = computed(() =>
  devices.value.posSettings.some(
    (pos) => pos.ComputerId === posForm.value.ComputerId && pos.PosSettingId !== posForm.value.PosSettingId
  )
);
const statusText = computed(() => {
  if (serviceOk.value === true) return "اتصال برقرار است";
  if (serviceOk.value === false) return "اتصال ناموفق";
  return "تست نشده";
});

onMounted(loadAll);

async function loadAll() {
  await Promise.all([loadSettings(), loadDeviceSettings()]);
}

async function loadSettings() {
  loading.value = true;
  message.value = "";
  try {
    settings.value = { ...defaults, ...(await fetchRuntimeConfig()) };
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در خواندن تنظیمات";
    settings.value = { ...defaults };
  } finally {
    loading.value = false;
  }
}

async function loadDeviceSettings() {
  loadingDevices.value = true;
  try {
    devices.value = await loadDesktopDeviceSettings();
    resetPrinterForm();
    resetPosForm();
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در خواندن تنظیمات پرینتر و پوز";
    devices.value = { ...emptyDevices };
  } finally {
    loadingDevices.value = false;
  }
}

async function testService() {
  testing.value = true;
  message.value = "";
  try {
    const result = await testDesktopService(settings.value.ServiceAddress);
    serviceOk.value = result.status === true || result.status === "ok";
    message.value = result.message || statusText.value;
  } catch (error) {
    serviceOk.value = false;
    message.value = error instanceof Error ? error.message : "خطا در تست اتصال";
  } finally {
    testing.value = false;
  }
}

async function saveSettings() {
  if (!canManage.value) return;
  if (
    settings.value.ShowKioskOrderTypeSelector !== true &&
    settings.value.IsSalon === settings.value.IsTakeAway
  ) {
    message.value = "نوع سفارش را اصلاح کنید";
    return;
  }

  saving.value = true;
  message.value = "";
  try {
    const result = await saveDesktopSettings(settings.value);
    message.value = result.message || "تنظیمات ذخیره شد";
    settings.value = { ...defaults, ...(await fetchRuntimeConfig()) };
  } catch (error) {
    message.value =
      error instanceof Error
        ? `${error.message} - endpoint ذخیره تنظیمات در سرویس فعال نیست`
        : "خطا در ذخیره تنظیمات";
  } finally {
    saving.value = false;
  }
}

function defaultComputerId() {
  return devices.value.currentComputerId || devices.value.computers[0]?.ComputerId || 0;
}

function resetPrinterForm() {
  printerForm.value = {
    PrinterId: 0,
    PrinterTitle: "",
    ComputerId: defaultComputerId(),
    PrinterName: devices.value.windowsPrinters[0] || "",
    PrintTemplateId: devices.value.printTemplates[0]?.PrintTemplateId || 0,
    Copies: 1,
    PrintUsageType: devices.value.printUsageTypes[0]?.Id ?? 0,
    IsActive: true,
  };
}

function editPrinter(row: DesktopPrinterSetting) {
  printerForm.value = { ...row };
}

async function savePrinter() {
  if (!canManage.value) return;
  savingPrinter.value = true;
  message.value = "";
  try {
    const result = await saveDesktopPrinterSetting(printerForm.value);
    message.value = result.message || "تنظیمات پرینتر ذخیره شد";
    if (result.status === false) return;
    await loadDeviceSettings();
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در ذخیره پرینتر";
  } finally {
    savingPrinter.value = false;
  }
}

async function deletePrinter(row: DesktopPrinterSetting) {
  if (!canManage.value || !row.PrinterId) return;
  savingPrinter.value = true;
  message.value = "";
  try {
    const result = await deleteDesktopPrinterSetting(row.PrinterId);
    message.value = result.message || "جایگاه چاپ حذف شد";
    await loadDeviceSettings();
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در حذف پرینتر";
  } finally {
    savingPrinter.value = false;
  }
}

function resetPosForm() {
  posForm.value = {
    PosSettingId: 0,
    ComputerId: defaultComputerId(),
    PosType: devices.value.posTypes[0]?.Id || 1,
    IpAddress: "",
    Port: 0,
    IsActive: true,
    IsTestMode: false,
  };
}

function editPos(row: DesktopPosSetting) {
  posForm.value = { ...row };
}

async function savePos() {
  if (!canManage.value) return;
  savingPos.value = true;
  message.value = "";
  try {
    const result = await saveDesktopPosSetting(posForm.value);
    message.value = result.message || "تنظیمات پوز ذخیره شد";
    if (result.status === false) return;
    await loadDeviceSettings();
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در ذخیره پوز";
  } finally {
    savingPos.value = false;
  }
}

async function deletePos(row: DesktopPosSetting) {
  if (!canManage.value || !row.PosSettingId) return;
  savingPos.value = true;
  message.value = "";
  try {
    const result = await deleteDesktopPosSetting(row.PosSettingId);
    message.value = result.message || "تنظیمات پوز حذف شد";
    await loadDeviceSettings();
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در حذف پوز";
  } finally {
    savingPos.value = false;
  }
}

function computerName(id: number) {
  return devices.value.computers.find((computer) => computer.ComputerId === id)?.ComputerName || `سیستم ${id}`;
}
</script>

<template>
  <div class="settings-shell">
    <div class="settings-head">
      <div>
        <div class="settings-title">تنظیمات</div>
        <div class="settings-sub">نمای PC، سرویس محلی، سفارشگیری و رفتار دستگاه</div>
      </div>

      <div class="settings-actions">
        <button class="s-btn" :disabled="loading || loadingDevices" @click="loadAll">بازخوانی</button>
        <button class="s-btn" :disabled="testing" @click="testService">{{ testing ? "در حال تست" : "تست اتصال"
          }}</button>
        <button class="s-btn primary" :disabled="saving || !canManage" @click="saveSettings">
          {{ saving ? "در حال ذخیره" : "ذخیره" }}
        </button>
      </div>
    </div>

    <div class="settings-grid">
      <section class="settings-panel service-panel">
        <div class="panel-title">سرویس</div>

        <label class="field">
          <span>آدرس سرویس POS</span>
          <input v-model="settings.ServiceAddress" :disabled="!canManage" />
        </label>

        <label class="field">
          <span>آدرس API مدیریت</span>
          <input v-model="settings.ServiceAPIAddress" :disabled="!canManage" />
        </label>

        <label class="field compact">
          <span>حالت نمایش</span>
          <select v-model.number="settings.viewMode" :disabled="!canManage">
            <option :value="1">کیوسک</option>
            <option :value="2">سفارشگیری</option>
            <option :value="3">دسکتاپ PC</option>
          </select>
        </label>

        <div class="service-status" :class="{ ok: serviceOk === true, bad: serviceOk === false }">
          {{ statusText }}
        </div>
      </section>

      <section class="settings-panel timer-panel">
        <div class="panel-title">زمان‌ها</div>
        <div class="timer-grid">
          <label class="field">
            <span>StandByTimer دقیقه</span>
            <input v-model.number="settings.StandByTimer" type="number" min="0" :disabled="!canManage" />
          </label>
          <label class="field">
            <span>ResetTimer دقیقه</span>
            <input v-model.number="settings.ResetTimer" type="number" min="0" :disabled="!canManage" />
          </label>
        </div>
      </section>

      <section class="settings-panel device-panel">
        <div class="device-head">
          <div>
            <div class="panel-title">پرینتر و کارتخوان سیستم‌ها</div>
            <div class="panel-note">سیستم فعلی: {{ currentComputerTitle }}</div>
          </div>
          <button class="s-btn" :disabled="loadingDevices" @click="loadDeviceSettings">
            {{ loadingDevices ? "در حال دریافت" : "بازخوانی دستگاه‌ها" }}
          </button>
        </div>

        <div class="device-layout">
          <section class="device-box">
            <div class="device-title">
              <span>جایگاه‌های چاپ</span>
              <button class="s-btn small" :disabled="!canManage" @click="resetPrinterForm">جدید</button>
            </div>

            <div class="device-form printer-form">
              <label class="field">
                <span>نام جایگاه چاپ</span>
                <input v-model="printerForm.PrinterTitle" :disabled="!canManage" placeholder="مثلا آشپزخانه" />
              </label>
              <label class="field">
                <span>سیستم</span>
                <select v-model.number="printerForm.ComputerId" :disabled="!canManage">
                  <option v-for="computer in devices.computers" :key="computer.ComputerId" :value="computer.ComputerId">
                    {{ computer.ComputerName }}
                  </option>
                </select>
              </label>
              <label class="field">
                <span>پرینتر ویندوز</span>
                <select v-model="printerForm.PrinterName" :disabled="!canManage">
                  <option v-for="printer in devices.windowsPrinters" :key="printer" :value="printer">{{ printer }}
                  </option>
                </select>
              </label>
              <label class="field">
                <span>قالب چاپ</span>
                <select v-model.number="printerForm.PrintTemplateId" :disabled="!canManage">
                  <option v-for="template in devices.printTemplates" :key="template.PrintTemplateId"
                    :value="template.PrintTemplateId">
                    {{ template.Description || template.TemplateName }}
                  </option>
                </select>
              </label>
              <label class="field">
                <span>مقصد چاپ</span>
                <select v-model.number="printerForm.PrintUsageType" :disabled="!canManage">
                  <option v-for="usage in devices.printUsageTypes" :key="usage.Id" :value="usage.Id">
                    {{ usage.Name }}
                  </option>
                </select>
              </label>
              <label class="field">
                <span>تعداد چاپ</span>
                <input v-model.number="printerForm.Copies" type="number" min="1" :disabled="!canManage" />
              </label>
              <label class="toggle-row inline">
                <span>فعال</span>
                <input v-model="printerForm.IsActive" type="checkbox" :disabled="!canManage" />
              </label>
            </div>

            <div class="form-actions">
              <button class="s-btn primary" :disabled="savingPrinter || !canManage" @click="savePrinter">
                {{ printerForm.PrinterId ? "ویرایش جایگاه" : "ثبت جایگاه" }}
              </button>
            </div>

            <div class="windows-printers">
              <span>پرینترهای نصب‌شده ویندوز</span>
              <div>
                <b v-for="printer in devices.windowsPrinters" :key="printer">{{ printer }}</b>
                <small v-if="!devices.windowsPrinters.length">پرینتری از ویندوز دریافت نشد</small>
              </div>
            </div>

            <div class="device-table">
              <div class="device-tr printer th">
                <div>جایگاه</div>
                <div>سیستم</div>
                <div>پرینتر</div>
                <div>قالب</div>
                <div>مقصد</div>
                <div>چاپ</div>
                <div>عملیات</div>
              </div>
              <div v-for="row in devices.printerSettings" :key="row.PrinterId" class="device-tr printer">
                <div class="bold" data-label="جایگاه">{{ row.PrinterTitle }}</div>
                <div data-label="سیستم">{{ row.ComputerName || computerName(row.ComputerId) }}</div>
                <div data-label="پرینتر">{{ row.PrinterName }}</div>
                <div data-label="قالب">{{ row.PrintTemplateName }}</div>
                <div data-label="مقصد">{{ row.PrintUsageTypeName }}</div>
                <div data-label="چاپ">{{ row.Copies }} / {{ row.IsActive ? "فعال" : "غیرفعال" }}</div>
                <div class="row-actions" data-label="عملیات">
                  <button @click="editPrinter(row)">ویرایش</button>
                  <button :disabled="!canManage" @click="deletePrinter(row)">حذف</button>
                </div>
              </div>
            </div>
          </section>

          <section class="device-box">
            <div class="device-title">
              <span>کارتخوان سیستم</span>
              <button class="s-btn small" :disabled="!canManage" @click="resetPosForm">جدید</button>
            </div>

            <div class="device-form pos-form">
              <label class="field">
                <span>سیستم</span>
                <select v-model.number="posForm.ComputerId" :disabled="!canManage || posForm.PosSettingId > 0">
                  <option v-for="computer in devices.computers" :key="computer.ComputerId" :value="computer.ComputerId">
                    {{ computer.ComputerName }}
                  </option>
                </select>
              </label>
              <label class="field">
                <span>نوع کارتخوان</span>
                <select v-model.number="posForm.PosType" :disabled="!canManage">
                  <option v-for="type in devices.posTypes" :key="type.Id" :value="type.Id">{{ type.Name }}</option>
                </select>
              </label>
              <label class="field">
                <span>IP کارتخوان</span>
                <input v-model="posForm.IpAddress" :disabled="!canManage" placeholder="192.168.1.20" />
              </label>
              <label class="field">
                <span>پورت</span>
                <input v-model.number="posForm.Port" type="number" min="100" :disabled="!canManage" />
              </label>
              <label class="toggle-row inline">
                <span>فعال</span>
                <input v-model="posForm.IsActive" type="checkbox" :disabled="!canManage" />
              </label>
              <label class="toggle-row inline">
                <span>حالت تست</span>
                <input v-model="posForm.IsTestMode" type="checkbox" :disabled="!canManage" />
              </label>
            </div>

            <div v-if="posExistsForSelectedComputer && !posForm.PosSettingId" class="device-warning">
              برای این سیستم قبلا کارتخوان تعریف شده است؛ هر سیستم فقط یک کارتخوان دارد.
            </div>

            <div class="form-actions">
              <button class="s-btn primary"
                :disabled="savingPos || !canManage || (posExistsForSelectedComputer && !posForm.PosSettingId)"
                @click="savePos">
                {{ posForm.PosSettingId ? "ویرایش کارتخوان" : "ثبت کارتخوان" }}
              </button>
            </div>

            <div class="device-table">
              <div class="device-tr pos th">
                <div>سیستم</div>
                <div>نوع</div>
                <div>IP</div>
                <div>پورت</div>
                <div>وضعیت</div>
                <div>عملیات</div>
              </div>
              <div v-for="row in devices.posSettings" :key="row.PosSettingId" class="device-tr pos">
                <div class="bold" data-label="سیستم">{{ row.ComputerName || computerName(row.ComputerId) }}</div>
                <div data-label="نوع">{{ row.PosTypeName || row.PosType }}</div>
                <div data-label="IP">{{ row.IpAddress }}</div>
                <div data-label="پورت">{{ row.Port }}</div>
                <div data-label="وضعیت">{{ row.IsActive ? "فعال" : "غیرفعال" }} / {{ row.IsTestMode ? "تست" : "عملیاتی"
                  }}</div>
                <div class="row-actions" data-label="عملیات">
                  <button @click="editPos(row)">ویرایش</button>
                  <button :disabled="!canManage" @click="deletePos(row)">حذف</button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section v-for="group in toggleGroups" :key="group.title" class="settings-panel">
        <div class="panel-title">{{ group.title }}</div>
        <div class="toggle-list">
          <label v-for="item in group.items" :key="item.key" class="toggle-row">
            <span>{{ item.label }}</span>
            <input v-model="settings[item.key]" type="checkbox" :disabled="!canManage" />
          </label>
        </div>
      </section>
    </div>

    <div v-if="message" class="settings-message">{{ message }}</div>
  </div>
</template>

<style scoped>
.settings-shell {
  height: 100%;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
  padding-left: 2px;
}

.settings-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.settings-title {
  font-weight: 900;
  font-size: 20px;
}

.settings-sub {
  margin-top: 4px;
  font-size: 13px;
  color: #a7b0c3;
}

.settings-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  min-width: 0;
}

.s-btn {
  min-height: 46px;
  border-radius: 10px;
  padding: 9px 13px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #eef2ff;
  cursor: pointer;
  white-space: nowrap;
}

.s-btn.primary {
  font-weight: 900;
  background: rgba(20, 184, 166, 0.18);
  border-color: rgba(20, 184, 166, 0.34);
}

.s-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.settings-grid {
  flex: 0 0 auto;
  min-height: auto;
  min-width: 0;
  overflow: visible;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-content: start;
  gap: 12px;
  padding-left: 4px;
}

.settings-panel {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  border-radius: 8px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: visible;
}

.service-panel {
  grid-column: span 2;
}

.timer-panel {
  grid-column: span 1;
}

.device-panel {
  grid-column: 1 / -1;
}

.device-head,
.device-title,
.form-actions,
.row-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.device-head,
.device-title,
.form-actions {
  flex-wrap: wrap;
}

.panel-note {
  margin-top: -6px;
  color: #a7b0c3;
  font-size: 13px;
}

.device-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 12px;
  min-width: 0;
}

.device-box {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  border-radius: 8px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.13);
  border: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.device-title {
  font-weight: 900;
}

.s-btn.small {
  min-height: 34px;
  padding: 6px 10px;
}

.device-form {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.printer-form {
  grid-template-columns: minmax(0, 1fr) 150px minmax(0, 1fr) minmax(0, 1fr) 150px 100px 86px;
}

.pos-form {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) 100px 86px 100px;
}

.device-form .field {
  margin-bottom: 0;
  min-width: 0;
}

.toggle-row.inline {
  min-height: 46px;
  align-self: end;
  margin: 0;
}

.windows-printers {
  display: grid;
  gap: 8px;
  min-width: 0;
  border-radius: 8px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.windows-printers>span {
  color: #a7b0c3;
  font-size: 13px;
}

.windows-printers>div {
  max-height: 82px;
  overflow: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.windows-printers b,
.windows-printers small {
  border-radius: 8px;
  padding: 5px 8px;
  color: #dbeafe;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.22);
  font-size: 12px;
  font-weight: 700;
}

.device-warning {
  border-radius: 8px;
  padding: 9px 10px;
  color: #fde68a;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.22);
}

.device-table {
  min-height: 0;
  max-height: 260px;
  width: 100%;
  max-width: 100%;
  overflow: auto;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.device-tr {
  display: grid;
  gap: 8px;
  align-items: center;
  width: 100%;
  min-width: 860px;
  box-sizing: border-box;
  padding: 9px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.device-tr.printer {
  grid-template-columns: minmax(130px, 1fr) 130px minmax(180px, 1.2fr) minmax(150px, 1.1fr) 140px 100px 120px;
}

.device-tr.pos {
  min-width: 700px;
  grid-template-columns: minmax(140px, 1fr) minmax(130px, 1fr) minmax(120px, 1fr) 80px 130px 120px;
}

.device-tr.th {
  position: sticky;
  top: 0;
  z-index: 2;
  color: #a7b0c3;
  font-weight: 900;
  background: rgba(16, 19, 26, 0.96);
}

.device-tr>div {
  min-width: 0;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.row-actions button {
  flex: 1 0 auto;
  min-height: 32px;
  border-radius: 8px;
  padding: 5px 8px;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
}

.row-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.bold {
  font-weight: 900;
}

.panel-title {
  font-weight: 900;
  margin-bottom: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 12px;
  min-width: 0;
  font-size: 13px;
  color: #a7b0c3;
}

.field.compact {
  max-width: 280px;
}

.field input,
.field select {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  min-height: 46px;
  border-radius: 8px;
  padding: 9px 11px;
  font-size: 15px;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.timer-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.toggle-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.toggle-row {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 8px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.toggle-row input {
  width: 20px;
  height: 20px;
  accent-color: #14b8a6;
}

.service-status,
.settings-message {
  border-radius: 8px;
  padding: 10px 12px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.22);
  color: #fde68a;
}

.service-status.ok {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.22);
  color: #bbf7d0;
}

.service-status.bad {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.22);
  color: #fecaca;
}

.settings-message {
  color: #eef2ff;
}

@media (max-width: 1400px) {
  .device-layout {
    grid-template-columns: 1fr;
  }

  .printer-form,
  .pos-form {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .settings-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .service-panel,
  .timer-panel {
    grid-column: 1 / -1;
  }
}

@media (max-width: 760px) {
  .settings-grid {
    grid-template-columns: 1fr;
    padding-left: 0;
  }

  .settings-head {
    align-items: stretch;
    flex-direction: column;
  }

  .settings-actions {
    display: flex;
    flex-wrap: wrap;
  }

  .s-btn {
    flex: 1 1 130px;
  }

  .device-head,
  .device-title,
  .form-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .device-form,
  .printer-form,
  .pos-form {
    grid-template-columns: 1fr;
  }

  .toggle-row.inline {
    align-self: stretch;
  }

  .device-table {
    max-height: 360px;
  }

  .row-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .row-actions button {
    flex: 1 1 72px;
  }

  .timer-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {

  .settings-panel,
  .device-box {
    padding: 10px;
  }

  .windows-printers>div {
    flex-direction: column;
    flex-wrap: nowrap;
  }

  .windows-printers b,
  .windows-printers small {
    width: 100%;
    box-sizing: border-box;
  }
}
</style>
