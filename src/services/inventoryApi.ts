import { GetApiAddress } from "../utilities";

const jsonHeaders = { "Content-Type": "application/json; charset=utf-8" };

async function buildServiceAddress(offset: number, path: string) {
  const serviceAdd = await GetApiAddress();

  try {
    const url = new URL(serviceAdd);
    const currentPort = Number(url.port || (url.protocol === "https:" ? 443 : 80));
    url.port = String(currentPort + offset);
    url.pathname = path;
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return String(serviceAdd).replace(/:(\d+)(\/?$)/, (_match, port) => `:${Number(port) + offset}${path}`);
  }
}

function getPersianYear(date: Date) {
  const parts = new Intl.DateTimeFormat("fa-IR-u-nu-latn", { year: "numeric" }).formatToParts(date);
  return Number(parts.find((part) => part.type === "year")?.value || 0);
}

function normalizeFiscalYear(row: FiscalYear): FiscalYear {
  const titleYear = Number(String(row.Title || "").match(/\d{4}/)?.[0] || 0);
  const startYear = Number(String(row.StartDate || "").split("/")[0] || 0);
  const yearCandidate = titleYear || startYear;

  if (!yearCandidate || yearCandidate < 1700) return row;

  const persianYear = getPersianYear(new Date(yearCandidate, 6, 1));
  if (!persianYear) return row;

  return {
    ...row,
    Title: `سال مالی ${persianYear}`,
    StartDate: `${persianYear}/01/01`,
    EndDate: `${persianYear}/12/29`,
  };
}

function normalizeInventoryBootstrap(data: InventoryBootstrap): InventoryBootstrap {
  return {
    ...data,
    fiscalYears: (data.fiscalYears || []).map(normalizeFiscalYear),
  };
}

function padDatePart(value: string | number | undefined) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length === 1 ? `0${text}` : text;
}

function normalizeDateText(value: unknown) {
  const text = String(value || "").trim().replace(/-/g, "/");
  const parts = text.split("/");
  if (parts.length < 3) return text;
  return `${parts[0]}/${padDatePart(parts[1])}/${padDatePart(parts[2])}`;
}

function normalizeKardexRow(row: any): InventoryKardexRow {
  return {
    LedgerId: Number(row.LedgerId ?? row.ledgerId ?? 0),
    DocumentId: Number(row.DocumentId ?? row.documentId ?? 0),
    DocumentType: Number(row.DocumentType ?? row.documentType ?? 0),
    DocumentNumber: String(row.DocumentNumber ?? row.documentNumber ?? ""),
    DocumentDate: normalizeDateText(row.DocumentDate ?? row.documentDate),
    WarehouseTitle: String(row.WarehouseTitle ?? row.warehouseTitle ?? ""),
    GoodsId: Number(row.GoodsId ?? row.goodsId ?? 0),
    GoodsName: String(row.GoodsName ?? row.goodsName ?? ""),
    InQuantity: Number(row.InQuantity ?? row.inQuantity ?? 0),
    OutQuantity: Number(row.OutQuantity ?? row.outQuantity ?? 0),
    BalanceAfter: Number(row.BalanceAfter ?? row.balanceAfter ?? 0),
    UnitPrice: Number(row.UnitPrice ?? row.unitPrice ?? 0),
    Amount: Number(row.Amount ?? row.amount ?? 0),
    Description: String(row.Description ?? row.description ?? ""),
  };
}

async function getInventoryApiAddress() {
  return buildServiceAddress(1, "/inventory");
}

async function getInventoryAnalysisApiAddress() {
  return buildServiceAddress(2, "/inventory-analysis");
}

async function postInventory<T>(path: string, data: unknown = {}): Promise<T> {
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
  return result as T;
}

async function postInventoryAnalysis<T>(path: string, data: unknown = {}): Promise<T> {
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
  return result as T;
}

export type InventorySettings = {
  InventorySettingsId?: number;
  IsWarehouseEnabled: boolean;
  AllowNegativeStockSale: boolean;
  InventoryValuationMethod: number;
  AutoCreateStockReceiptFromPurchaseInvoice: boolean;
  AutoCreateStockIssueFromSaleInvoice: boolean;
  RequireWarehouseForSale: boolean;
  RequireWarehouseForPurchase: boolean;
  EnableStockTaking: boolean;
};

export type Warehouse = {
  WarehouseId: number;
  WarehouseCode: string;
  WarehouseTitle: string;
  IsActive: boolean;
  IsDefault: boolean;
  Description?: string;
};

export type FiscalYear = {
  FiscalYearId: number;
  Title: string;
  StartDate: string;
  EndDate: string;
  IsActive: boolean;
  IsClosed: boolean;
};

export type InventoryGoods = {
  GoodsId: number;
  GoodsCode: number;
  GoodsName: string;
  GoodsGroupId: number;
  StockInventory: number;
  MinStock: number;
  MaxStock: number;
  ReorderPoint: number;
  DefaultWarehouseId?: number | null;
  IsPurchasable?: boolean;
  IsSellable?: boolean;
  IsKioskVisible?: boolean;
};

export type GoodsUsage = {
  GoodsId: number;
  GoodsCode: number;
  GoodsName: string;
  GoodsGroupId: number;
  IsPurchasable: boolean;
  IsSellable: boolean;
  IsKioskVisible: boolean;
};

export type RecipeItem = {
  ProductGoodsId?: number;
  IngredientGoodsId: number;
  IngredientGoodsCode?: number;
  IngredientGoodsName?: string;
  Quantity: number;
  WastePercent: number;
};

export type InventoryAnalysisBootstrap = {
  status: boolean;
  goods: GoodsUsage[];
  recipes: RecipeItem[];
};

export type InventoryDocumentItem = {
  GoodsId: number;
  Quantity: number;
  UnitPrice: number;
  Description?: string;
};

export type InventoryDocument = {
  DocumentId?: number;
  DocumentType: number;
  DocumentNumber?: string;
  DocumentDate: string;
  FiscalYearId?: number;
  WarehouseId: number;
  PersonId?: number | null;
  PersonTitle?: string;
  Description?: string;
  Username?: string;
  Items: InventoryDocumentItem[];
};

export type InventoryBootstrap = {
  status: boolean;
  haveStockLicense: boolean;
  settings: InventorySettings;
  warehouses: Warehouse[];
  fiscalYears: FiscalYear[];
  goods: InventoryGoods[];
  valuationMethods: { id: number; title: string }[];
  documentTypes: { id: number; title: string }[];
};

export type InventoryStockReportRow = {
  GoodsId: number;
  GoodsCode: number;
  GoodsName: string;
  CurrentQuantity: number;
  PeriodInQuantity: number;
  PeriodOutQuantity: number;
  InventoryValue: number;
  LastPurchasePrice: number;
  AveragePrice: number;
  MinStock: number;
  MaxStock: number;
  ReorderPoint: number;
};

export type InventoryKardexRow = {
  LedgerId: number;
  DocumentId: number;
  DocumentType: number;
  DocumentNumber: string;
  DocumentDate: string;
  WarehouseTitle: string;
  GoodsId: number;
  GoodsName: string;
  InQuantity: number;
  OutQuantity: number;
  BalanceAfter: number;
  UnitPrice: number;
  Amount: number;
  Description?: string;
};

export type InventoryChangeLogRow = {
  ChangeLogId: number;
  DocumentType: string;
  DocumentId: number;
  DocumentNumber?: string;
  ActionType: string;
  Description?: string;
  ChangedAt?: string;
  ChangedBy?: string;
  FiscalYearId?: number;
};

export async function loadInventoryBootstrap() {
  const data = await postInventory<InventoryBootstrap>("bootstrap");
  return normalizeInventoryBootstrap(data);
}

export function saveInventorySettings(data: InventorySettings) {
  return postInventory<{ status: boolean; message: string }>("settings/save", data);
}

export function saveWarehouse(data: Partial<Warehouse>) {
  return postInventory<{ status: boolean; message: string }>("warehouse/save", data);
}

export function saveGoodsLimits(items: Partial<InventoryGoods>[]) {
  return postInventory<{ status: boolean; message: string }>("goods/limits/save", { Items: items });
}

export function saveInventoryDocument(data: InventoryDocument) {
  return postInventoryAnalysis<{ status: boolean; message: string; DocumentId: number; DocumentNumber: string }>("document/save", data);
}

export function listInventoryDocuments(filters: Record<string, unknown>) {
  return postInventory<{ status: boolean; documents: unknown[] }>("documents/list", filters);
}

export function loadStockReport(filters: Record<string, unknown>) {
  return postInventory<{ status: boolean; rows: InventoryStockReportRow[] }>("report/stock", filters);
}

export async function loadKardexReport(filters: Record<string, unknown>) {
  const result = await postInventory<any>("report/kardex", filters);
  const rows = (result.rows || result.Rows || []).map(normalizeKardexRow);
  return { ...result, rows } as { status: boolean; rows: InventoryKardexRow[] };
}

export function loadInventoryChangeLogs() {
  return postInventory<{ status: boolean; rows: InventoryChangeLogRow[] }>("change-logs");
}

export function rebuildInventoryBalances(fiscalYearId?: number) {
  return postInventory<{ status: boolean; message: string }>("rebuild-balances", { FiscalYearId: fiscalYearId || 0 });
}

export function loadInventoryAnalysisBootstrap() {
  return postInventoryAnalysis<InventoryAnalysisBootstrap>("bootstrap");
}

export function saveGoodsUsage(items: Partial<GoodsUsage>[]) {
  return postInventoryAnalysis<{ status: boolean; message: string }>("goods-usage/save", { Items: items });
}

export function saveGoodsRecipe(productGoodsId: number, items: RecipeItem[]) {
  return postInventoryAnalysis<{ status: boolean; message: string }>("recipe/save", {
    ProductGoodsId: productGoodsId,
    Items: items,
  });
}

export function checkInvoiceStockByRecipe(items: { GoodsId: number; Quantity: number }[]) {
  return postInventoryAnalysis<{
    status: boolean;
    canSubmit: boolean;
    warningOnly?: boolean;
    shouldCheck: boolean;
    message: string;
    shortages: { GoodsId: number; GoodsName: string; RequiredQuantity: number; CurrentQuantity: number; ShortageQuantity: number }[];
  }>("check-invoice-stock", { Items: items });
}
