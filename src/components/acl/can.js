import { useAuthState } from "../stores/auth.store";
export function can(permission) {
    const auth = useAuthState();
    return !!auth.user?.permissions?.includes(permission);
}
