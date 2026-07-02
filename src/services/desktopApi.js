import { GetApiAddress, sendToAmountPOS } from "../utilities";
function buildUrl(baseUrl, endpoint) {
    const base = baseUrl.replace(/\/$/, "");
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
}
async function postAt(baseUrl, endpoint, body, contentType) {
    const response = await fetch(buildUrl(baseUrl, endpoint), {
        method: "POST",
        headers: { "Content-Type": contentType },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${endpoint}`);
    }
    return (await response.json());
}
async function postPos(endpoint, body) {
    const serviceAdd = await sendToAmountPOS();
    return postAt(serviceAdd, endpoint, body, "application/x-www-form-urlencoded");
}
async function postApi(endpoint, body) {
    const serviceAdd = await GetApiAddress();
    return postAt(serviceAdd, endpoint, body, "application/json");
}
async function postApiFallback(candidates) {
    let lastError;
    for (const candidate of candidates) {
        try {
            return await postApi(candidate.endpoint, candidate.body);
        }
        catch (error) {
            lastError = error;
        }
    }
    throw lastError instanceof Error ? lastError : new Error("No API endpoint succeeded");
}
function readArrayFromRecord(record, keys) {
    for (const key of keys) {
        const value = record[key];
        if (Array.isArray(value))
            return value;
    }
    return [];
}
export function unwrapArray(payload, keys) {
    if (Array.isArray(payload))
        return payload;
    if (!payload || typeof payload !== "object")
        return [];
    const record = payload;
    const top = readArrayFromRecord(record, keys);
    if (top.length)
        return top;
    const data = record.data;
    if (Array.isArray(data))
        return data;
    if (data && typeof data === "object") {
        const nested = readArrayFromRecord(data, keys);
        if (nested.length)
            return nested;
    }
    const result = record.Result;
    if (Array.isArray(result))
        return result;
    if (result && typeof result === "object") {
        return readArrayFromRecord(result, keys);
    }
    return [];
}
function findNestedArray(payload, keys, depth = 0) {
    if (Array.isArray(payload))
        return payload;
    if (!payload || typeof payload !== "object" || depth > 4)
        return [];
    const record = payload;
    const direct = readArrayFromRecord(record, keys);
    if (direct.length)
        return direct;
    for (const key of ["data", "Data", "result", "Result", "payload", "Payload"]) {
        const found = findNestedArray(record[key], keys, depth + 1);
        if (found.length)
            return found;
    }
    for (const value of Object.values(record)) {
        if (!value || typeof value !== "object")
            continue;
        const found = findNestedArray(value, keys, depth + 1);
        if (found.length)
            return found;
    }
    return [];
}
export async function loadDesktopCatalog(connectionId = 0) {
    const [categoriesResponse, goodsResponse] = await Promise.all([
        postPos("/getgoodsgroup", { ConnectionsId: connectionId }),
        postPos("/getgoods", { ConnectionsId: connectionId }),
    ]);
    return {
        categories: unwrapArray(categoriesResponse, [
            "GoodsGroup",
            "Groups",
            "Categories",
            "categories",
        ]),
        goods: unwrapArray(goodsResponse, ["Goods", "Products", "goods", "products"]),
    };
}
export async function searchDesktopCustomers(searchTerm) {
    const response = await postApi("/searchcustomer", {
        searchTerm,
        SearchTerm: searchTerm,
        PhoneNumber: searchTerm,
    });
    const customers = unwrapArray(response, [
        "Customers",
        "Customer",
        "customers",
        "Result",
    ]);
    if (customers.length)
        return customers;
    if (response && typeof response === "object") {
        const record = response;
        const data = record.data;
        if (data && typeof data === "object" && !Array.isArray(data)) {
            return [data];
        }
    }
    return [];
}
export async function loadDesktopCustomers(searchTerm = "") {
    const response = await postApi("/getcustomers", {
        SearchTerm: searchTerm,
        searchTerm,
        HasCredit: false,
    });
    return unwrapArray(response, ["Customers", "customers", "data"]);
}
export async function sendDesktopInvoice(invoiceData) {
    return postPos("/printers", invoiceData);
}
export async function payDesktopPos(amount) {
    return postPos("/pay", { Amount: amount });
}
export async function fetchDesktopCustomerCredit(customerPhone) {
    return postApi("/getcustomercredit", { PhoneNumber: customerPhone });
}
export async function useDesktopCustomerCredit(payment) {
    return postApi("/paycustomerdebt", {
        CashAmount: 0,
        PosAmount: 0,
        CreditAmount: 0,
        ...payment,
    });
}
export async function saveDesktopProduct(product) {
    return postApi("/setproducts", product);
}
export async function saveDesktopCategory(category) {
    return postApi("/setcategories", category);
}
export async function saveDesktopCustomer(customer) {
    return postApi("/savecustomer", customer);
}
export async function deleteDesktopCustomer(customerId) {
    return postApi("/deletecustomer", { CustomerId: customerId, UserId: customerId });
}
export async function manageDesktopCredit(credit) {
    return postApi("/managecredit", credit);
}
export async function loadDesktopInvoices(filter) {
    const response = await postApi("/getinvoices", filter);
    return unwrapArray(response, ["Invoices", "invoices", "data"]);
}
export async function saveDesktopInvoice(invoice) {
    const invoiceId = invoice.SaleInvoiceId ?? invoice.InvoiceId;
    const body = {
        ...invoice,
        SaleInvoiceId: invoiceId,
        saleInvoiceId: invoiceId,
        InvoiceId: invoiceId,
        invoiceId,
        Id: invoiceId,
    };
    try {
        return await postApi("/saveinvoice", body);
    }
    catch {
        return postApi("/setinvoice", body);
    }
}
export async function updateDesktopInvoice(invoiceId, invoiceData) {
    const body = {
        ...invoiceData,
        SaleInvoiceId: invoiceId,
        saleInvoiceId: invoiceId,
        InvoiceId: invoiceId,
        invoiceId,
        Id: invoiceId,
    };
    return postApiFallback([
        { endpoint: "/updateinvoice", body },
        { endpoint: "/saveinvoice", body },
        { endpoint: "/setinvoice", body },
    ]);
}
export async function deleteDesktopInvoice(invoiceId) {
    const body = {
        SaleInvoiceId: invoiceId,
        saleInvoiceId: invoiceId,
        InvoiceId: invoiceId,
        invoiceId,
        Id: invoiceId,
        Type: "Invoice",
    };
    return postApiFallback([
        { endpoint: "/deleteinvoice", body },
        { endpoint: "/invoice/delete", body },
        { endpoint: "/deleteitem", body: { ...body, Type: "SaleInvoice" } },
        { endpoint: "/deleteitem", body },
    ]);
}
export async function loadDesktopCreditTransactions(filter) {
    const response = await postApi("/credittransactions", filter);
    return unwrapArray(response, ["Transactions", "transactions", "Receipts", "receipts", "data"]);
}
export async function loadDesktopInvoiceItems(invoiceId) {
    const response = await postApi("/getinvoiceitems", {
        SaleInvoiceId: invoiceId,
        saleInvoiceId: invoiceId,
        InvoiceId: invoiceId,
        invoiceId,
    });
    const items = findNestedArray(response, [
        "InvoiceItems",
        "invoiceItems",
        "Items",
        "items",
    ]);
    const toppings = findNestedArray(response, [
        "InvoiceToppings",
        "invoiceToppings",
        "Toppings",
        "toppings",
    ]).map(normalizeDesktopInvoiceTopping);
    const toppingsByItemId = toppings.reduce((map, topping) => {
        const key = String(topping.OrderItemId ?? topping.SaleInvoiceItemId ?? topping.InvoiceItemId ?? "");
        if (!key)
            return map;
        map.set(key, [...(map.get(key) || []), topping]);
        return map;
    }, new Map());
    return items.map((item) => {
        const normalized = normalizeDesktopInvoiceItem(item);
        const key = String(normalized.SaleInvoiceItemId ?? normalized.InvoiceItemId ?? "");
        const existingToppings = findNestedArray(normalized, [
            "InvoiceToppings",
            "invoiceToppings",
            "Toppings",
            "toppings",
        ]).map(normalizeDesktopInvoiceTopping);
        const mergedToppings = [...existingToppings, ...(toppingsByItemId.get(key) || [])];
        return {
            ...normalized,
            Toppings: mergedToppings,
            toppings: mergedToppings,
        };
    });
}
function normalizeDesktopInvoiceItem(item) {
    const goodsId = item.GoodsId ?? item.ProductId;
    const goodsCode = item.GoodsCode ?? item.ProductCode;
    const goodsName = item.GoodsName ?? item.ProductTitle ?? item.ProductName;
    const unitPrice = item.GoodsPrice ?? item.Price ?? item.ProductPrice;
    const total = item.TotalPrice ?? item.Payable ?? item.SumPrice ?? item.SumItem ?? item.GoodsSumItem;
    const tax = item.Tax ?? item.ProductTax;
    return {
        ...item,
        GoodsId: goodsId,
        GoodsCode: goodsCode,
        GoodsName: goodsName,
        GoodsPrice: unitPrice,
        Price: unitPrice,
        TotalPrice: total,
        Tax: tax,
    };
}
function normalizeDesktopInvoiceTopping(topping, index = 0) {
    const record = topping;
    const productId = topping.ProductId ?? record.ToppingProductId ?? record.GoodsToppingId;
    const goodsId = topping.GoodsId ?? topping.GoodsToppingId ?? productId;
    const count = topping.Count ?? topping.GoodsCount ?? record.Quantity;
    const name = topping.GoodsName ?? topping.ToppingName ?? record.ProductTitle ?? record.ProductName;
    return {
        ...topping,
        ItemToppingId: primitiveApiKey(topping.ItemToppingId ?? record.SaleInvoiceItemToppingId, ""),
        OrderItemId: primitiveApiKey(topping.OrderItemId ?? topping.SaleInvoiceItemId ?? topping.InvoiceItemId, ""),
        ToppingProductId: primitiveApiKey(topping.ToppingProductId ?? productId, index),
        ToppingId: primitiveApiKey(topping.ToppingId ?? record.Id, index),
        GoodsName: String(name || "تاپینگ"),
        GoodsId: primitiveApiKey(goodsId, index),
        Price: Number(topping.Price ?? record.GoodsPrice) || 0,
        LevelId: primitiveApiKey(topping.LevelId ?? record.ToppingLevelId, 0),
        LevelName: String(topping.LevelName ?? record.LevelTitle ?? ""),
        Count: Math.max(1, Number(count) || 1),
    };
}
function primitiveApiKey(value, fallback) {
    if (typeof value === "string" || typeof value === "number")
        return value;
    if (value !== undefined && value !== null)
        return String(value);
    return fallback;
}
export async function loadDesktopToppingData(connectionId = 0) {
    const [itemsResponse, levelsResponse, linksResponse, goodsResponse] = await Promise.all([
        postPos("/gettoppinggoods", { ConnectionsId: connectionId }),
        postPos("/gettoppinglevel", { ConnectionsId: connectionId }),
        postPos("/toppinggoodsdetails", { ConnectionsId: connectionId }),
        postPos("/getgoods", { ConnectionsId: connectionId }),
    ]);
    return {
        items: unwrapArray(itemsResponse, ["ToppingGoods", "Goods", "data"]),
        levels: unwrapArray(levelsResponse, ["ToppingLevel", "Levels", "data"]),
        links: unwrapArray(linksResponse, ["Goods", "Toppings", "ToppingGoods", "data"]),
        products: unwrapArray(goodsResponse, ["Goods", "Products", "data"]),
    };
}
export async function saveDesktopToppingItem(item) {
    return postApi("/settoppingitem", item);
}
export async function saveDesktopToppingLevel(level) {
    return postApi("/settoppinglevel", level);
}
export async function saveDesktopProductTopping(link) {
    return postApi("/settoppingproducts", link);
}
export async function fetchRuntimeConfig() {
    const response = await fetch("./config.json", { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} for config.json`);
    }
    return (await response.json());
}
export async function saveDesktopSettings(settings) {
    const target = settings.ServiceAPIAddress || settings.ServiceAddress || (await GetApiAddress());
    return postAt(target, "/settings/save", settings, "application/json");
}
export async function loadDesktopDeviceSettings() {
    const response = await postApi("/device-settings/list", {});
    if (response && typeof response === "object") {
        const record = response;
        return {
            currentComputerName: String(record.currentComputerName || ""),
            currentComputerId: Number(record.currentComputerId || 0),
            computers: unwrapArray(response, ["computers", "Computers"]),
            windowsPrinters: unwrapArray(response, ["windowsPrinters", "WindowsPrinters"]),
            printTemplates: unwrapArray(response, ["printTemplates", "PrintTemplates"]),
            printUsageTypes: unwrapArray(response, ["printUsageTypes", "PrintUsageTypes"]),
            printerSettings: unwrapArray(response, ["printerSettings", "PrinterSettings"]),
            posTypes: unwrapArray(response, ["posTypes", "PosTypes"]),
            posSettings: unwrapArray(response, ["posSettings", "PosSettings"]),
        };
    }
    return {
        currentComputerName: "",
        currentComputerId: 0,
        computers: [],
        windowsPrinters: [],
        printTemplates: [],
        printUsageTypes: [],
        printerSettings: [],
        posTypes: [],
        posSettings: [],
    };
}
export async function saveDesktopPrinterSetting(printer) {
    return postApi("/device-settings/printer/save", printer);
}
export async function deleteDesktopPrinterSetting(printerId) {
    return postApi("/device-settings/printer/delete", { Id: printerId });
}
export async function saveDesktopPosSetting(pos) {
    return postApi("/device-settings/pos/save", pos);
}
export async function deleteDesktopPosSetting(posSettingId) {
    return postApi("/device-settings/pos/delete", { Id: posSettingId });
}
export async function loadDesktopTables() {
    const response = await postApi("/tables", {});
    return {
        groups: unwrapArray(response, ["groups", "Groups", "tableGroups", "TableGroups"]),
        tables: unwrapArray(response, ["tables", "Tables", "diningTables", "DiningTables"]),
    };
}
export async function saveDesktopTableGroup(group) {
    return postApi("/tables/group/save", group);
}
export async function saveDesktopTable(table) {
    return postApi("/tables/table/save", table);
}
export async function settleDesktopTableInvoice(invoiceId, payDetails) {
    return postApi("/tables/settle", {
        SaleInvoiceId: invoiceId,
        InvoiceId: invoiceId,
        Id: invoiceId,
        PayDetails: payDetails,
    });
}
export async function moveDesktopTableInvoice(invoiceId, targetTableId) {
    return postApi("/tables/move", {
        SaleInvoiceId: invoiceId,
        InvoiceId: invoiceId,
        Id: invoiceId,
        TargetTableId: targetTableId,
    });
}
export async function printDesktopInvoice(invoiceId, usage) {
    return postApi("/printinvoice", {
        SaleInvoiceId: invoiceId,
        InvoiceId: invoiceId,
        Id: invoiceId,
        PrintUsageType: usage === "kitchen" ? 2 : 1,
    });
}
export async function testDesktopService(serviceAddress) {
    const base = serviceAddress || (await sendToAmountPOS());
    return postAt(base, "/license", { Barcode: "00" }, "application/x-www-form-urlencoded");
}
export async function loginDesktop(username, password) {
    return postApi("/auth/login", { username, password });
}
export async function logoutDesktop(username) {
    return postApi("/auth/logout", { username });
}
export async function loadDesktopAccess() {
    const response = await postApi("/access/list", {});
    const roles = unwrapArray(response, ["roles", "Roles"]);
    const users = unwrapArray(response, ["users", "Users"]);
    if (roles.length || users.length)
        return { roles, users };
    if (response && typeof response === "object") {
        const record = response;
        return {
            roles: Array.isArray(record.roles) ? record.roles : [],
            users: Array.isArray(record.users) ? record.users : [],
        };
    }
    return { roles: [], users: [] };
}
export async function saveDesktopRole(role) {
    return postApi("/roles/save", role);
}
export async function saveDesktopUser(user) {
    return postApi("/users/save", user);
}
