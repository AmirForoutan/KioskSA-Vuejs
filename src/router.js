// src/router.js
import { createRouter, createWebHistory } from "vue-router";

const routes = [
    { path: "/", component: () => import("./views/RootView.vue") },
    { path: "/categories", component: () => import("./components/CategoryList.vue") },
    { path: "/goods/:groupId", component: () => import("./components/GoodsList.vue"), props: true },
    { path: "/admin/upload", name: "admin-upload", component: () => import("./components/AdminImageUpload.vue") },
    { path: "/desktop/discounts", name: "desktop-discounts", component: () => import("./views/desktop/tabs/DiscountsTab.vue") },
];
const router = createRouter({
    history: createWebHistory(),
    routes,
});
// این خط حیاتی است:
export default router;
