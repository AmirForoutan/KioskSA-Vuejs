import { useAuthState } from "../stores/auth.store";

export function can(permission: string): boolean {
    const auth = useAuthState();
    return !!auth.user?.permissions?.includes(permission);
}