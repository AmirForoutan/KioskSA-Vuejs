// src/router.js
import { createRouter, createWebHistory } from "vue-router";
import RootView from "./views/RootView.vue";
import Categories from "./components/CategoryList.vue";
import GoodsList from "./components/GoodsList.vue";
import AdminImageUpload from "./components/AdminImageUpload.vue";
import DiscountsTab from "./views/desktop/tabs/DiscountsTab.vue";
const routes = [
    { path: "/", component: RootView },
    { path: "/categories", component: Categories },
    { path: "/goods/:groupId", component: GoodsList, props: true },
    { path: "/admin/upload", name: "admin-upload", component: AdminImageUpload },
    { path: "/desktop/discounts", name: "desktop-discounts", component: DiscountsTab },
];
const router = createRouter({
    history: createWebHistory(),
    routes,
});
// این خط حیاتی است:
export default router;
