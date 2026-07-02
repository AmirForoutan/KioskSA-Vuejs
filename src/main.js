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
registerSW({
    onOfflineReady() {
        console.log('PWA is ready for offline use');
    },
});
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
    });
    // 5. نصب برنامه
    app.mount("#app");
}
// راه‌اندازی برنامه
bootstrap().catch((error) => {
    console.error("Failed to bootstrap application:", error);
});
