import { ref } from "vue";
export const TABLE_ORDER_REQUEST_EVENT = "desktop:table-order-request";
const STORAGE_KEY = "desktop:table-order-draft";
const draft = ref(null);
export function requestTableOrder(table) {
    draft.value = {
        table: { ...table },
        requestedAt: Date.now(),
    };
    saveDraft(draft.value);
    window.dispatchEvent(new CustomEvent(TABLE_ORDER_REQUEST_EVENT));
}
export function peekTableOrderRequest() {
    const current = draft.value || readDraft();
    if (current)
        draft.value = current;
    return current;
}
export function clearTableOrderRequest(requestedAt) {
    const current = draft.value || readDraft();
    if (requestedAt && current?.requestedAt !== requestedAt)
        return;
    draft.value = null;
    try {
        window.sessionStorage.removeItem(STORAGE_KEY);
    }
    catch {
        return;
    }
}
function saveDraft(value) {
    try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    }
    catch {
        return;
    }
}
function readDraft() {
    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        return parsed?.table ? parsed : null;
    }
    catch {
        return null;
    }
}
