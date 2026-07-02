import { GetApiAddress, sendToAmountPOS } from "../utilities";

export type ApiEnvelope<T = unknown> = {
  status?: boolean | string;
  message?: string;
  data?: T;
  [key: string]: unknown;
};

export type DesktopCategory = {
  GroupId: number | string;
  GroupName: string;
  GroupCode?: number | string;
  GroupTitle?: string;
  IsActive?: boolean;
  [key: string]: unknown;
};

export type DesktopProduct = {
  GoodsId: number | string;
  GoodsCode?: number | string;
  GoodsName: string;
  GoodsDescription?: string;
  GoodsPrice: number;
  GoodsGroupId: number | string;
  TaxPercent?: number;
  DutyPercent?: number;
  PackingPrice?: number;
  StockInventory?: number;
  IsActive?: boolean;
  [key: string]: unknown;
};

export type DesktopCustomer = {
  UserId?: number | string;
  CustomerId?: number | string;
  Firstname?: string;
  Lastname?: string;
  FullName?: string;
  Name?: string;
  PhoneNumber?: string;
  Mobile?: string;
  Credit?: number;
  CreditBalance?: number;
  Balance?: number;
  Notes?: string;
  IsActive?: boolean;
  [key: string]: unknown;
};

export type DesktopInvoiceCustomerData = DesktopCustomer & {
  CustomerId: number | string;
  userName: string;
  UserPhone: string;
  usedCredit?: number;
  usedDiscount?: { DiscountId?: number | string } | null;
  totalDiscount?: number;
};

export type DesktopInvoice = {
  SaleInvoiceId: number;
  SaleInvoiceNumberDay: number;
  OrderDate: string;
  OrderTime: string;
  CustomerCode: number;
  CustomerName: string;
  Phone: string;
  Price: number;
  Discount?: number;
  Tax: number;
  PackingPrice: number;
  Payable: number;
  PosPrice?: number;
  CashPrice?: number;
  CreditPrice?: number;
  ReceivedAmount?: number;
  RefundAmount?: number;
  NetPaidAmount?: number;
  PaymentDifference?: number;
  HasFinancialReceipts?: boolean;
  LastReceiptDate?: string;
  LastModifyDate?: string;
  TableId?: number;
  TableTitle?: string;
  TableCode?: string;
  IsSettled?: boolean;
  TableOpenedAt?: string;
  SettledAt?: string;
  InvoiceTypeName: string;
  [key: string]: unknown;
};

export type DesktopCreditTransaction = {
  TransactionId: number;
  CustomerId: number;
  CustomerName: string;
  Phone: string;
  TransactionType: number;
  TransactionTypeName: string;
  Amount: number;
  Description: string;
  InvoiceId?: number;
  InvoiceNumber?: number;
  InvoiceDate?: string;
  TransactionDate: string;
  [key: string]: unknown;
};

export type DesktopInvoiceItem = {
  SaleInvoiceId?: number;
  InvoiceId?: number;
  SaleInvoiceItemId?: number;
  InvoiceItemId?: number;
  GoodsId?: number;
  ProductId?: number;
  GoodsCode?: number | string;
  ProductCode?: number | string;
  GoodsName?: string;
  ProductTitle?: string;
  ProductName?: string;
  Quantity?: number;
  Count?: number;
  GoodsCount?: number;
  Price?: number;
  GoodsPrice?: number;
  ProductPrice?: number;
  SumPrice?: number;
  SumItem?: number;
  GoodsSumItem?: number;
  TotalPrice?: number;
  Payable?: number;
  Tax?: number;
  ProductTax?: number;
  ProductDiscount?: number;
  DescriptionPrice?: number;
  [key: string]: unknown;
};

export type DesktopToppingLevel = {
  LevelId: number;
  LevelTitle: string;
  Priority: number;
  MinCount: number;
  MaxCount: number;
  [key: string]: unknown;
};

export type DesktopToppingProduct = {
  GoodsId: number;
  GoodsCode: number | string;
  GoodsName: string;
  TaxPercent: number;
  DutyPercent: number;
  PackingPrice?: number;
  [key: string]: unknown;
};

export type DesktopProductTopping = {
  ToppingId: number;
  GoodsId: number;
  GoodsToppingId: number;
  LevelId: number;
  GoodsCountDefault: number;
  GoodsCount: number;
  Price: number;
  containerPrice: number;
  MinCount: number;
  MaxCount: number;
  [key: string]: unknown;
};

export type DesktopInvoiceTopping = {
  ToppingProductId: number | string;
  ToppingId: number | string;
  GoodsName: string;
  GoodsId: number | string;
  Price: number;
  LevelId: number | string;
  LevelName: string;
  Count: number;
  ItemToppingId?: number | string;
  OrderItemId?: number | string;
  SaleInvoiceItemId?: number | string;
  InvoiceItemId?: number | string;
  ProductId?: number | string;
  GoodsToppingId?: number | string;
  ToppingName?: string;
  GoodsCount?: number;
};

export type DesktopRole = {
  id: number;
  title: string;
  perms: string[];
};

export type DesktopUser = {
  id: number;
  username: string;
  password?: string;
  roleId: number;
  isActive: boolean;
  discountPercentLimit?: number;
  discountAmountLimit?: number;
  DiscountPercentLimit?: number;
  DiscountAmountLimit?: number;
};

export type DesktopLoginResult = {
  status: boolean;
  message?: string;
  user?: {
    username: string;
    permissions: string[];
    roleTitle?: string;
    discountPercentLimit?: number;
    discountAmountLimit?: number;
    DiscountPercentLimit?: number;
    DiscountAmountLimit?: number;
  };
};

export type DesktopSettings = {
  Currency: boolean;
  kioskOrder: boolean;
  scaleOrder: boolean;
  IsClub: boolean;
  IsSalon: boolean;
  IsTakeAway: boolean;
  showTables: boolean;
  TableSelectionRequired: boolean;
  KeepSalonTableOpenAfterSubmit: boolean;
  ShowKioskOrderTypeSelector: boolean;
  IsCollapseCart: boolean;
  ScaleAutoPay: boolean;
  IsMultiInvoice: boolean;
  showOrderRegistration: boolean;
  showDiscountCart: boolean;
  ShowStandByVideo: boolean;
  ShowKeyBoard: boolean;
  StandByTimer: number;
  ResetTimer: number;
  viewMode: number;
  ServiceAddress: string;
  ServiceAPIAddress: string;
};

export type DesktopComputerSetting = {
  ComputerId: number;
  ComputerName: string;
  LicenseKey?: string;
  IsActive: boolean;
};

export type DesktopPrintTemplate = {
  PrintTemplateId: number;
  TemplateName: string;
  Description: string;
};

export type DesktopPrintUsageType = {
  Id: number;
  Name: string;
};

export type DesktopPrinterSetting = {
  PrinterId: number;
  PrinterTitle: string;
  ComputerName?: string;
  ComputerId: number;
  PrinterName: string;
  PrintTemplateId: number;
  PrintTemplateName?: string;
  Copies: number;
  PrintUsageType: number;
  PrintUsageTypeName?: string;
  IsActive: boolean;
};

export type DesktopPosType = {
  Id: number;
  Name: string;
};

export type DesktopPosSetting = {
  PosSettingId: number;
  ComputerId: number;
  ComputerName?: string;
  PosType: number;
  PosTypeName?: string;
  IpAddress: string;
  Port: number;
  IsActive: boolean;
  IsTestMode: boolean;
};

export type DesktopDeviceSettings = {
  currentComputerName: string;
  currentComputerId: number;
  computers: DesktopComputerSetting[];
  windowsPrinters: string[];
  printTemplates: DesktopPrintTemplate[];
  printUsageTypes: DesktopPrintUsageType[];
  printerSettings: DesktopPrinterSetting[];
  posTypes: DesktopPosType[];
  posSettings: DesktopPosSetting[];
};

export type DesktopInvoicePayload = {
  SaleInvoiceId?: number | string;
  InvoiceId?: number | string;
  Date?: string;
  Time?: string;
  customerData: DesktopInvoiceCustomerData | { userName: string };
  items: Array<{
    id: string;
    item: DesktopProduct;
    quantity: number;
    note?: string;
  }>;
  toppings: Record<string, DesktopInvoiceTopping[]>;
  tax: number;
  packingFee: number;
  SumItems?: number;
  PayableAmount: number;
  PreviousPayableAmount?: number;
  PaymentDifference?: number;
  CurrencyName: string;
  InvoiceDiscount: number;
  saleinvoiceTypeId: number;
  BranchId: number;
  TableId?: number;
  KeepTableOpen?: boolean;
  SkipFinancialReceipt?: boolean;
  IsSettled?: boolean;
  PayDetails?: {
    PosPrice: number;
    CashPrice: number;
    CreditPrice: number;
  };
};

export type DesktopTableGroup = {
  TableGroupId: number;
  GroupTitle: string;
  GroupCode?: string;
  IsActive: boolean;
};

export type DesktopDiningTable = {
  TableId: number;
  TableGroupId: number;
  GroupTitle?: string;
  TableTitle: string;
  TableCode: string;
  IsActive: boolean;
  IsOccupied: boolean;
  SaleInvoiceId?: number;
  SaleInvoiceNumberDay?: number;
  Payable?: number;
  OpenedAt?: string;
  OccupiedMinutes?: number;
};

export type DesktopTablesState = {
  groups: DesktopTableGroup[];
  tables: DesktopDiningTable[];
};

export type DesktopCustomerCreditResult = ApiEnvelope & {
  Credit?: number;
  credit?: number;
  CreditBalance?: number;
  UID?: number | string;
  UserName?: string;
};

export type DesktopCustomerDebtPayment = {
  SaleInvoiceId: number | string;
  CustomerPhone: string;
  TotalDebt: number;
  CashAmount?: number;
  PosAmount?: number;
  CreditAmount?: number;
};

export type DesktopManageCreditRequest = {
  CustomerId: number | string;
  TransactionType: 1 | 2 | number;
  Amount: number;
  Description?: string;
};

type ContentType = "application/json" | "application/x-www-form-urlencoded";

function buildUrl(baseUrl: string, endpoint: string) {
  const base = baseUrl.replace(/\/$/, "");
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

async function postAt<T>(
  baseUrl: string,
  endpoint: string,
  body: unknown,
  contentType: ContentType
): Promise<T> {
  const response = await fetch(buildUrl(baseUrl, endpoint), {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${endpoint}`);
  }

  return (await response.json()) as T;
}

async function postPos<T>(endpoint: string, body: unknown): Promise<T> {
  const serviceAdd = await sendToAmountPOS();
  return postAt<T>(serviceAdd, endpoint, body, "application/x-www-form-urlencoded");
}

async function postApi<T>(endpoint: string, body: unknown): Promise<T> {
  const serviceAdd = await GetApiAddress();
  return postAt<T>(serviceAdd, endpoint, body, "application/json");
}

async function postApiFallback<T>(candidates: Array<{ endpoint: string; body: unknown }>): Promise<T> {
  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return await postApi<T>(candidate.endpoint, candidate.body);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No API endpoint succeeded");
}

function readArrayFromRecord<T>(record: Record<string, unknown>, keys: string[]): T[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value as T[];
  }
  return [];
}

export function unwrapArray<T>(payload: unknown, keys: string[]): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;
  const top = readArrayFromRecord<T>(record, keys);
  if (top.length) return top;

  const data = record.data;
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const nested = readArrayFromRecord<T>(data as Record<string, unknown>, keys);
    if (nested.length) return nested;
  }

  const result = record.Result;
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object") {
    return readArrayFromRecord<T>(result as Record<string, unknown>, keys);
  }

  return [];
}

function findNestedArray<T>(payload: unknown, keys: string[], depth = 0): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== "object" || depth > 4) return [];

  const record = payload as Record<string, unknown>;
  const direct = readArrayFromRecord<T>(record, keys);
  if (direct.length) return direct;

  for (const key of ["data", "Data", "result", "Result", "payload", "Payload"]) {
    const found = findNestedArray<T>(record[key], keys, depth + 1);
    if (found.length) return found;
  }

  for (const value of Object.values(record)) {
    if (!value || typeof value !== "object") continue;
    const found = findNestedArray<T>(value, keys, depth + 1);
    if (found.length) return found;
  }

  return [];
}

export async function loadDesktopCatalog(connectionId = 0) {
  const [categoriesResponse, goodsResponse] = await Promise.all([
    postPos<unknown>("/getgoodsgroup", { ConnectionsId: connectionId }),
    postPos<unknown>("/getgoods", { ConnectionsId: connectionId }),
  ]);

  return {
    categories: unwrapArray<DesktopCategory>(categoriesResponse, [
      "GoodsGroup",
      "Groups",
      "Categories",
      "categories",
    ]),
    goods: unwrapArray<DesktopProduct>(goodsResponse, ["Goods", "Products", "goods", "products"]),
  };
}

export async function searchDesktopCustomers(searchTerm: string) {
  const response = await postApi<unknown>("/searchcustomer", {
    searchTerm,
    SearchTerm: searchTerm,
    PhoneNumber: searchTerm,
  });
  const customers = unwrapArray<DesktopCustomer>(response, [
    "Customers",
    "Customer",
    "customers",
    "Result",
  ]);

  if (customers.length) return customers;
  if (response && typeof response === "object") {
    const record = response as Record<string, unknown>;
    const data = record.data;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return [data as DesktopCustomer];
    }
  }

  return [];
}

export async function loadDesktopCustomers(searchTerm = "") {
  const response = await postApi<unknown>("/getcustomers", {
    SearchTerm: searchTerm,
    searchTerm,
    HasCredit: false,
  });
  return unwrapArray<DesktopCustomer>(response, ["Customers", "customers", "data"]);
}

export async function sendDesktopInvoice(invoiceData: DesktopInvoicePayload) {
  return postPos<ApiEnvelope>("/printers", invoiceData);
}

export async function payDesktopPos(amount: number) {
  return postPos<ApiEnvelope>("/pay", { Amount: amount });
}

export async function fetchDesktopCustomerCredit(customerPhone: string) {
  return postApi<DesktopCustomerCreditResult>("/getcustomercredit", { PhoneNumber: customerPhone });
}

export async function useDesktopCustomerCredit(payment: DesktopCustomerDebtPayment) {
  return postApi<ApiEnvelope>("/paycustomerdebt", {
    CashAmount: 0,
    PosAmount: 0,
    CreditAmount: 0,
    ...payment,
  });
}

export async function saveDesktopProduct(product: DesktopProduct) {
  return postApi<ApiEnvelope>("/setproducts", product);
}

export async function saveDesktopCategory(category: DesktopCategory) {
  return postApi<ApiEnvelope>("/setcategories", category);
}

export async function saveDesktopCustomer(customer: DesktopCustomer) {
  return postApi<ApiEnvelope>("/savecustomer", customer);
}

export async function deleteDesktopCustomer(customerId: number | string) {
  return postApi<ApiEnvelope>("/deletecustomer", { CustomerId: customerId, UserId: customerId });
}

export async function manageDesktopCredit(credit: DesktopManageCreditRequest) {
  return postApi<ApiEnvelope>("/managecredit", credit);
}

export async function loadDesktopInvoices(filter: { FromDate?: string; ToDate?: string }) {
  const response = await postApi<unknown>("/getinvoices", filter);
  return unwrapArray<DesktopInvoice>(response, ["Invoices", "invoices", "data"]);
}

export async function saveDesktopInvoice(invoice: Partial<DesktopInvoice>) {
  const invoiceId = invoice.SaleInvoiceId ?? (invoice as Record<string, unknown>).InvoiceId;
  const body = {
    ...invoice,
    SaleInvoiceId: invoiceId,
    saleInvoiceId: invoiceId,
    InvoiceId: invoiceId,
    invoiceId,
    Id: invoiceId,
  };

  try {
    return await postApi<ApiEnvelope>("/saveinvoice", body);
  } catch {
    return postApi<ApiEnvelope>("/setinvoice", body);
  }
}

export async function updateDesktopInvoice(invoiceId: number | string, invoiceData: DesktopInvoicePayload) {
  const body = {
    ...invoiceData,
    SaleInvoiceId: invoiceId,
    saleInvoiceId: invoiceId,
    InvoiceId: invoiceId,
    invoiceId,
    Id: invoiceId,
  };

  return postApiFallback<ApiEnvelope>([
    { endpoint: "/updateinvoice", body },
    { endpoint: "/saveinvoice", body },
    { endpoint: "/setinvoice", body },
  ]);
}

export async function deleteDesktopInvoice(invoiceId: number | string) {
  const body = {
    SaleInvoiceId: invoiceId,
    saleInvoiceId: invoiceId,
    InvoiceId: invoiceId,
    invoiceId,
    Id: invoiceId,
    Type: "Invoice",
  };

  return postApiFallback<ApiEnvelope>([
    { endpoint: "/deleteinvoice", body },
    { endpoint: "/invoice/delete", body },
    { endpoint: "/deleteitem", body: { ...body, Type: "SaleInvoice" } },
    { endpoint: "/deleteitem", body },
  ]);
}

export async function loadDesktopCreditTransactions(filter: { FromDate?: string; ToDate?: string }) {
  const response = await postApi<unknown>("/credittransactions", filter);
  return unwrapArray<DesktopCreditTransaction>(response, ["Transactions", "transactions", "Receipts", "receipts", "data"]);
}

export async function loadDesktopInvoiceItems(invoiceId: number | string) {
  const response = await postApi<unknown>("/getinvoiceitems", {
    SaleInvoiceId: invoiceId,
    saleInvoiceId: invoiceId,
    InvoiceId: invoiceId,
    invoiceId,
  });
  const items = findNestedArray<DesktopInvoiceItem>(response, [
    "InvoiceItems",
    "invoiceItems",
    "Items",
    "items",
  ]);
  const toppings = findNestedArray<DesktopInvoiceTopping>(response, [
    "InvoiceToppings",
    "invoiceToppings",
    "Toppings",
    "toppings",
  ]).map(normalizeDesktopInvoiceTopping);

  const toppingsByItemId = toppings.reduce<Map<string, DesktopInvoiceTopping[]>>((map, topping) => {
    const key = String(topping.OrderItemId ?? topping.SaleInvoiceItemId ?? topping.InvoiceItemId ?? "");
    if (!key) return map;
    map.set(key, [...(map.get(key) || []), topping]);
    return map;
  }, new Map());

  return items.map((item) => {
    const normalized = normalizeDesktopInvoiceItem(item);
    const key = String(normalized.SaleInvoiceItemId ?? normalized.InvoiceItemId ?? "");
    const existingToppings = findNestedArray<DesktopInvoiceTopping>(normalized, [
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

function normalizeDesktopInvoiceItem(item: DesktopInvoiceItem): DesktopInvoiceItem {
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

function normalizeDesktopInvoiceTopping(topping: DesktopInvoiceTopping, index = 0): DesktopInvoiceTopping {
  const record = topping as Record<string, unknown>;
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

function primitiveApiKey(value: unknown, fallback: string | number): string | number {
  if (typeof value === "string" || typeof value === "number") return value;
  if (value !== undefined && value !== null) return String(value);
  return fallback;
}

export async function loadDesktopToppingData(connectionId = 0) {
  const [itemsResponse, levelsResponse, linksResponse, goodsResponse] = await Promise.all([
    postPos<unknown>("/gettoppinggoods", { ConnectionsId: connectionId }),
    postPos<unknown>("/gettoppinglevel", { ConnectionsId: connectionId }),
    postPos<unknown>("/toppinggoodsdetails", { ConnectionsId: connectionId }),
    postPos<unknown>("/getgoods", { ConnectionsId: connectionId }),
  ]);

  return {
    items: unwrapArray<DesktopToppingProduct>(itemsResponse, ["ToppingGoods", "Goods", "data"]),
    levels: unwrapArray<DesktopToppingLevel>(levelsResponse, ["ToppingLevel", "Levels", "data"]),
    links: unwrapArray<DesktopProductTopping>(linksResponse, ["Goods", "Toppings", "ToppingGoods", "data"]),
    products: unwrapArray<DesktopProduct>(goodsResponse, ["Goods", "Products", "data"]),
  };
}

export async function saveDesktopToppingItem(item: DesktopToppingProduct) {
  return postApi<ApiEnvelope>("/settoppingitem", item);
}

export async function saveDesktopToppingLevel(level: DesktopToppingLevel) {
  return postApi<ApiEnvelope>("/settoppinglevel", level);
}

export async function saveDesktopProductTopping(link: DesktopProductTopping) {
  return postApi<ApiEnvelope>("/settoppingproducts", link);
}

export async function fetchRuntimeConfig() {
  const response = await fetch("./config.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for config.json`);
  }
  return (await response.json()) as DesktopSettings;
}

export async function saveDesktopSettings(settings: DesktopSettings) {
  const target = settings.ServiceAPIAddress || settings.ServiceAddress || (await GetApiAddress());
  return postAt<ApiEnvelope>(target, "/settings/save", settings, "application/json");
}

export async function loadDesktopDeviceSettings() {
  const response = await postApi<unknown>("/device-settings/list", {});
  if (response && typeof response === "object") {
    const record = response as Record<string, unknown>;
    return {
      currentComputerName: String(record.currentComputerName || ""),
      currentComputerId: Number(record.currentComputerId || 0),
      computers: unwrapArray<DesktopComputerSetting>(response, ["computers", "Computers"]),
      windowsPrinters: unwrapArray<string>(response, ["windowsPrinters", "WindowsPrinters"]),
      printTemplates: unwrapArray<DesktopPrintTemplate>(response, ["printTemplates", "PrintTemplates"]),
      printUsageTypes: unwrapArray<DesktopPrintUsageType>(response, ["printUsageTypes", "PrintUsageTypes"]),
      printerSettings: unwrapArray<DesktopPrinterSetting>(response, ["printerSettings", "PrinterSettings"]),
      posTypes: unwrapArray<DesktopPosType>(response, ["posTypes", "PosTypes"]),
      posSettings: unwrapArray<DesktopPosSetting>(response, ["posSettings", "PosSettings"]),
    } satisfies DesktopDeviceSettings;
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
  } satisfies DesktopDeviceSettings;
}

export async function saveDesktopPrinterSetting(printer: DesktopPrinterSetting) {
  return postApi<ApiEnvelope>("/device-settings/printer/save", printer);
}

export async function deleteDesktopPrinterSetting(printerId: number) {
  return postApi<ApiEnvelope>("/device-settings/printer/delete", { Id: printerId });
}

export async function saveDesktopPosSetting(pos: DesktopPosSetting) {
  return postApi<ApiEnvelope>("/device-settings/pos/save", pos);
}

export async function deleteDesktopPosSetting(posSettingId: number) {
  return postApi<ApiEnvelope>("/device-settings/pos/delete", { Id: posSettingId });
}

export async function loadDesktopTables() {
  const response = await postApi<unknown>("/tables", {});
  return {
    groups: unwrapArray<DesktopTableGroup>(response, ["groups", "Groups", "tableGroups", "TableGroups"]),
    tables: unwrapArray<DesktopDiningTable>(response, ["tables", "Tables", "diningTables", "DiningTables"]),
  } satisfies DesktopTablesState;
}

export async function saveDesktopTableGroup(group: DesktopTableGroup) {
  return postApi<ApiEnvelope>("/tables/group/save", group);
}

export async function saveDesktopTable(table: DesktopDiningTable) {
  return postApi<ApiEnvelope>("/tables/table/save", table);
}

export async function settleDesktopTableInvoice(
  invoiceId: number | string,
  payDetails: { PosPrice: number; CashPrice: number; CreditPrice: number }
) {
  return postApi<ApiEnvelope>("/tables/settle", {
    SaleInvoiceId: invoiceId,
    InvoiceId: invoiceId,
    Id: invoiceId,
    PayDetails: payDetails,
  });
}

export async function moveDesktopTableInvoice(invoiceId: number | string, targetTableId: number | string) {
  return postApi<ApiEnvelope>("/tables/move", {
    SaleInvoiceId: invoiceId,
    InvoiceId: invoiceId,
    Id: invoiceId,
    TargetTableId: targetTableId,
  });
}

export async function printDesktopInvoice(invoiceId: number | string, usage: "customer" | "kitchen") {
  return postApi<ApiEnvelope>("/printinvoice", {
    SaleInvoiceId: invoiceId,
    InvoiceId: invoiceId,
    Id: invoiceId,
    PrintUsageType: usage === "kitchen" ? 2 : 1,
  });
}

export async function testDesktopService(serviceAddress?: string) {
  const base = serviceAddress || (await sendToAmountPOS());
  return postAt<ApiEnvelope>(base, "/license", { Barcode: "00" }, "application/x-www-form-urlencoded");
}

export async function loginDesktop(username: string, password: string) {
  return postApi<DesktopLoginResult>("/auth/login", { username, password });
}

export async function logoutDesktop(username?: string) {
  return postApi<ApiEnvelope>("/auth/logout", { username });
}

export async function loadDesktopAccess() {
  const response = await postApi<unknown>("/access/list", {});
  const roles = unwrapArray<DesktopRole>(response, ["roles", "Roles"]);
  const users = unwrapArray<DesktopUser>(response, ["users", "Users"]);

  if (roles.length || users.length) return { roles, users };

  if (response && typeof response === "object") {
    const record = response as Record<string, unknown>;
    return {
      roles: Array.isArray(record.roles) ? (record.roles as DesktopRole[]) : [],
      users: Array.isArray(record.users) ? (record.users as DesktopUser[]) : [],
    };
  }

  return { roles: [], users: [] };
}

export async function saveDesktopRole(role: DesktopRole) {
  return postApi<ApiEnvelope>("/roles/save", role);
}

export async function saveDesktopUser(user: DesktopUser) {
  return postApi<ApiEnvelope>("/users/save", user);
}
