<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import SalesTab from "./tabs/SalesTab.vue";
import TablesTab from "./tabs/TablesTab.vue";
import BaseInfoTab from "./tabs/BaseInfoTab.vue";
import ReportsTab from "./tabs/ReportsTab.vue";
import SettingsTab from "./tabs/SettingsTab.vue";
import { can } from "../../components/acl/can";
import { INVOICE_EDIT_REQUEST_EVENT } from "../../components/stores/invoice-edit.store";
import { TABLE_ORDER_REQUEST_EVENT } from "../../components/stores/table-order.store";
import { logoutDesktop } from "../../services/desktopApi";
import { logoutDesktopUser, useAuthState } from "../../components/stores/auth.store";

type Tab = { key: string; title: string; icon?: string };

const availableTabs = computed<Tab[]>(() => {
    const t: Tab[] = [];
    if (can("view.sales")) t.push({ key: "sales", title: "سفارشگیری" });
    if (can("view.sales")) t.push({ key: "tables", title: "میزها" });
    if (can("view.baseInfo")) t.push({ key: "base", title: "کالاها و پایه" });
    if (can("view.reports")) t.push({ key: "reports", title: "گزارشگیری" });
    if (can("view.settings")) t.push({ key: "settings", title: "تنظیمات" });
    return t.length ? t : [{ key: "sales", title: "سفارشگیری" }]; // fallback
});

const activeKey = ref<string>(availableTabs.value[0].key);

const activeComponent = computed(() => {
    switch (activeKey.value) {
        case "base":
            return BaseInfoTab;
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
});

onUnmounted(() => {
    window.removeEventListener(INVOICE_EDIT_REQUEST_EVENT, openSalesForInvoiceEdit);
    window.removeEventListener(TABLE_ORDER_REQUEST_EVENT, openSalesForTableOrder);
});

async function openSalesForInvoiceEdit() {
    const wasSalesActive = activeKey.value === "sales";
    activeKey.value = "sales";
    if (wasSalesActive) return;
    await nextTick();
    window.dispatchEvent(new CustomEvent(INVOICE_EDIT_REQUEST_EVENT));
}

async function openSalesForTableOrder() {
    const wasSalesActive = activeKey.value === "sales";
    activeKey.value = "sales";
    if (wasSalesActive) return;
    await nextTick();
    window.dispatchEvent(new CustomEvent(TABLE_ORDER_REQUEST_EVENT));
}

function logout() {
    const username = auth.user?.username;
    logoutDesktopUser();
    if (username) void logoutDesktop(username);
}

function openSite() {
    window.open('https://pargasdesi.ir', '_blank');
}
</script>

<template>
    <div class="dw-shell">
        <header class="dw-topbar">
            <div class="dw-brand">
                <div class="dw-logo" v-on:click="openSite()">Pargas Group</div>
                <div class="dw-title">
                    <div class="dw-title-main">پنل دسکتاپ</div>
                </div>
            </div>

            <nav class="dw-tabs">
                <button v-for="t in availableTabs" :key="t.key" class="dw-tab" :class="{ active: t.key === activeKey }"
                    @click="activeKey = t.key">
                    {{ t.title }}
                </button>
            </nav>

            <div class="dw-actions">
                <button class="dw-chip" title="کاربر">{{ auth.user?.username || "کاربر" }}</button>
                <button class="dw-chip danger" title="خروج" @click="logout">خروج</button>
            </div>
        </header>

        <main class="dw-content">
            <component :is="activeComponent" />
        </main>
    </div>
</template>

<style scoped>
.dw-shell {
    height: 100vh;
    display: flex;
    flex-direction: column;
    direction: rtl;
    background: #10131a;
    color: #eef2ff;
}

.dw-topbar {
    display: grid;
    grid-template-columns: minmax(260px, 1fr) auto minmax(220px, 1fr);
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(10px);
}

.dw-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
}

.dw-logo {
    width: 120px;
    height: 44px;
    border-radius: 14px;
    display: grid;
    place-items: center;
    font-weight: 900;
    letter-spacing: 1px;
    background: rgba(20, 184, 166, 0.18);
    border: 1px solid rgba(20, 184, 166, 0.34);
    cursor: pointer;
}

.dw-title {
    min-width: 0;
}

.dw-title-main {
    font-weight: 900;
    font-size: 16px;
}

.dw-title-sub {
    font-size: 12px;
    opacity: 0.7;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dw-tabs {
    display: flex;
    gap: 10px;
    padding: 6px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
}

.dw-tab {
    min-height: 46px;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 15px;
    color: #e5e7eb;
    background: transparent;
    border: 1px solid transparent;
    cursor: pointer;
}

.dw-tab.active {
    background: rgba(20, 184, 166, 0.16);
    border-color: rgba(20, 184, 166, 0.34);
    font-weight: 800;
}

.dw-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.dw-chip {
    min-height: 40px;
    padding: 8px 12px;
    border-radius: 999px;
    font-size: 13px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #e5e7eb;
}

.dw-chip.online {
    color: #bbf7d0;
    border-color: rgba(34, 197, 94, 0.22);
    background: rgba(34, 197, 94, 0.1);
}

.dw-chip.danger {
    color: #fecaca;
    border-color: rgba(239, 68, 68, 0.22);
    background: rgba(239, 68, 68, 0.1);
    cursor: pointer;
}

.dw-content {
    flex: 1;
    min-height: 0;
    padding: 12px;
}
</style>
