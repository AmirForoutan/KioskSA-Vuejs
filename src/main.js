import { createApp } from 'vue';
import App from './App.vue';
import "./style.css";
import { createPinia } from "pinia";
import router from './router';
import { initConfig } from './utilities';
import { registerSW } from 'virtual:pwa-register';
import Toast from "vue-toastification";
import "vue-toastification/dist/index.css";
import { seedDesktopUser } from './components/stores/auth.store';
// @ts-ignore - jalalidatepicker package does not ship complete TypeScript declarations in all versions.
import jalaliDatepicker from "@majidh1/jalalidatepicker";
import "@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css";
registerSW({
    onOfflineReady() {
        console.log('PWA is ready for offline use');
    },
});
function startPersianDatePicker() {
    try {
        jalaliDatepicker.startWatch({
            selector: "[data-jdp]",
            time: false,
            autoHide: true,
            hideAfterChange: true,
        });
    }
    catch (error) {
        console.warn("Failed to start Jalali datepicker", error);
    }
}
// تابع اصلی راه‌اندازی برنامه
async function bootstrap() {
    // 1. ابتدا تنظیمات را بارگذاری می‌کنیم
    await initConfig();
    seedDesktopUser();
    // 2. سپس نمونه برنامه Vue را ایجاد می‌کنیم
    const app = createApp(App);
    const options = {
    // You can set your default options here
    };
    // 3. پلاگین‌ها را نصب می‌کنیم
    app.use(createPinia());
    app.use(router);
    app.use(Toast, options);
    // 4. تنظیمات روتر (بعد از نصب router)
    router.afterEach((to, from) => {
        if (to.query.transition === "slide") {
            document.body.classList.add("slide-transition");
            setTimeout(() => {
                document.body.classList.remove("slide-transition");
            }, 500);
        }
        setTimeout(startPersianDatePicker, 100);
    });
    // 5. نصب برنامه
    app.mount("#app");
    setTimeout(startPersianDatePicker, 250);
}
// راه‌اندازی برنامه
bootstrap().catch((error) => {
    console.error("Failed to bootstrap application:", error);
});
