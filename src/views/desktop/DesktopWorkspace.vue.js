import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import SalesTab from "./tabs/SalesTab.vue";
import TablesTab from "./tabs/TablesTab.vue";
import BaseInfoTab from "./tabs/BaseInfoTab.vue";
import ReportsTab from "./tabs/ReportsTab.vue";
import SettingsTab from "./tabs/SettingsTab.vue";
import DiscountsTab from "./tabs/DiscountsTab.vue";
import InventoryTab from "./tabs/InventoryTab.vue";
import InventoryAnalysisTab from "./tabs/InventoryAnalysisTab.vue";
import { can } from "../../components/acl/can";
import { INVOICE_EDIT_REQUEST_EVENT } from "../../components/stores/invoice-edit.store";
import { TABLE_ORDER_REQUEST_EVENT } from "../../components/stores/table-order.store";
import { logoutDesktop } from "../../services/desktopApi";
import { logoutDesktopUser, useAuthState } from "../../components/stores/auth.store";
import { GetApiAddress } from "../../utilities";
const hasStockLicense = ref(false);
const inventoryPermissionKeys = [
    "view.inventory",
    "manage.inventory",
    "view.inventory.settings",
    "manage.inventory.settings",
    "view.inventory.documents",
    "manage.inventory.documents",
    "view.inventory.reports",
    "view.inventory.kardex",
    "view.inventory.stocktaking",
    "manage.inventory.stocktaking",
    "view.inventory.suppliers",
    "manage.inventory.suppliers",
    "view.inventory.history",
];
function canOpenDiscounts() {
    return can("view.discounts") || can("manage.discounts") || can("manage.discountCards") || can("sales.discount.percent") || can("sales.discount.amount");
}
function canOpenInventoryByPermission() {
    return inventoryPermissionKeys.some((permission) => can(permission));
}
function canOpenInventoryAnalysisByPermission() {
    return can("view.inventoryAnalysis") || can("manage.inventoryAnalysis") || can("manage.inventory");
}
async function getInventoryBootstrapAddress() {
    const serviceAdd = await GetApiAddress();
    try {
        const url = new URL(serviceAdd);
        const currentPort = Number(url.port || (url.protocol === "https:" ? 443 : 80));
        url.port = String(currentPort + 1);
        url.pathname = "/inventory/bootstrap";
        url.search = "";
        url.hash = "";
        return url.toString();
    }
    catch {
        return String(serviceAdd).replace(/:(\d+)(\/?$)/, (_match, port) => `:${Number(port) + 1}/inventory/bootstrap`);
    }
}
async function checkInventoryLicense() {
    try {
        const response = await fetch(await getInventoryBootstrapAddress(), {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify({}),
        });
        const result = await response.json();
        hasStockLicense.value = result?.status === true && result?.haveStockLicense === true;
    }
    catch {
        hasStockLicense.value = false;
    }
    ensureActiveTabIsAvailable();
}
function canOpenInventory() {
    return canOpenInventoryByPermission() && hasStockLicense.value;
}
function canOpenInventoryAnalysis() {
    return canOpenInventoryAnalysisByPermission() && hasStockLicense.value;
}
const availableTabs = computed(() => {
    const t = [];
    if (can("view.sales"))
        t.push({ key: "sales", title: "سفارشگیری" });
    if (can("view.sales"))
        t.push({ key: "tables", title: "میزها" });
    if (can("view.baseInfo"))
        t.push({ key: "base", title: "کالاها و پایه" });
    if (canOpenDiscounts())
        t.push({ key: "discounts", title: "تخفیف‌ها" });
    if (canOpenInventory())
        t.push({ key: "inventory", title: "انبار" });
    if (canOpenInventoryAnalysis())
        t.push({ key: "inventoryAnalysis", title: "آنالیز کالا" });
    if (can("view.reports"))
        t.push({ key: "reports", title: "گزارشگیری" });
    if (can("view.settings"))
        t.push({ key: "settings", title: "تنظیمات" });
    return t.length ? t : [{ key: "sales", title: "سفارشگیری" }];
});
const activeKey = ref(availableTabs.value[0].key);
function ensureActiveTabIsAvailable() {
    if (!availableTabs.value.some((tab) => tab.key === activeKey.value)) {
        activeKey.value = availableTabs.value[0]?.key || "sales";
    }
}
const activeComponent = computed(() => {
    switch (activeKey.value) {
        case "base":
            return BaseInfoTab;
        case "discounts":
            return DiscountsTab;
        case "inventory":
            return canOpenInventory() ? InventoryTab : SalesTab;
        case "inventoryAnalysis":
            return canOpenInventoryAnalysis() ? InventoryAnalysisTab : SalesTab;
        case "reports":
            return ReportsTab;
        case "settings":
            return SettingsTab;
        case "tables":
            return TablesTab;
        case "sales":
        default:
            return SalesTab;
    }
});
const activeTitle = computed(() => availableTabs.value.find((t) => t.key === activeKey.value)?.title ?? "سفارشگیری");
const auth = useAuthState();
onMounted(() => {
    window.addEventListener(INVOICE_EDIT_REQUEST_EVENT, openSalesForInvoiceEdit);
    window.addEventListener(TABLE_ORDER_REQUEST_EVENT, openSalesForTableOrder);
    void checkInventoryLicense();
});
onUnmounted(() => {
    window.removeEventListener(INVOICE_EDIT_REQUEST_EVENT, openSalesForInvoiceEdit);
    window.removeEventListener(TABLE_ORDER_REQUEST_EVENT, openSalesForTableOrder);
});
async function openSalesForInvoiceEdit() {
    const wasSalesActive = activeKey.value === "sales";
    activeKey.value = "sales";
    if (wasSalesActive)
        return;
    await nextTick();
    window.dispatchEvent(new CustomEvent(INVOICE_EDIT_REQUEST_EVENT));
}
async function openSalesForTableOrder() {
    const wasSalesActive = activeKey.value === "sales";
    activeKey.value = "sales";
    if (wasSalesActive)
        return;
    await nextTick();
    window.dispatchEvent(new CustomEvent(TABLE_ORDER_REQUEST_EVENT));
}
function logout() {
    const username = auth.user?.username;
    logoutDesktopUser();
    if (username)
        void logoutDesktop(username);
}
function openSite() {
    window.open('https://pargasdesi.ir', '_blank');
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['dw-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['dw-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['dw-chip']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dw-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "dw-topbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dw-brand" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.openSite();
        } },
    ...{ class: "dw-logo" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dw-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dw-title-main" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "dw-tabs" },
});
for (const [t] of __VLS_getVForSourceType((__VLS_ctx.availableTabs))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.activeKey = t.key;
            } },
        key: (t.key),
        ...{ class: "dw-tab" },
        ...{ class: ({ active: t.key === __VLS_ctx.activeKey }) },
    });
    (t.title);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dw-actions" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "dw-chip" },
    title: "کاربر",
});
(__VLS_ctx.auth.user?.username || "کاربر");
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.logout) },
    ...{ class: "dw-chip danger" },
    title: "خروج",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "dw-content" },
});
const __VLS_0 = ((__VLS_ctx.activeComponent));
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['dw-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['dw-topbar']} */ ;
/** @type {__VLS_StyleScopedClasses['dw-brand']} */ ;
/** @type {__VLS_StyleScopedClasses['dw-logo']} */ ;
/** @type {__VLS_StyleScopedClasses['dw-title']} */ ;
/** @type {__VLS_StyleScopedClasses['dw-title-main']} */ ;
/** @type {__VLS_StyleScopedClasses['dw-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['dw-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['dw-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['dw-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['dw-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['dw-content']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            availableTabs: availableTabs,
            activeKey: activeKey,
            activeComponent: activeComponent,
            auth: auth,
            logout: logout,
            openSite: openSite,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
