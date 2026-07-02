<!-- src/views/RootView.vue -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from "vue";
import { GetViewMode } from "../utilities"; // موجود است:contentReference[oaicite:7]{index=7}

import DesktopWorkspace from "./desktop/DesktopWorkspace.vue";
import LoginView from "./desktop/LoginView.vue";
import KioskView from "../App.vue";
import { logoutDesktop } from "../services/desktopApi";
import { hydrateDesktopUser, logoutDesktopUser, useAuthState } from "../components/stores/auth.store";

const mode = computed(() => Number(GetViewMode()));
const auth = useAuthState();
const idleMs = 60 * 60 * 1000;
let idleTimer: number | undefined;

hydrateDesktopUser();

watch(() => auth.user, () => resetIdleTimer());

const CurrentView = computed(() => {
    if (mode.value === 3) return auth.user ? DesktopWorkspace : LoginView; // Desktop Workspace
    if (mode.value === 2) return KioskView;        // Kiosk
    return KioskView;
});

function logout() {
    const username = auth.user?.username;
    logoutDesktopUser();
    if (username) void logoutDesktop(username);
}

function resetIdleTimer() {
    if (mode.value !== 3 || !auth.user) return;
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(logout, idleMs);
}

function clearSessionOnTabClose() {
    logoutDesktopUser();
}

onMounted(() => {
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetIdleTimer, { passive: true }));
    window.addEventListener("pagehide", clearSessionOnTabClose);
    resetIdleTimer();
});

onUnmounted(() => {
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((event) => window.removeEventListener(event, resetIdleTimer));
    window.removeEventListener("pagehide", clearSessionOnTabClose);
    window.clearTimeout(idleTimer);
});
</script>

<template>
    <component :is="CurrentView" />
</template>
