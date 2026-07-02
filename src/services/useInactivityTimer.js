import { saveData, getData } from "./storageService";
import { ref } from "vue";

let inactivityTimer = null;
let eventListeners = [];

export async function setupInactivityTimer(timeout, onTimeout) {
  const [cartData, toppingsData] = await Promise.all([
    getData("cart"),
    getData("cartToppings"),
  ]);
  const cart = ref({
    items: [],
    toppings: {},
  });
  cart.value.items = Array.isArray(cartData) ? cartData : [];

  // تابع ریست تایمر
  const resetTimer = () => {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      console.log("Inactivity timeout reached - clearing cart");
      if (typeof onTimeout === "function") {
        onTimeout(); // اجرای تابع callback در صورت وجود
      }
    }, timeout);
  };

  // شروع مانیتورینگ
  const start = () => {
    console.log(`Starting inactivity timer (${timeout}ms)`);

    // حذف listenerهای قبلی برای جلوگیری از duplicate
    cleanup();

    // رویدادهای مورد نظر
    const events = [
      "mousemove",
      "mousedown",
      "keypress",
      "scroll",
      "touchstart",
      "click",
      "keydown",
      "wheel",
      "input",
    ];

    // اضافه کردن listenerهای جدید
    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
      eventListeners.push({ event, handler: resetTimer });
    });

    resetTimer(); // شروع تایمر
  };

  // توقف و تمیزکاری
  const cleanup = () => {
    console.log("Cleaning up inactivity timer");
    clearTimeout(inactivityTimer);

    eventListeners.forEach(({ event, handler }) => {
      window.removeEventListener(event, handler);
    });

    eventListeners = [];
  };

  return { start, cleanup };
}
