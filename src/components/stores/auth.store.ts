import { reactive } from "vue";

export type User = {
    username: string;
    permissions: string[];
    roleTitle?: string;
    discountPercentLimit?: number;
    discountAmountLimit?: number;
    DiscountPercentLimit?: number;
    DiscountAmountLimit?: number;
};

const state = reactive({
    user: null as User | null,
});

const SESSION_KEY = "desktop-auth-user";

export function hydrateDesktopUser() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    try {
        state.user = JSON.parse(raw) as User;
    } catch {
        sessionStorage.removeItem(SESSION_KEY);
        state.user = null;
    }
}

export function setDesktopUser(user: User) {
    state.user = user;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function logoutDesktopUser() {
    state.user = null;
    sessionStorage.removeItem(SESSION_KEY);
}

export function seedDesktopUser() {
    if (!state.user) hydrateDesktopUser();
}

export function useAuthState() {
    return state;
}
