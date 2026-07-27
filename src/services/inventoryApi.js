import { GetApiAddress } from "../utilities";
async function getInventoryApiAddress() {
    const serviceAdd = await GetApiAddress();
    try {
        const url = new URL(serviceAdd);
        const currentPort = Number(url.port || (url.protocol === "https:" ? 443 : 80));
        url.port = String(currentPort + 1);
        url.pathname = "/inventory";
        url.search = "";
        url.hash = "";
        return url.toString().replace(/\/$/, "");
    }
    catch {
        return String(serviceAdd).replace(/:(\d+)(\/?$)/, (_match, port) => `:${Number(port) + 1}/inventory`);
    }
}
async function postInventory(path, data = {}) {
    const inventoryAdd = await getInventoryApiAddress();
    const response = await fetch(`${inventoryAdd}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!result?.status) {
        throw new Error(result?.message || "خطا در عملیات انبار");
    }
    return result;
}
export function loadInventoryBootstrap() {
    return postInventory("bootstrap");
}
export function saveInventorySettings(data) {
    return postInventory("settings/save", data);
}
export function saveWarehouse(data) {
    return postInventory("warehouse/save", data);
}
export function saveGoodsLimits(items) {
    return postInventory("goods/limits/save", { Items: items });
}
export function saveInventoryDocument(data) {
    return postInventory("document/save", data);
}
export function listInventoryDocuments(filters) {
    return postInventory("documents/list", filters);
}
export function loadStockReport(filters) {
    return postInventory("report/stock", filters);
}
export function loadKardexReport(filters) {
    return postInventory("report/kardex", filters);
}
export function loadInventoryChangeLogs() {
    return postInventory("change-logs");
}
export function rebuildInventoryBalances(fiscalYearId) {
    return postInventory("rebuild-balances", { FiscalYearId: fiscalYearId || 0 });
}
