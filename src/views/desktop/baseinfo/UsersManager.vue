<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { can } from "../../../components/acl/can";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import {
  loadDesktopAccess,
  saveDesktopRole,
  saveDesktopUser,
  type DesktopRole,
  type DesktopUser,
} from "../../../services/desktopApi";

const permsCatalog = [
  { key: "view.sales", title: "مشاهده سفارشگیری" },
  { key: "view.baseInfo", title: "مشاهده اطلاعات پایه" },
  { key: "view.reports", title: "مشاهده گزارشات" },
  { key: "view.settings", title: "مشاهده تنظیمات" },
  { key: "view.discounts", title: "مشاهده صفحه تخفیف‌ها" },
  { key: "manage.products", title: "مدیریت کالا" },
  { key: "manage.categories", title: "مدیریت دسته‌بندی" },
  { key: "manage.toppings", title: "مدیریت تاپینگ" },
  { key: "manage.customers", title: "مدیریت مشتری" },
  { key: "customers.edit", title: "ویرایش مشتری" },
  { key: "customers.credit.add", title: "افزایش اعتبار مشتری" },
  { key: "customers.credit.subtract", title: "کاهش اعتبار مشتری" },
  { key: "manage.discounts", title: "مدیریت تخفیف‌ها" },
  { key: "manage.discountCards", title: "مدیریت کارت تخفیف" },
  { key: "sales.discount.percent", title: "تخفیف درصدی در فروش" },
  { key: "sales.discount.amount", title: "تخفیف مبلغی در فروش" },
  { key: "reports.export.excel", title: "خروجی اکسل گزارشات" },
  { key: "reports.invoices.edit", title: "ویرایش فاکتور گزارشات" },
  { key: "reports.invoices.delete", title: "حذف فاکتور گزارشات" },
  { key: "users.manage", title: "مدیریت کاربران" },
  { key: "settings.manage", title: "مدیریت تنظیمات" },
  { key: "backup.database", title: "گرفتن بکاپ دیتابیس" },
];

const roles = ref<DesktopRole[]>([]);
const users = ref<DesktopUser[]>([]);
const selectedRoleId = ref(0);
const editorUser = ref<DesktopUser | null>(null);
const loading = ref(false);
const message = ref("");

useDesktopToastMessage(message);

const selectedRole = computed(() => roles.value.find((role) => role.id === selectedRoleId.value) || roles.value[0]);

onMounted(loadAccess);

async function loadAccess() {
  loading.value = true;
  message.value = "";
  try {
    const data = await loadDesktopAccess();
    roles.value = data.roles;
    users.value = data.users.map(normalizeUser);
    selectedRoleId.value = roles.value[0]?.id ?? 0;
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در دریافت کاربران";
  } finally {
    loading.value = false;
  }
}

function togglePerm(p: string) {
  const role = selectedRole.value;
  if (!role) return;
  if (role.perms.includes(p)) role.perms = role.perms.filter((x) => x !== p);
  else role.perms.push(p);
}

function addRole() {
  const nextId = Math.max(0, ...roles.value.map((role) => role.id)) + 1;
  const role = { id: nextId, title: `نقش ${nextId}`, perms: ["view.sales"] };
  roles.value.push(role);
  selectedRoleId.value = role.id;
}

async function saveRole() {
  if (!selectedRole.value) return;
  await saveAndReload(() => saveDesktopRole(selectedRole.value));
}

function addUser() {
  editorUser.value = {
    id: 0,
    username: "",
    password: "",
    roleId: selectedRole.value?.id ?? roles.value[0]?.id ?? 0,
    isActive: true,
    discountPercentLimit: 0,
    discountAmountLimit: 0,
  };
}

function editUser(user: DesktopUser) {
  editorUser.value = { ...normalizeUser(user), password: "" };
}

async function saveUser() {
  if (!editorUser.value) return;
  await saveAndReload(() => saveDesktopUser(buildUserPayload(editorUser.value!)));
  editorUser.value = null;
}

async function saveAndReload(action: () => Promise<{ message?: string }>) {
  message.value = "";
  try {
    const result = await action();
    message.value = result.message || "ذخیره انجام شد";
    await loadAccess();
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در ذخیره";
  }
}

function roleTitle(roleId: number) {
  return roles.value.find((role) => role.id === roleId)?.title ?? "بدون نقش";
}

function normalizeLimit(value: unknown, max?: number) {
  const n = Number(value);
  const normalized = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
  return max ? Math.min(normalized, max) : normalized;
}

function normalizeUser(user: DesktopUser): DesktopUser {
  return {
    ...user,
    discountPercentLimit: normalizeLimit(user.discountPercentLimit ?? user.DiscountPercentLimit, 100),
    discountAmountLimit: normalizeLimit(user.discountAmountLimit ?? user.DiscountAmountLimit),
  };
}

function buildUserPayload(user: DesktopUser): DesktopUser {
  const discountPercentLimit = normalizeLimit(user.discountPercentLimit ?? user.DiscountPercentLimit, 100);
  const discountAmountLimit = normalizeLimit(user.discountAmountLimit ?? user.DiscountAmountLimit);

  return {
    ...user,
    discountPercentLimit,
    discountAmountLimit,
    DiscountPercentLimit: discountPercentLimit,
    DiscountAmountLimit: discountAmountLimit,
  };
}

function formatLimit(value: unknown, suffix = "") {
  const n = normalizeLimit(value);
  return n > 0 ? `${n.toLocaleString()}${suffix}` : "بدون سقف";
}
</script>

<template>
  <div v-if="can('users.manage')" class="u-shell">
    <div class="u-head">
      <div>
        <div class="u-title">کاربران و دسترسی</div>
        <div class="u-sub">{{ users.length }} کاربر، {{ roles.length }} نقش</div>
      </div>
      <div class="u-actions">
        <button class="u-btn" :disabled="loading" @click="loadAccess">بازخوانی</button>
        <button class="u-btn primary" @click="addUser">+ کاربر</button>
      </div>
    </div>

    <div v-if="message" class="u-message">{{ message }}</div>

    <div class="u-grid">
      <div class="u-card">
        <div class="u-card-head">
          <div class="u-title2">نقش‌ها</div>
          <button class="u-btn small" @click="addRole">+ نقش</button>
        </div>

        <div class="u-row">
          <select class="u-select" v-model.number="selectedRoleId">
            <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.title }}</option>
          </select>
          <button class="u-btn" :disabled="!selectedRole" @click="saveRole">ذخیره نقش</button>
        </div>

        <label v-if="selectedRole" class="field">
          <span>عنوان نقش</span>
          <input class="u-input" v-model="selectedRole.title" />
        </label>

        <div class="u-perms">
          <button v-for="p in permsCatalog" :key="p.key" class="perm"
            :class="{ on: selectedRole?.perms.includes(p.key) }" @click="togglePerm(p.key)">
            {{ p.title }}
          </button>
        </div>
      </div>

      <div class="u-card">
        <div class="u-title2">کاربران</div>
        <div class="u-table">
          <div class="u-tr u-th">
            <div>#</div>
            <div>نام کاربری</div>
            <div>نقش</div>
            <div>سقف درصد</div>
            <div>سقف مبلغ</div>
            <div>وضعیت</div>
            <div>عملیات</div>
          </div>
          <div class="u-tr" v-for="u in users" :key="u.id">
            <div>{{ u.id }}</div>
            <div class="bold">{{ u.username }}</div>
            <div>{{ roleTitle(u.roleId) }}</div>
            <div>{{ formatLimit(u.discountPercentLimit, "%") }}</div>
            <div>{{ formatLimit(u.discountAmountLimit) }}</div>
            <div>{{ u.isActive ? "فعال" : "غیرفعال" }}</div>
            <div><button class="u-btn small" @click="editUser(u)">ویرایش</button></div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="editorUser" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editorUser.id ? "ویرایش کاربر" : "افزودن کاربر" }}</h3>
          <button class="close-btn" @click="editorUser = null">×</button>
        </div>
        <div class="modal-body">
          <label class="field">
            <span>نام کاربری</span>
            <input class="u-input" v-model="editorUser.username" />
          </label>
          <label class="field">
            <span>رمز عبور</span>
            <input class="u-input" v-model="editorUser.password" type="password" placeholder="برای عدم تغییر خالی بماند" />
          </label>
          <label class="field">
            <span>نقش</span>
            <select class="u-select" v-model.number="editorUser.roleId">
              <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.title }}</option>
            </select>
          </label>
          <div class="limit-grid">
            <label class="field">
              <span>سقف درصد تخفیف</span>
              <input class="u-input" v-model.number="editorUser.discountPercentLimit" min="0" max="100" type="number" />
            </label>
            <label class="field">
              <span>سقف مبلغ تخفیف</span>
              <input class="u-input" v-model.number="editorUser.discountAmountLimit" min="0" type="number" />
            </label>
          </div>
          <label class="check-row">
            <span>فعال</span>
            <input v-model="editorUser.isActive" type="checkbox" />
          </label>
        </div>
        <div class="modal-footer">
          <button class="u-btn" @click="editorUser = null">انصراف</button>
          <button class="u-btn primary" @click="saveUser">ذخیره</button>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="nope">دسترسی مدیریت کاربران برای این حساب فعال نیست.</div>
</template>

<style scoped>
.u-shell { height: 100%; min-height: 0; display: flex; flex-direction: column; gap: 12px; }
.u-head, .u-card-head, .u-row, .u-actions, .modal-header, .modal-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.u-title { font-weight: 900; font-size: 18px; }
.u-sub { margin-top: 4px; font-size: 12px; color: #a7b0c3; }
.u-grid { flex: 1; min-height: 0; display: grid; grid-template-columns: 1.15fr 1fr; gap: 12px; }
.u-card { min-height: 0; overflow: hidden; border-radius: 8px; padding: 12px; background: rgba(255,255,255,.035); border: 1px solid rgba(255,255,255,.08); display: flex; flex-direction: column; gap: 12px; }
.u-title2 { font-weight: 900; }
.u-input, .u-select, .u-btn { min-height: 42px; border-radius: 8px; padding: 8px 10px; font-size: 14px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1); color: #eef2ff; }
.u-input, .u-select { width: 90%; }
.u-btn { cursor: pointer; white-space: nowrap; }
.u-btn.small { min-height: 34px; padding: 6px 9px; }
.u-btn.primary { font-weight: 900; background: rgba(20,184,166,.18); border-color: rgba(20,184,166,.34); }
.field { display: grid; gap: 7px; color: #a7b0c3; }
.limit-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.u-perms { flex: 1; min-height: 0; overflow: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); align-content: start; gap: 8px; }
.perm { min-height: 42px; border-radius: 8px; padding: 8px 10px; text-align: right; color: #eef2ff; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); cursor: pointer; }
.perm.on { font-weight: 900; color: #bbf7d0; background: rgba(34,197,94,.1); border-color: rgba(34,197,94,.22); }
.u-table { flex: 1; min-height: 0; overflow: auto; border-radius: 8px; border: 1px solid rgba(255,255,255,.08); }
.u-tr { display: grid; grid-template-columns: 70px 1fr 1fr 96px 120px 86px 86px; gap: 10px; align-items: center; padding: 10px; border-bottom: 1px solid rgba(255,255,255,.06); }
.u-th { position: sticky; top: 0; z-index: 2; font-weight: 900; color: #a7b0c3; background: rgba(16,19,26,.96); }
.bold { font-weight: 900; }
.u-message { border-radius: 8px; padding: 10px 12px; color: #fde68a; background: rgba(245,158,11,.12); border: 1px solid rgba(245,158,11,.22); }
.modal-overlay { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; background: rgba(0,0,0,.58); }
.modal-content { width: min(480px, calc(100vw - 32px)); border-radius: 8px; padding: 14px; background: #171b24; border: 1px solid rgba(255,255,255,.1); }
.modal-body { display: grid; gap: 12px; padding: 14px 0; }
.close-btn { min-width: 38px; min-height: 38px; border-radius: 8px; color: #eef2ff; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1); cursor: pointer; }
.check-row { display: flex; justify-content: space-between; }
.nope { padding: 20px; opacity: .85; }
</style>
