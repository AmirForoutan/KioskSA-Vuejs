import { ref } from "vue";
export const INVOICE_EDIT_REQUEST_EVENT = "desktop:invoice-edit-request";
const STORAGE_KEY = "desktop:invoice-edit-draft";
const draft = ref(null);
export function requestInvoiceEdit(invoice, items) {
    draft.value = {
        invoice: { ...invoice },
        items: items.map((item) => ({ ...item })),
        requestedAt: Date.now(),
    };
    saveDraft(draft.value);
    window.dispatchEvent(new CustomEvent(INVOICE_EDIT_REQUEST_EVENT));
}
export function peekInvoiceEditRequest() {
    const current = draft.value || readDraft();
    if (current)
        draft.value = current;
    return current;
}
export function clearInvoiceEditRequest(requestedAt) {
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
export function consumeInvoiceEditRequest() {
    const current = peekInvoiceEditRequest();
    clearInvoiceEditRequest(current?.requestedAt);
    return current;
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
        return parsed?.invoice && Array.isArray(parsed.items) ? parsed : null;
    }
    catch {
        return null;
    }
}
