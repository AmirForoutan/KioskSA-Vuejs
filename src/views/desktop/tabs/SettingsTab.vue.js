import { computed, onMounted, ref } from "vue";
import { can } from "../../../components/acl/can";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import { deleteDesktopPosSetting, deleteDesktopPrinterSetting, fetchRuntimeConfig, loadDesktopDeviceSettings, saveDesktopSettings, saveDesktopPosSetting, saveDesktopPrinterSetting, testDesktopService, } from "../../../services/desktopApi";
const defaults = {
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
const settings = ref({ ...defaults });
const emptyDevices = {
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
const devices = ref({ ...emptyDevices });
const printerForm = ref({
    PrinterId: 0,
    PrinterTitle: "",
    ComputerId: 0,
    PrinterName: "",
    PrintTemplateId: 0,
    Copies: 1,
    PrintUsageType: 0,
    IsActive: true,
});
const posForm = ref({
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
const serviceOk = ref(null);
useDesktopToastMessage(message);
const toggleGroups = [
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
const posExistsForSelectedComputer = computed(() => devices.value.posSettings.some((pos) => pos.ComputerId === posForm.value.ComputerId && pos.PosSettingId !== posForm.value.PosSettingId));
const statusText = computed(() => {
    if (serviceOk.value === true)
        return "اتصال برقرار است";
    if (serviceOk.value === false)
        return "اتصال ناموفق";
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
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در خواندن تنظیمات";
        settings.value = { ...defaults };
    }
    finally {
        loading.value = false;
    }
}
async function loadDeviceSettings() {
    loadingDevices.value = true;
    try {
        devices.value = await loadDesktopDeviceSettings();
        resetPrinterForm();
        resetPosForm();
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در خواندن تنظیمات پرینتر و پوز";
        devices.value = { ...emptyDevices };
    }
    finally {
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
    }
    catch (error) {
        serviceOk.value = false;
        message.value = error instanceof Error ? error.message : "خطا در تست اتصال";
    }
    finally {
        testing.value = false;
    }
}
async function saveSettings() {
    if (!canManage.value)
        return;
    if (settings.value.ShowKioskOrderTypeSelector !== true &&
        settings.value.IsSalon === settings.value.IsTakeAway) {
        message.value = "نوع سفارش را اصلاح کنید";
        return;
    }
    saving.value = true;
    message.value = "";
    try {
        const result = await saveDesktopSettings(settings.value);
        message.value = result.message || "تنظیمات ذخیره شد";
        settings.value = { ...defaults, ...(await fetchRuntimeConfig()) };
    }
    catch (error) {
        message.value =
            error instanceof Error
                ? `${error.message} - endpoint ذخیره تنظیمات در سرویس فعال نیست`
                : "خطا در ذخیره تنظیمات";
    }
    finally {
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
function editPrinter(row) {
    printerForm.value = { ...row };
}
async function savePrinter() {
    if (!canManage.value)
        return;
    savingPrinter.value = true;
    message.value = "";
    try {
        const result = await saveDesktopPrinterSetting(printerForm.value);
        message.value = result.message || "تنظیمات پرینتر ذخیره شد";
        if (result.status === false)
            return;
        await loadDeviceSettings();
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در ذخیره پرینتر";
    }
    finally {
        savingPrinter.value = false;
    }
}
async function deletePrinter(row) {
    if (!canManage.value || !row.PrinterId)
        return;
    savingPrinter.value = true;
    message.value = "";
    try {
        const result = await deleteDesktopPrinterSetting(row.PrinterId);
        message.value = result.message || "جایگاه چاپ حذف شد";
        await loadDeviceSettings();
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در حذف پرینتر";
    }
    finally {
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
function editPos(row) {
    posForm.value = { ...row };
}
async function savePos() {
    if (!canManage.value)
        return;
    savingPos.value = true;
    message.value = "";
    try {
        const result = await saveDesktopPosSetting(posForm.value);
        message.value = result.message || "تنظیمات پوز ذخیره شد";
        if (result.status === false)
            return;
        await loadDeviceSettings();
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در ذخیره پوز";
    }
    finally {
        savingPos.value = false;
    }
}
async function deletePos(row) {
    if (!canManage.value || !row.PosSettingId)
        return;
    savingPos.value = true;
    message.value = "";
    try {
        const result = await deleteDesktopPosSetting(row.PosSettingId);
        message.value = result.message || "تنظیمات پوز حذف شد";
        await loadDeviceSettings();
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در حذف پوز";
    }
    finally {
        savingPos.value = false;
    }
}
function computerName(id) {
    return devices.value.computers.find((computer) => computer.ComputerId === id)?.ComputerName || `سیستم ${id}`;
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['s-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['s-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['device-head']} */ ;
/** @type {__VLS_StyleScopedClasses['device-title']} */ ;
/** @type {__VLS_StyleScopedClasses['form-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['device-title']} */ ;
/** @type {__VLS_StyleScopedClasses['s-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['device-form']} */ ;
/** @type {__VLS_StyleScopedClasses['windows-printers']} */ ;
/** @type {__VLS_StyleScopedClasses['windows-printers']} */ ;
/** @type {__VLS_StyleScopedClasses['windows-printers']} */ ;
/** @type {__VLS_StyleScopedClasses['windows-printers']} */ ;
/** @type {__VLS_StyleScopedClasses['device-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['device-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['device-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['device-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['row-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['row-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['service-status']} */ ;
/** @type {__VLS_StyleScopedClasses['service-status']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-message']} */ ;
/** @type {__VLS_StyleScopedClasses['device-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['printer-form']} */ ;
/** @type {__VLS_StyleScopedClasses['pos-form']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['service-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['timer-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-head']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['s-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['device-head']} */ ;
/** @type {__VLS_StyleScopedClasses['device-title']} */ ;
/** @type {__VLS_StyleScopedClasses['form-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['device-form']} */ ;
/** @type {__VLS_StyleScopedClasses['printer-form']} */ ;
/** @type {__VLS_StyleScopedClasses['pos-form']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['inline']} */ ;
/** @type {__VLS_StyleScopedClasses['device-table']} */ ;
/** @type {__VLS_StyleScopedClasses['row-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['row-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['timer-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['device-box']} */ ;
/** @type {__VLS_StyleScopedClasses['windows-printers']} */ ;
/** @type {__VLS_StyleScopedClasses['windows-printers']} */ ;
/** @type {__VLS_StyleScopedClasses['windows-printers']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-sub" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-actions" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadAll) },
    ...{ class: "s-btn" },
    disabled: (__VLS_ctx.loading || __VLS_ctx.loadingDevices),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.testService) },
    ...{ class: "s-btn" },
    disabled: (__VLS_ctx.testing),
});
(__VLS_ctx.testing ? "در حال تست" : "تست اتصال");
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.saveSettings) },
    ...{ class: "s-btn primary" },
    disabled: (__VLS_ctx.saving || !__VLS_ctx.canManage),
});
(__VLS_ctx.saving ? "در حال ذخیره" : "ذخیره");
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "settings-panel service-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    disabled: (!__VLS_ctx.canManage),
});
(__VLS_ctx.settings.ServiceAddress);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    disabled: (!__VLS_ctx.canManage),
});
(__VLS_ctx.settings.ServiceAPIAddress);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field compact" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.settings.viewMode),
    disabled: (!__VLS_ctx.canManage),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: (1),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: (2),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: (3),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "service-status" },
    ...{ class: ({ ok: __VLS_ctx.serviceOk === true, bad: __VLS_ctx.serviceOk === false }) },
});
(__VLS_ctx.statusText);
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "settings-panel timer-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "timer-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "number",
    min: "0",
    disabled: (!__VLS_ctx.canManage),
});
(__VLS_ctx.settings.StandByTimer);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "number",
    min: "0",
    disabled: (!__VLS_ctx.canManage),
});
(__VLS_ctx.settings.ResetTimer);
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "settings-panel device-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "device-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-note" },
});
(__VLS_ctx.currentComputerTitle);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadDeviceSettings) },
    ...{ class: "s-btn" },
    disabled: (__VLS_ctx.loadingDevices),
});
(__VLS_ctx.loadingDevices ? "در حال دریافت" : "بازخوانی دستگاه‌ها");
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "device-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "device-box" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "device-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.resetPrinterForm) },
    ...{ class: "s-btn small" },
    disabled: (!__VLS_ctx.canManage),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "device-form printer-form" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    disabled: (!__VLS_ctx.canManage),
    placeholder: "مثلا آشپزخانه",
});
(__VLS_ctx.printerForm.PrinterTitle);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.printerForm.ComputerId),
    disabled: (!__VLS_ctx.canManage),
});
for (const [computer] of __VLS_getVForSourceType((__VLS_ctx.devices.computers))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (computer.ComputerId),
        value: (computer.ComputerId),
    });
    (computer.ComputerName);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.printerForm.PrinterName),
    disabled: (!__VLS_ctx.canManage),
});
for (const [printer] of __VLS_getVForSourceType((__VLS_ctx.devices.windowsPrinters))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (printer),
        value: (printer),
    });
    (printer);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.printerForm.PrintTemplateId),
    disabled: (!__VLS_ctx.canManage),
});
for (const [template] of __VLS_getVForSourceType((__VLS_ctx.devices.printTemplates))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (template.PrintTemplateId),
        value: (template.PrintTemplateId),
    });
    (template.Description || template.TemplateName);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.printerForm.PrintUsageType),
    disabled: (!__VLS_ctx.canManage),
});
for (const [usage] of __VLS_getVForSourceType((__VLS_ctx.devices.printUsageTypes))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (usage.Id),
        value: (usage.Id),
    });
    (usage.Name);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "number",
    min: "1",
    disabled: (!__VLS_ctx.canManage),
});
(__VLS_ctx.printerForm.Copies);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "toggle-row inline" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "checkbox",
    disabled: (!__VLS_ctx.canManage),
});
(__VLS_ctx.printerForm.IsActive);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-actions" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.savePrinter) },
    ...{ class: "s-btn primary" },
    disabled: (__VLS_ctx.savingPrinter || !__VLS_ctx.canManage),
});
(__VLS_ctx.printerForm.PrinterId ? "ویرایش جایگاه" : "ثبت جایگاه");
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "windows-printers" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
for (const [printer] of __VLS_getVForSourceType((__VLS_ctx.devices.windowsPrinters))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({
        key: (printer),
    });
    (printer);
}
if (!__VLS_ctx.devices.windowsPrinters.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "device-table" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "device-tr printer th" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
for (const [row] of __VLS_getVForSourceType((__VLS_ctx.devices.printerSettings))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (row.PrinterId),
        ...{ class: "device-tr printer" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bold" },
        'data-label': "جایگاه",
    });
    (row.PrinterTitle);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        'data-label': "سیستم",
    });
    (row.ComputerName || __VLS_ctx.computerName(row.ComputerId));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        'data-label': "پرینتر",
    });
    (row.PrinterName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        'data-label': "قالب",
    });
    (row.PrintTemplateName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        'data-label': "مقصد",
    });
    (row.PrintUsageTypeName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        'data-label': "چاپ",
    });
    (row.Copies);
    (row.IsActive ? "فعال" : "غیرفعال");
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row-actions" },
        'data-label': "عملیات",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.editPrinter(row);
            } },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.deletePrinter(row);
            } },
        disabled: (!__VLS_ctx.canManage),
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "device-box" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "device-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.resetPosForm) },
    ...{ class: "s-btn small" },
    disabled: (!__VLS_ctx.canManage),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "device-form pos-form" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.posForm.ComputerId),
    disabled: (!__VLS_ctx.canManage || __VLS_ctx.posForm.PosSettingId > 0),
});
for (const [computer] of __VLS_getVForSourceType((__VLS_ctx.devices.computers))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (computer.ComputerId),
        value: (computer.ComputerId),
    });
    (computer.ComputerName);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.posForm.PosType),
    disabled: (!__VLS_ctx.canManage),
});
for (const [type] of __VLS_getVForSourceType((__VLS_ctx.devices.posTypes))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (type.Id),
        value: (type.Id),
    });
    (type.Name);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    disabled: (!__VLS_ctx.canManage),
    placeholder: "192.168.1.20",
});
(__VLS_ctx.posForm.IpAddress);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "number",
    min: "100",
    disabled: (!__VLS_ctx.canManage),
});
(__VLS_ctx.posForm.Port);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "toggle-row inline" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "checkbox",
    disabled: (!__VLS_ctx.canManage),
});
(__VLS_ctx.posForm.IsActive);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "toggle-row inline" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "checkbox",
    disabled: (!__VLS_ctx.canManage),
});
(__VLS_ctx.posForm.IsTestMode);
if (__VLS_ctx.posExistsForSelectedComputer && !__VLS_ctx.posForm.PosSettingId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "device-warning" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-actions" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.savePos) },
    ...{ class: "s-btn primary" },
    disabled: (__VLS_ctx.savingPos || !__VLS_ctx.canManage || (__VLS_ctx.posExistsForSelectedComputer && !__VLS_ctx.posForm.PosSettingId)),
});
(__VLS_ctx.posForm.PosSettingId ? "ویرایش کارتخوان" : "ثبت کارتخوان");
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "device-table" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "device-tr pos th" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
for (const [row] of __VLS_getVForSourceType((__VLS_ctx.devices.posSettings))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (row.PosSettingId),
        ...{ class: "device-tr pos" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bold" },
        'data-label': "سیستم",
    });
    (row.ComputerName || __VLS_ctx.computerName(row.ComputerId));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        'data-label': "نوع",
    });
    (row.PosTypeName || row.PosType);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        'data-label': "IP",
    });
    (row.IpAddress);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        'data-label': "پورت",
    });
    (row.Port);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        'data-label': "وضعیت",
    });
    (row.IsActive ? "فعال" : "غیرفعال");
    (row.IsTestMode ? "تست" : "عملیاتی");
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row-actions" },
        'data-label': "عملیات",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.editPos(row);
            } },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.deletePos(row);
            } },
        disabled: (!__VLS_ctx.canManage),
    });
}
for (const [group] of __VLS_getVForSourceType((__VLS_ctx.toggleGroups))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        key: (group.title),
        ...{ class: "settings-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-title" },
    });
    (group.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toggle-list" },
    });
    for (const [item] of __VLS_getVForSourceType((group.items))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            key: (item.key),
            ...{ class: "toggle-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.label);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "checkbox",
            disabled: (!__VLS_ctx.canManage),
        });
        (__VLS_ctx.settings[item.key]);
    }
}
if (__VLS_ctx.message) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "settings-message" },
    });
    (__VLS_ctx.message);
}
/** @type {__VLS_StyleScopedClasses['settings-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-head']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-title']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['s-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['s-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['s-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['service-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['compact']} */ ;
/** @type {__VLS_StyleScopedClasses['service-status']} */ ;
/** @type {__VLS_StyleScopedClasses['ok']} */ ;
/** @type {__VLS_StyleScopedClasses['bad']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['timer-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['timer-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['device-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['device-head']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-note']} */ ;
/** @type {__VLS_StyleScopedClasses['s-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['device-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['device-box']} */ ;
/** @type {__VLS_StyleScopedClasses['device-title']} */ ;
/** @type {__VLS_StyleScopedClasses['s-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['device-form']} */ ;
/** @type {__VLS_StyleScopedClasses['printer-form']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['inline']} */ ;
/** @type {__VLS_StyleScopedClasses['form-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['s-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['windows-printers']} */ ;
/** @type {__VLS_StyleScopedClasses['device-table']} */ ;
/** @type {__VLS_StyleScopedClasses['device-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['printer']} */ ;
/** @type {__VLS_StyleScopedClasses['th']} */ ;
/** @type {__VLS_StyleScopedClasses['device-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['printer']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
/** @type {__VLS_StyleScopedClasses['row-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['device-box']} */ ;
/** @type {__VLS_StyleScopedClasses['device-title']} */ ;
/** @type {__VLS_StyleScopedClasses['s-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['device-form']} */ ;
/** @type {__VLS_StyleScopedClasses['pos-form']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['inline']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['inline']} */ ;
/** @type {__VLS_StyleScopedClasses['device-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['form-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['s-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['device-table']} */ ;
/** @type {__VLS_StyleScopedClasses['device-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['pos']} */ ;
/** @type {__VLS_StyleScopedClasses['th']} */ ;
/** @type {__VLS_StyleScopedClasses['device-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['pos']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
/** @type {__VLS_StyleScopedClasses['row-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-list']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-message']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            settings: settings,
            devices: devices,
            printerForm: printerForm,
            posForm: posForm,
            loading: loading,
            loadingDevices: loadingDevices,
            saving: saving,
            savingPrinter: savingPrinter,
            savingPos: savingPos,
            testing: testing,
            message: message,
            serviceOk: serviceOk,
            toggleGroups: toggleGroups,
            canManage: canManage,
            currentComputerTitle: currentComputerTitle,
            posExistsForSelectedComputer: posExistsForSelectedComputer,
            statusText: statusText,
            loadAll: loadAll,
            loadDeviceSettings: loadDeviceSettings,
            testService: testService,
            saveSettings: saveSettings,
            resetPrinterForm: resetPrinterForm,
            editPrinter: editPrinter,
            savePrinter: savePrinter,
            deletePrinter: deletePrinter,
            resetPosForm: resetPosForm,
            editPos: editPos,
            savePos: savePos,
            deletePos: deletePos,
            computerName: computerName,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
