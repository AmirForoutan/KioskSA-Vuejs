import { GetApiAddress } from "../utilities";

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
    headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
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

export function loadInventoryBootstrap() {
  return postInventory<InventoryBootstrap>("bootstrap");
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
  return postInventory<{ status: boolean; message: string; DocumentId: number; DocumentNumber: string }>("document/save", data);
}

export function listInventoryDocuments(filters: Record<string, unknown>) {
  return postInventory<{ status: boolean; documents: unknown[] }>("documents/list", filters);
}

export function loadStockReport(filters: Record<string, unknown>) {
  return postInventory<{ status: boolean; rows: InventoryStockReportRow[] }>("report/stock", filters);
}

export function loadKardexReport(filters: Record<string, unknown>) {
  return postInventory<{ status: boolean; rows: InventoryKardexRow[] }>("report/kardex", filters);
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
