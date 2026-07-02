import { GetApiAddress, sendToAmountPOS } from "../utilities";
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
    return unwrapData(response, ["discounts", "Discounts"]);
}
export async function saveLocalDiscount(payload) {
    const response = await postApi("/pc/discounts/save", payload);
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
    return assertOk(response, "خطا در غیرفعال کردن کارت تخفیف");
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
