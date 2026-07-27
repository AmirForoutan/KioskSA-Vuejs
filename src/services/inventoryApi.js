import { GetApiAddress } from "../utilities";
async function buildServiceAddress(offset, path) {
    const serviceAdd = await GetApiAddress();
    try {
        const url = new URL(serviceAdd);
        const currentPort = Number(url.port || (url.protocol === "https:" ? 443 : 80));
        url.port = String(currentPort + offset);
        url.pathname = path;
        url.search = "";
        url.hash = "";
        return url.toString().replace(/\/$/, "");
    }
    catch {
        return String(serviceAdd).replace(/:(\d+)(\/?$)/, (_match, port) => `:${Number(port) + offset}${path}`);
    }
}
async function getInventoryApiAddress() {
    return buildServiceAddress(1, "/inventory");
}
async function getInventoryAnalysisApiAddress() {
    return buildServiceAddress(2, "/inventory-analysis");
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
async function postInventoryAnalysis(path, data = {}) {
    const inventoryAdd = await getInventoryAnalysisApiAddress();
    const response = await fetch(`${inventoryAdd}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!result?.status) {
        throw new Error(result?.message || "خطا در عملیات آنالیز کالا");
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
export function loadInventoryAnalysisBootstrap() {
    return postInventoryAnalysis("bootstrap");
}
export function saveGoodsUsage(items) {
    return postInventoryAnalysis("goods-usage/save", { Items: items });
}
export function saveGoodsRecipe(productGoodsId, items) {
    return postInventoryAnalysis("recipe/save", {
        ProductGoodsId: productGoodsId,
        Items: items,
    });
}
export function checkInvoiceStockByRecipe(items) {
    return postInventoryAnalysis("check-invoice-stock", { Items: items });
}
