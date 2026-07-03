import { GetApiAddress, sendToAmountPOS } from "../utilities";

export type LocalDiscount = {
  DiscountId: number;
  DiscountCode?: string;
  Title: string;
  Description?: string;
  DiscountType: 1 | 2 | number;
  DiscountPercent: number;
  DiscountAmount: number;
  MaxDiscountAmount: number;
  MinInvoiceAmount: number;
  StartDate?: string | null;
  EndDate?: string | null;
  FromTime?: string | null;
  ToTime?: string | null;
  ApplyToAllGoods: boolean;
  IsActive: boolean;
  GoodsIds?: number[];
  CustomerIds?: number[];
  [key: string]: unknown;
};

export type LocalDiscountSaveRequest = Omit<LocalDiscount, "DiscountId" | "Description"> & {
  DiscountId?: number;
  Description?: string | null;
  GoodsIds?: number[];
  CustomerIds?: number[];
};

export type LocalDiscountCard = {
  DiscountCardId: number;
  CardNumber: string;
  CustomerId?: number | null;
  CustomerPhone?: string;
  CustomerName?: string;
  DiscountPercent: number;
  DiscountAmount: number;
  Balance: number;
  StartDate?: string | null;
  EndDate?: string | null;
  IsActive: boolean;
  [key: string]: unknown;
};

export type LocalDiscountCardSaveRequest = Omit<LocalDiscountCard, "DiscountCardId"> & {
  DiscountCardId?: number;
};

export type LocalDiscountCardTransaction = {
  DiscountCardTransactionId: number;
  DiscountCardId: number;
  CardNumber?: string;
  SaleInvoiceId?: number | null;
  TransactionType: number;
  Amount: number;
  Description?: string;
  TransactionDate: string;
  [key: string]: unknown;
};

type ApiEnvelope<T> = {
  status?: boolean | string;
  message?: string;
  data?: T;
  [key: string]: unknown;
};

const CUSTOMER_META_PREFIX = "[CUSTOMER_DISCOUNT_IDS:";
const CUSTOMER_META_SUFFIX = "]";

function packCustomerIds(description: string | undefined | null, customerIds?: number[]) {
  const clean = unpackCustomerIds(description).description;
  const ids = Array.from(new Set((customerIds || []).map(Number).filter((id) => Number.isFinite(id) && id > 0)));
  if (!ids.length) return clean || undefined;
  const meta = `${CUSTOMER_META_PREFIX}${ids.join(",")}${CUSTOMER_META_SUFFIX}`;
  return `${clean ? `${clean}\n` : ""}${meta}`;
}

export function unpackCustomerIds(description: unknown) {
  const text = String(description ?? "");
  const start = text.indexOf(CUSTOMER_META_PREFIX);
  if (start < 0) return { description: text, customerIds: [] as number[] };
  const end = text.indexOf(CUSTOMER_META_SUFFIX, start + CUSTOMER_META_PREFIX.length);
  if (end < 0) return { description: text, customerIds: [] as number[] };
  const raw = text.slice(start + CUSTOMER_META_PREFIX.length, end);
  const customerIds = raw
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
  const descriptionOnly = `${text.slice(0, start)}${text.slice(end + CUSTOMER_META_SUFFIX.length)}`.trim();
  return { description: descriptionOnly, customerIds };
}

function normalizeDiscount(row: LocalDiscount) {
  const unpacked = unpackCustomerIds(row.Description);
  return {
    ...row,
    Description: unpacked.description,
    CustomerIds: Array.isArray(row.CustomerIds) && row.CustomerIds.length ? row.CustomerIds : unpacked.customerIds,
  };
}

async function postAt<T>(baseUrl: string, endpoint: string, body: unknown): Promise<T> {
  const base = baseUrl.replace(/\/$/, "");
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status} for ${endpoint}`);
  return (await response.json()) as T;
}

async function postApi<T>(endpoint: string, body: unknown = {}) {
  const base = await GetApiAddress();
  return postAt<T>(base, endpoint, body);
}

async function postPos<T>(endpoint: string, body: unknown = {}) {
  const base = await sendToAmountPOS();
  return postAt<T>(base, endpoint, body);
}

function assertOk<T>(response: ApiEnvelope<T>, fallbackMessage: string) {
  if (response?.status === false || response?.status === "false") {
    throw new Error(response.message || fallbackMessage);
  }
  return response;
}

function unwrapData<T>(response: ApiEnvelope<T[]>, keys: string[] = []): T[] {
  if (Array.isArray(response)) return response as unknown as T[];
  if (Array.isArray(response?.data)) return response.data;
  const record = response as Record<string, unknown>;
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as T[];
  }
  return [];
}

export async function listLocalDiscounts() {
  const response = await postApi<ApiEnvelope<LocalDiscount[]>>("/pc/discounts/list", {});
  assertOk(response, "خطا در دریافت تخفیف‌ها");
  return unwrapData<LocalDiscount>(response, ["discounts", "Discounts"]).map(normalizeDiscount);
}

export async function saveLocalDiscount(payload: LocalDiscountSaveRequest) {
  const response = await postApi<ApiEnvelope<{ DiscountId: number }>>("/pc/discounts/save", {
    ...payload,
    Description: packCustomerIds(payload.Description, payload.CustomerIds),
  });
  return assertOk(response, "خطا در ذخیره تخفیف");
}

export async function disableLocalDiscount(discountId: number) {
  const response = await postApi<ApiEnvelope<unknown>>("/pc/discounts/delete", { DiscountId: discountId });
  return assertOk(response, "خطا در غیرفعال کردن تخفیف");
}

export async function listLocalDiscountCards() {
  const response = await postApi<ApiEnvelope<LocalDiscountCard[]>>("/pc/discount-cards/list", {});
  assertOk(response, "خطا در دریافت کارت‌های تخفیف");
  return unwrapData<LocalDiscountCard>(response, ["cards", "Cards"]);
}

export async function saveLocalDiscountCard(payload: LocalDiscountCardSaveRequest) {
  const response = await postApi<ApiEnvelope<{ DiscountCardId: number }>>("/pc/discount-cards/save", payload);
  return assertOk(response, "خطا در ذخیره کارت تخفیف");
}

export async function disableLocalDiscountCard(discountCardId: number) {
  const response = await postApi<ApiEnvelope<unknown>>("/pc/discount-cards/delete", { DiscountCardId: discountCardId });
  return assertOk(response, "خطا در غیرفعال کردن کارت");
}

export async function listLocalDiscountCardTransactions(params: { DiscountCardId?: number; CardNumber?: string; Take?: number } = {}) {
  const response = await postApi<ApiEnvelope<LocalDiscountCardTransaction[]>>("/pc/discount-card-transactions/list", params);
  assertOk(response, "خطا در دریافت تراکنش‌های کارت تخفیف");
  return unwrapData<LocalDiscountCardTransaction>(response, ["transactions", "Transactions"]);
}

export async function getLocalDiscountCardForKiosk(cardNumber: string, connectionId = 0) {
  const response = await postPos<ApiEnvelope<unknown>>("/discountscart", {
    ConnectionsId: connectionId,
    DiscountCart: cardNumber,
  });
  return assertOk(response, "کارت تخفیف معتبر نیست");
}