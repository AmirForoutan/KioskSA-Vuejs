<script setup lang="ts">
import { computed, ref } from "vue";
import { can } from "../../../components/acl/can";

import ProductsManager from "../baseinfo/ProductsManager.vue";
import CategoriesManager from "../baseinfo/CategoriesManager.vue";
import ToppingsManager from "../baseinfo/ToppingsManager.vue";
import CustomersManager from "../baseinfo/CustomersManager.vue";
import UsersManager from "../baseinfo/UsersManager.vue";

type Item = { key: string; title: string };

const items = computed<Item[]>(() => {
    const x: Item[] = [
        { key: "products", title: "کالاها" },
        { key: "categories", title: "دسته‌بندی‌ها" },
        { key: "toppings", title: "تاپینگ‌ها" },
        { key: "customers", title: "مشتری‌ها" },
    ];
    if (can("users.manage")) x.push({ key: "users", title: "کاربران و دسترسی" });
    return x;
});

const active = ref(items.value[0]?.key ?? "products");

const ActiveCmp = computed(() => {
    switch (active.value) {
        case "categories":
            return CategoriesManager;
        case "toppings":
            return ToppingsManager;
        case "customers":
            return CustomersManager;
        case "users":
            return UsersManager;
        case "products":
        default:
            return ProductsManager;
    }
});
</script>

<template>
    <div class="bi-shell">
        <div class="bi-side">
            <div class="bi-side-title">اطلاعات پایه</div>
            <button v-for="i in items" :key="i.key" class="bi-side-btn" :class="{ active: i.key === active }"
                @click="active = i.key">
                {{ i.title }}
            </button>
        </div>

        <div class="bi-main">
            <component :is="ActiveCmp" />
        </div>
    </div>
</template>

<style scoped>
.bi-shell {
    height: 100%;
    min-height: 0;
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 12px;
}

.bi-side {
    border-radius: 18px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.bi-side-title {
    font-weight: 900;
    opacity: 0.9;
    padding: 8px 6px;
}

.bi-side-btn {
    min-height: 52px;
    border-radius: 14px;
    padding: 10px 12px;
    font-size: 16px;
    text-align: right;
    color: #e5e7eb;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    cursor: pointer;
}

.bi-side-btn.active {
    background: rgba(99, 102, 241, 0.18);
    border-color: rgba(99, 102, 241, 0.35);
    font-weight: 800;
}

.bi-main {
    border-radius: 18px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    min-height: 0;
    overflow: hidden;
}
</style>
