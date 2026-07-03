// تعریف نوع پیکربندی برنامه
interface AppConfig {
  Currency?: boolean; // یا می‌توانید از نوع دقیق‌تر مانند 'rial' | 'toman' استفاده کنید
  ServiceAddress?: string;
  IsClub?: boolean;
  kioskOrder?: boolean;
  scaleOrder?: boolean;
  IsSalon?: boolean;
  IsTakeAway?: boolean;
  StandByTimer?: BigInt;
  ResetTimer?: BigInt;
  ServiceAPIAddress?: string;
  viewMode?: bigint;
  IsCollapseCart?: boolean;
  ScaleAutoPay?: boolean;
  IsMultiInvoice?: boolean;
  showOrderRegistration?: boolean;
  showTables?: boolean;
  TableSelectionRequired?: boolean;
  KeepSalonTableOpenAfterSubmit?: boolean;
  ShowKioskOrderTypeSelector?: boolean;
  ShowStandByVideo?: boolean;
  showDiscountCart?: boolean;
  ShowKeyBoard?: boolean;
}

let appConfig: AppConfig = {};

/**
 * مقداردهی اولیه پیکربندی برنامه
 * @throws {Error} در صورت عدم توانایی در بارگیری فایل پیکربندی
 */
export async function initConfig(): Promise<void> {
  try {
    const response = await fetch("./config.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    appConfig = (await response.json()) as AppConfig;
  } catch (error) {
    console.error("Error loading config:", error);
    throw error; // پرتاب مجدد خطا برای مدیریت توسط فراخواننده
  }
}

/**
 * دریافت نوع ارز پایه نرم‌افزار
 * @returns {boolean} وضعیت ارز (true برای ریال، false برای تومان)
 * @throws {Error} در صورت عدم مقداردهی اولیه پیکربندی
 */
export function getCurrency(): boolean {
  if (appConfig.Currency === undefined) {
    throw new Error("Configuration not initialized. Call initConfig() first.");
  }
  return appConfig.Currency;
}

/**
 * دریافت آدرس API سرور
 * @returns {string} آدرس سرور
 * @throws {Error} در صورت عدم مقداردهی اولیه پیکربندی
 */

export function sendToAmountPOS() {
  if (appConfig.ServiceAddress === undefined) {
    throw new Error("Configuration not initialized. Call initConfig() first.");
  }
  return appConfig.ServiceAddress;
}

export function IsClubStat() {
  if (appConfig.IsClub === undefined) {
    throw new Error("Configuration not initialized. Call initConfig() first.");
  }
  return appConfig.IsClub;
}

export function IsKioskOrderStat() {
  if (appConfig.kioskOrder === undefined) {
    throw new Error("Configuration not initialized. Call initConfig() first.");
  }
  return appConfig.kioskOrder;
}

export function IsScaleOrderStat() {
  if (appConfig.scaleOrder === undefined) {
    throw new Error("Configuration not initialized. Call initConfig() first.");
  }
  return appConfig.scaleOrder;
}
// نمایش پنل جهت زدن دکمه های ثبت سفارش
export function OrderRegistrationStat() {
  if (appConfig.showOrderRegistration === undefined) {
    throw new Error("Configuration not initialized. Call initConfig() first.");
  }
  return appConfig.showOrderRegistration;
}
// Type Order: Salon
export function IsSalonOrderStat() {
  if (appConfig.IsSalon === undefined) {
    throw new Error("Configuration not initialized. Call initConfig() first.");
  }
  return appConfig.IsSalon;
}
// Type Order: TakeAway
export function IsTakeAwayOrderStat() {
  if (appConfig.IsTakeAway === undefined) {
    throw new Error("Configuration not initialized. Call initConfig() first.");
  }
  return appConfig.IsTakeAway;
}
// Show Tables List
export function IsShowTables() {
  if (appConfig.showTables === undefined) {
    throw new Error("Configuration not initialized. Call initConfig() first.");
  }
  return appConfig.showTables;
}
// Table selection required for salon orders
export function IsTableSelectionRequired() {
  return appConfig.TableSelectionRequired === true;
}
// Keep salon table invoices open until they are settled from the tables view
export function KeepSalonTableOpenAfterSubmit() {
  return appConfig.KeepSalonTableOpenAfterSubmit === true;
}
// Show order type selector inside kiosk cart
export function ShowKioskOrderTypeSelector() {
  return appConfig.ShowKioskOrderTypeSelector === true;
}
// Show standby video after inactivity
export function ShowStandByVideo() {
  return appConfig.ShowStandByVideo === true;
}
// Show Discount Hami Cart Field
export function IsShowDiscountCart() {
  if (appConfig.showDiscountCart === undefined) {
    throw new Error("Configuration not initialized. Call initConfig() first.");
  }
  return appConfig.showDiscountCart;
}
// Get Timer Count
export function GetStandByTimer() {
  if (appConfig.StandByTimer === undefined) {
    throw new Error("Configuration not initialized. Call initConfig() first.");
  }
  return appConfig.StandByTimer;
}

// Get Reset Timer Count
export function GetResetTimer() {
  if (appConfig.ResetTimer === undefined) {
    throw new Error("Configuration not initialized. Call initConfig() first.");
  }
  return appConfig.ResetTimer;
}

// Get Api Address For Upload & Delete Images
export function GetApiAddress() {
  if (appConfig.ServiceAPIAddress === undefined) {
    throw new Error("Configuration not initialized. Call initConfig() first.");
  }
  return appConfig.ServiceAPIAddress;
}

export function setupJalaliDateInputs(selector = "input[data-jdp]") {
  const picker = (window as unknown as { jalaliDatepicker?: any }).jalaliDatepicker;
  if (!picker) return false;

  const options = {
    autoHide: true,
    hideAfterChange: true,
    zIndex: 3000,
    date: true,
    time: true,
    hasSecond: false,
    persianDigits: false,
    selector,
  };
  picker.startWatch(options);

  const bindInputs = () => {
    document.querySelectorAll<HTMLInputElement>(selector).forEach((input) => {
      if (input.dataset.jdpBound === "true") return;
      input.dataset.jdpBound = "true";

      const showPicker = () => {
        picker.startWatch(options);
        picker.show(input);
      };

      input.addEventListener("focus", showPicker);
      input.addEventListener("click", showPicker);
    });
  };

  bindInputs();
  window.setTimeout(bindInputs, 0);
  window.setTimeout(bindInputs, 150);
  return true;
}
// Get View Mode Code
export function GetViewMode() {
  if (appConfig.viewMode === undefined) {
    throw new Error("Configuration not initialized. Call initConfig() first.");
  }
  return appConfig.viewMode;
}
// Get Is Collapse Basket
export function GetIsCollapseCart() {
  if (appConfig.IsCollapseCart === undefined) {
    throw new Error("Configuration not initialized. Call initConfig() first.");
  }
  return appConfig.IsCollapseCart;
}

// Get Is Auto Pay In Scale
export function GetIsAutoPayInScale() {
  if (appConfig.ScaleAutoPay === undefined) {
    throw new Error("Configuration not initialized. Call initConfig() first.");
  }
  return appConfig.ScaleAutoPay;
}

// Get Is Multi Invoice In Scale
export function GetIsMultiInvoiceInScale() {
  if (appConfig.IsMultiInvoice === undefined) {
    throw new Error("Configuration not initialized. Call initConfig() first.");
  }
  return appConfig.IsMultiInvoice;
}
// Is Show Keyboard
export function ShwoKeyboardStatus() {
  if (appConfig.ShowKeyBoard === undefined) {
    throw new Error("Configuration not initialized. Call initConfig() first.");
  }
  return appConfig.ShowKeyBoard;
}
