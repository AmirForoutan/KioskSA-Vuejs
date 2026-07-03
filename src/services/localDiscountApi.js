import { GetApiAddress, sendToAmountPOS } from "../utilities";
const CUSTOMER_META_PREFIX = "[CUSTOMER_DISCOUNT_IDS:";
const CUSTOMER_META_SUFFIX = "]";
function packCustomerIds(description, customerIds) {
    const clean = unpackCustomerIds(description).description;
    const ids = Array.from(new Set((customerIds || []).map(Number).filter((id) => Number.isFinite(id) && id > 0)));
    if (!ids.length)
        return clean || undefined;
    const meta = `${CUSTOMER_META_PREFIX}${ids.join(",")}${CUSTOMER_META_SUFFIX}`;
    return `${clean ? `${clean}\n` : ""}${meta}`;
}
export function unpackCustomerIds(description) {
    const text = String(description ?? "");
    const start = text.indexOf(CUSTOMER_META_PREFIX);
    if (start < 0)
        return { description: text, customerIds: [] };
    const end = text.indexOf(CUSTOMER_META_SUFFIX, start + CUSTOMER_META_PREFIX.length);
    if (end < 0)
        return { description: text, customerIds: [] };
    const raw = text.slice(start + CUSTOMER_META_PREFIX.length, end);
    const customerIds = raw
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isFinite(item) && item > 0);
    const descriptionOnly = `${text.slice(0, start)}${text.slice(end + CUSTOMER_META_SUFFIX.length)}`.trim();
    return { description: descriptionOnly, customerIds };
}
function normalizeDiscount(row) {
    const unpacked = unpackCustomerIds(row.Description);
    return {
        ...row,
        Description: unpacked.description,
        CustomerIds: Array.isArray(row.CustomerIds) && row.CustomerIds.length ? row.CustomerIds : unpacked.customerIds,
    };
}
async function postAt(baseUrl, endpoint, body) {
    const base = baseUrl.replace(/\/$/, "");
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const response = await fetch(`${base}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
    });
    if (!response.ok)
        throw new Error(`HTTP ${response.status} for ${endpoint}`);
    return (await response.json());
}
async function postApi(endpoint, body = {}) {
    const base = await GetApiAddress();
    return postAt(base, endpoint, body);
}
async function postPos(endpoint, body = {}) {
    const base = await sendToAmountPOS();
    return postAt(base, endpoint, body);
}
function assertOk(response, fallbackMessage) {
    if (response?.status === false || response?.status === "false") {
        throw new Error(response.message || fallbackMessage);
    }
    return response;
}
function unwrapData(response, keys = []) {
    if (Array.isArray(response))
        return response;
    if (Array.isArray(response?.data))
        return response.data;
    const record = response;
    for (const key of keys) {
        if (Array.isArray(record[key]))
            return record[key];
    }
    return [];
}
export async function listLocalDiscounts() {
    const response = await postApi("/pc/discounts/list", {});
    assertOk(response, "خطا در دریافت تخفیف‌ها");
    return unwrapData(response, ["discounts", "Discounts"]).map(normalizeDiscount);
}
export async function saveLocalDiscount(payload) {
    const response = await postApi("/pc/discounts/save", {
        ...payload,
        Description: packCustomerIds(payload.Description, payload.CustomerIds),
    });
    return assertOk(response, "خطا در ذخیره تخفیف");
}
export async function disableLocalDiscount(discountId) {
    const response = await postApi("/pc/discounts/delete", { DiscountId: discountId });
    return assertOk(response, "خطا در غیرفعال کردن تخفیف");
}
export async function listLocalDiscountCards() {
    const response = await postApi("/pc/discount-cards/list", {});
    assertOk(response, "خطا در دریافت کارت‌های تخفیف");
    return unwrapData(response, ["cards", "Cards"]);
}
export async function saveLocalDiscountCard(payload) {
    const response = await postApi("/pc/discount-cards/save", payload);
    return assertOk(response, "خطا در ذخیره کارت تخفیف");
}
export async function disableLocalDiscountCard(discountCardId) {
    const response = await postApi("/pc/discount-cards/delete", { DiscountCardId: discountCardId });
    return assertOk(response, "خطا در غیرفعال کردن کارت");
}
export async function listLocalDiscountCardTransactions(params = {}) {
    const response = await postApi("/pc/discount-card-transactions/list", params);
    assertOk(response, "خطا در دریافت تراکنش‌های کارت تخفیف");
    return unwrapData(response, ["transactions", "Transactions"]);
}
export async function getLocalDiscountCardForKiosk(cardNumber, connectionId = 0) {
    const response = await postPos("/discountscart", {
        ConnectionsId: connectionId,
        DiscountCart: cardNumber,
    });
    return assertOk(response, "کارت تخفیف معتبر نیست");
}
