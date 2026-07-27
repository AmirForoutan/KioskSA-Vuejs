import { GetApiAddress } from "../utilities";
const jsonHeaders = { "Content-Type": "application/json; charset=utf-8" };
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
function getPersianYear(date) {
    const parts = new Intl.DateTimeFormat("fa-IR-u-nu-latn", { year: "numeric" }).formatToParts(date);
    return Number(parts.find((part) => part.type === "year")?.value || 0);
}
function normalizeFiscalYear(row) {
    const titleYear = Number(String(row.Title || "").match(/\d{4}/)?.[0] || 0);
    const startYear = Number(String(row.StartDate || "").split("/")[0] || 0);
    const yearCandidate = titleYear || startYear;
    if (!yearCandidate || yearCandidate < 1700)
        return row;
    const persianYear = getPersianYear(new Date(yearCandidate, 6, 1));
    if (!persianYear)
        return row;
    return {
        ...row,
        Title: `سال مالی ${persianYear}`,
        StartDate: `${persianYear}/01/01`,
        EndDate: `${persianYear}/12/29`,
    };
}
function normalizeInventoryBootstrap(data) {
    return {
        ...data,
        fiscalYears: (data.fiscalYears || []).map(normalizeFiscalYear),
    };
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
        headers: jsonHeaders,
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
        headers: jsonHeaders,
        body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!result?.status) {
        throw new Error(result?.message || "خطا در عملیات آنالیز کالا");
    }
    return result;
}
export async function loadInventoryBootstrap() {
    const data = await postInventory("bootstrap");
    return normalizeInventoryBootstrap(data);
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
