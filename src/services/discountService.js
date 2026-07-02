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

export function getActiveGoodsDiscount(goods, discounts, now = new Date()) {
  if (!goods?.GoodsDiscountId || !Array.isArray(discounts)) return null;
  if (!isGoodsSaleWindowOpen(goods, now)) return null;

  const today = getTodayPersianDate();
  return discounts.find((discount) => {
    const sameDiscount = Number(discount.GoodsDiscountId) === Number(goods.GoodsDiscountId);
    if (!sameDiscount) return false;

    return (
      isDateInRange(today, discount.FromDate, discount.ToDate) &&
      isTimeInRange(now, discount.FromTime, discount.ToTime)
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
    const discountAmount = calculatePercentDiscount(originalPrice, activeDiscount.Percent);

    return {
      ...goods,
      OriginalGoodsPrice: originalPrice,
      GoodsPrice: Math.max(originalPrice - discountAmount, 0),
      GoodsDiscountPercent: Number(activeDiscount.Percent || 0),
      GoodsDiscountAmount: discountAmount,
      ActiveGoodsDiscount: activeDiscount,
    };
  });
}

export function calculateCustomerDiscountAmount(discount, price) {
  const safePrice = Number(price || 0);
  if (!discount || safePrice <= 0) return 0;

  const value = Number(discount.DiscountValue || discount.Percent || discount.Price || 0);
  if (value <= 0) return 0;

  if (discount.DiscountType === false || discount.DiscountType === 0 || discount.Type === 'percent') {
    return Math.round(safePrice * value / 100);
  }

  return Math.min(value, safePrice);
}
