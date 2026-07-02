const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toEnglishDigits(value) {
  return String(value ?? '')
    .replace(/[۰-۹]/g, (char) => String(persianDigits.indexOf(char)))
    .replace(/[٠-٩]/g, (char) => String(arabicDigits.indexOf(char)));
}

function normalizeTime(value) {
  if (!value) return null;
  const parts = toEnglishDigits(value).split(':').map((part) => Number(part));
  if (parts.some(Number.isNaN)) return null;
  const [hour = 0, minute = 0, second = 0] = parts;
  return hour * 3600 + minute * 60 + second;
}

function parseDate(value) {
  if (!value) return null;
  const normalized = toEnglishDigits(value).replace(/-/g, '/').trim();
  const parts = normalized.split('/').map((part) => Number(part));
  if (parts.length < 3 || parts.some(Number.isNaN)) return null;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function getTodayPersianDate() {
  return toEnglishDigits(new Date().toLocaleDateString('fa-IR-u-nu-latn'));
}

export function isDateInRange(today = getTodayPersianDate(), startDate, endDate) {
  const current = parseDate(today);
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!current) return true;
  if (start && current < start) return false;
  if (end && current > end) return false;
  return true;
}

export function isTimeInRange(now = new Date(), fromTime, toTime) {
  const start = normalizeTime(fromTime);
  const end = normalizeTime(toTime);

  if (start === null && end === null) return true;

  const current = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  if (start !== null && end !== null && start > end) {
    return current >= start || current <= end;
  }
  if (start !== null && current < start) return false;
  if (end !== null && current > end) return false;
  return true;
}

function getTodayFlagName(now = new Date()) {
  const day = now.getDay();
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
}

function isGoodsSaleWindowOpen(goods, now = new Date()) {
  const dayName = getTodayFlagName(now);
  const dayEnabled = goods?.[dayName];

  if (dayEnabled === false || dayEnabled === 'False' || dayEnabled === 'false' || dayEnabled === 0) {
    return false;
  }

  const from = goods?.[`FromTime${dayName}`];
  const to = goods?.[`ToTime${dayName}`];
  return isTimeInRange(now, from, to);
}

function normalizeDiscountId(discount) {
  return Number(
    discount?.GoodsDiscountId ??
    discount?.DiscountId ??
    discount?.DiscountCodeId ??
    discount?.id ??
    0
  );
}

function normalizeDiscountPercent(discount) {
  return Number(
    discount?.Percent ??
    discount?.DiscountPercent ??
    discount?.DiscountValue ??
    0
  );
}

export function getActiveGoodsDiscount(goods, discounts, now = new Date()) {
  if (!goods || !Array.isArray(discounts)) return null;
  if (!isGoodsSaleWindowOpen(goods, now)) return null;

  const goodsDiscountId = Number(goods.GoodsDiscountId ?? goods.DiscountId ?? 0);
  const goodsId = Number(goods.GoodsId ?? goods.ProductId ?? 0);
  const goodsCode = String(goods.GoodsCode ?? goods.ProductCode ?? '');
  const today = getTodayPersianDate();

  return discounts.find((discount) => {
    const discountId = normalizeDiscountId(discount);
    const explicitGoodsDiscount = goodsDiscountId > 0 && discountId === goodsDiscountId;
    const applyToAll = discount?.UseForAll === true || discount?.ApplyToAllGoods === true;
    const goodsIds = Array.isArray(discount?.GoodsIds) ? discount.GoodsIds.map(Number) : [];
    const productCodes = Array.isArray(discount?.ProductCodes) ? discount.ProductCodes.map(String) : [];
    const linkedToGoods = goodsIds.includes(goodsId) || productCodes.includes(goodsCode);

    if (!explicitGoodsDiscount && !applyToAll && !linkedToGoods) return false;

    return (
      isDateInRange(today, discount.FromDate ?? discount.StartDate, discount.ToDate ?? discount.EndDate) &&
      isTimeInRange(now, discount.FromTime ?? discount.StartTime, discount.ToTime ?? discount.EndTime)
    );
  }) || null;
}

export function calculatePercentDiscount(price, percent) {
  const safePrice = Number(price || 0);
  const safePercent = Number(percent || 0);
  if (safePrice <= 0 || safePercent <= 0) return 0;
  return Math.round(safePrice * safePercent / 100);
}

export function applyGoodsDiscounts(goodsList, discounts, now = new Date()) {
  if (!Array.isArray(goodsList)) return [];

  return goodsList.map((goods) => {
    const activeDiscount = getActiveGoodsDiscount(goods, discounts, now);
    if (!activeDiscount) {
      return {
        ...goods,
        OriginalGoodsPrice: goods.OriginalGoodsPrice ?? goods.GoodsPrice,
        GoodsDiscountPercent: 0,
        GoodsDiscountAmount: 0,
        ActiveGoodsDiscount: null,
      };
    }

    const originalPrice = Number(goods.OriginalGoodsPrice ?? goods.GoodsPrice ?? 0);
    const percent = normalizeDiscountPercent(activeDiscount);
    const discountAmount = calculatePercentDiscount(originalPrice, percent);

    return {
      ...goods,
      OriginalGoodsPrice: originalPrice,
      GoodsPrice: Math.max(originalPrice - discountAmount, 0),
      GoodsDiscountPercent: percent,
      GoodsDiscountAmount: discountAmount,
      ActiveGoodsDiscount: activeDiscount,
    };
  });
}

function isPercentDiscount(discount) {
  const type = discount?.DiscountType ?? discount?.Type;
  if (type === true || type === 1 || type === '1' || type === 'percent' || type === 'percentage') return true;
  if (type === false || type === 2 || type === '2' || type === 'amount' || type === 'price') return false;
  return Number(discount?.Percent ?? discount?.DiscountPercent ?? 0) > 0;
}

export function calculateCustomerDiscountAmount(discount, price) {
  const safePrice = Number(price || 0);
  if (!discount || safePrice <= 0) return 0;

  const percentValue = Number(discount.DiscountPercent ?? discount.Percent ?? discount.DiscountValue ?? 0);
  const amountValue = Number(discount.DiscountAmount ?? discount.Price ?? discount.Amount ?? 0);
  const maxAmount = Number(discount.DiscountMax ?? discount.MaxDiscountAmount ?? 0);
  const minBuy = Number(discount.MinBuy ?? discount.MinInvoiceAmount ?? 0);

  if (minBuy > 0 && safePrice < minBuy) return 0;

  let calculated = 0;
  if (isPercentDiscount(discount)) {
    calculated = Math.round((safePrice * percentValue) / 100);
  } else {
    calculated = amountValue || Number(discount.DiscountValue || 0);
  }

  if (maxAmount > 0) calculated = Math.min(calculated, maxAmount);
  return Math.min(Math.max(calculated, 0), safePrice);
}

export function normalizeDiscountCardPayload(payload) {
  const data = payload?.data ?? payload?.Data ?? payload?.card ?? payload?.Card ?? payload;
  if (!data || typeof data !== 'object') return null;

  return {
    DiscountCardId: Number(data.DiscountCardId ?? data.discountCardId ?? 0),
    CardNumber: String(data.CardNumber ?? data.cardNumber ?? data.DiscountCart ?? ''),
    Percent: Number(data.Percent ?? data.DiscountPercent ?? 0),
    Price: Number(data.Price ?? data.DiscountAmount ?? data.Balance ?? 0),
    MinBuy: Number(data.MinBuy ?? data.MinInvoiceAmount ?? 0),
    IsActive: data.IsActive !== false,
    Goods: Array.isArray(data.Goods) ? data.Goods : [],
    raw: data,
  };
}
