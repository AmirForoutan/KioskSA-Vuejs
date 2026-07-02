import { reactive } from "vue";
const state = reactive({
    user: null,
});
const SESSION_KEY = "desktop-auth-user";
export function hydrateDesktopUser() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw)
        return;
    try {
        state.user = JSON.parse(raw);
    }
    catch {
        sessionStorage.removeItem(SESSION_KEY);
        state.user = null;
    }
}
export function setDesktopUser(user) {
    state.user = user;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}
export function logoutDesktopUser() {
    state.user = null;
    sessionStorage.removeItem(SESSION_KEY);
}
export function seedDesktopUser() {
    if (!state.user)
        hydrateDesktopUser();
}
export function useAuthState() {
    return state;
}
