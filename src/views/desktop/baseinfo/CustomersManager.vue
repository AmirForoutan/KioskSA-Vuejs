<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { can } from "../../../components/acl/can";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import {
  deleteDesktopCustomer,
  loadDesktopCustomers,
  manageDesktopCredit,
  saveDesktopCustomer,
  type DesktopCustomer,
} from "../../../services/desktopApi";

const q = ref("");
const rows = ref<DesktopCustomer[]>([]);
const loading = ref(false);
const saving = ref(false);
const deletingCustomerId = ref<number | string | null>(null);
const message = ref("");
const editor = ref<DesktopCustomer | null>(null);
const originalCredit = ref(0);

useDesktopToastMessage(message);

const canEditCustomer = computed(() => can("manage.customers") || can("customers.edit"));
const canDeleteCustomer = computed(() => can("manage.customers"));
const canAddCredit = computed(() => can("manage.customers") || can("customers.credit.add"));
const canSubtractCredit = computed(() => can("manage.customers") || can("customers.credit.subtract"));
const canEditCredit = computed(() => canAddCredit.value || canSubtractCredit.value);
const creditHelpText = computed(() => {
  if (canAddCredit.value && canSubtractCredit.value) return "افزایش و کاهش اعتبار مجاز است";
  if (canAddCredit.value) return "فقط افزایش اعتبار مجاز است";
  if (canSubtractCredit.value) return "فقط کاهش اعتبار مجاز است";
  return "دسترسی تغییر اعتبار ندارید";
});

const filtered = computed(() => {
  const s = q.value.trim();
  if (!s) return rows.value;
  return rows.value.filter((row) => `${row.FullName ?? ""} ${row.PhoneNumber ?? ""}`.includes(s));
});

onMounted(loadRows);

type CustomerSaveResult = {
  status?: boolean | string;
  message?: string;
  Message?: string;
};

function amount(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.round(numberValue) : 0;
}

function responseIsOk(response: CustomerSaveResult) {
  return response.status === true || response.status === "true" || response.status === "ok" || response.status === undefined;
}

function responseMessage(response: CustomerSaveResult, fallback: string) {
  return response.message || response.Message || fallback;
}

function customerIdOf(customer: DesktopCustomer) {
  return customer.CustomerId ?? customer.UserId ?? 0;
}

function hasInvoices(customer: DesktopCustomer) {
  return amount(customer.TotalOrders) > 0;
}

async function loadRows() {
  loading.value = true;
  message.value = "";
  try {
    rows.value = await loadDesktopCustomers(q.value.trim());
    if (!rows.value.length) message.value = "مشتری‌ای برای نمایش پیدا نشد";
  } catch (error) {
    rows.value = [];
    message.value = error instanceof Error ? error.message : "خطا در دریافت مشتری‌ها";
  } finally {
    loading.value = false;
  }
}

function add() {
  if (!canEditCustomer.value) return;
  originalCredit.value = 0;
  editor.value = {
    CustomerId: 0,
    FullName: "",
    PhoneNumber: "",
    CreditBalance: 0,
    Notes: "",
    IsActive: true,
  };
}

function edit(id: number | string | undefined) {
  if (!canEditCustomer.value) return;
  const row = rows.value.find((item) => String(item.CustomerId) === String(id));
  if (row) {
    originalCredit.value = amount(row.CreditBalance);
    editor.value = { ...row };
  }
}

function normalizeCreditByPermission(nextCredit: number) {
  if (!canEditCredit.value) return originalCredit.value;
  if (!canAddCredit.value && nextCredit > originalCredit.value) return originalCredit.value;
  if (!canSubtractCredit.value && nextCredit < originalCredit.value) return originalCredit.value;
  return nextCredit;
}

async function save() {
  if (!editor.value || !canEditCustomer.value) return;
  saving.value = true;
  message.value = "";
  try {
    const customer = { ...editor.value, CreditBalance: amount(editor.value.CreditBalance) };
    const customerId = customer.CustomerId ?? customer.UserId ?? 0;
    const isExistingCustomer = Number(customerId) > 0;
    const requestedCredit = amount(customer.CreditBalance);
    const nextCredit = normalizeCreditByPermission(requestedCredit);
    const creditIncrease = nextCredit - originalCredit.value;
    const creditDecrease = originalCredit.value - nextCredit;

    if (requestedCredit !== nextCredit) {
      if (requestedCredit > originalCredit.value && !canAddCredit.value) {
        throw new Error("دسترسی افزایش اعتبار مشتری را ندارید");
      }
      if (requestedCredit < originalCredit.value && !canSubtractCredit.value) {
        throw new Error("دسترسی کاهش اعتبار مشتری را ندارید");
      }
      throw new Error("دسترسی تغییر اعتبار مشتری را ندارید");
    }

    if (!isExistingCustomer && nextCredit > 0 && !canAddCredit.value) {
      throw new Error("برای ثبت اعتبار اولیه، دسترسی افزایش اعتبار لازم است");
    }

    if (isExistingCustomer && (creditIncrease > 0 || creditDecrease > 0)) {
      const detailResult = await saveDesktopCustomer({ ...customer, CreditBalance: originalCredit.value });
      if (!responseIsOk(detailResult)) {
        throw new Error(responseMessage(detailResult, "خطا در ذخیره مشتری"));
      }

      const creditResult = await manageDesktopCredit({
        CustomerId: customerId,
        TransactionType: creditIncrease > 0 ? 1 : 2,
        Amount: Math.abs(creditIncrease || creditDecrease),
        Description: creditIncrease > 0 ? "افزایش اعتبار در هنگام ویرایش مشتری" : "کاهش اعتبار در هنگام ویرایش مشتری",
      });
      if (!responseIsOk(creditResult)) {
        throw new Error(responseMessage(creditResult, "خطا در تغییر اعتبار مشتری"));
      }
    } else {
      const result = await saveDesktopCustomer({ ...customer, CreditBalance: nextCredit });
      if (!responseIsOk(result)) {
        throw new Error(responseMessage(result, "خطا در ذخیره مشتری"));
      }
    }

    message.value = "مشتری ذخیره شد";
    editor.value = null;
    await loadRows();
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در ذخیره مشتری";
  } finally {
    saving.value = false;
  }
}

async function remove(customer: DesktopCustomer) {
  if (!canDeleteCustomer.value) return;
  const customerId = customerIdOf(customer);
  if (!customerId) return;

  if (hasInvoices(customer)) {
    message.value = "این مشتری فاکتور دارد و قابل حذف نیست";
    return;
  }

  const confirmed = window.confirm(`مشتری "${customer.FullName || customer.PhoneNumber || customerId}" حذف شود؟`);
  if (!confirmed) return;

  deletingCustomerId.value = customerId;
  message.value = "";
  try {
    const result = await deleteDesktopCustomer(customerId);
    if (!responseIsOk(result)) {
      throw new Error(responseMessage(result, "خطا در حذف مشتری"));
    }
    message.value = responseMessage(result, "مشتری حذف شد");
    await loadRows();
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در حذف مشتری";
  } finally {
    deletingCustomerId.value = null;
  }
}
</script>

<template>
  <div class="m-shell">
    <div class="m-head">
      <div>
        <div class="m-title">مدیریت مشتری‌ها</div>
        <div class="m-sub">{{ filtered.length }} مشتری</div>
      </div>
      <div class="m-tools">
        <input class="m-input" v-model="q" placeholder="جستجوی نام یا موبایل..." @keyup.enter="loadRows" />
        <button class="m-btn" :disabled="loading" @click="loadRows">جستجو/بازخوانی</button>
        <button v-if="canEditCustomer" class="m-btn primary" @click="add">+ افزودن مشتری</button>
      </div>
    </div>

    <div v-if="message" class="m-message">{{ message }}</div>

    <div class="m-table">
      <div class="m-tr m-th">
        <div>#</div>
        <div>نام</div>
        <div>موبایل</div>
        <div>مانده اعتبار</div>
        <div>وضعیت</div>
        <div>عملیات</div>
      </div>

      <div v-if="loading" class="m-empty">در حال بارگذاری...</div>

      <div class="m-tr" v-for="r in filtered" :key="r.CustomerId">
        <div>{{ r.CustomerId }}</div>
        <div class="bold">{{ r.FullName }}</div>
        <div>{{ r.PhoneNumber }}</div>
        <div :style="{ color: Number(r.CreditBalance || 0) >= 0 ? '#86efac' : '#fca5a5' }">
          {{ Number(r.CreditBalance || 0).toLocaleString() }}
        </div>
        <div>
          <span class="status" :class="{ off: r.IsActive === false }">{{ r.IsActive === false ? "غیرفعال" : "فعال" }}</span>
        </div>
        <div class="row-actions" v-if="canEditCustomer || canDeleteCustomer">
          <button v-if="canEditCustomer" class="m-btn small" @click="edit(r.CustomerId)">ویرایش</button>
          <button
            v-if="canDeleteCustomer"
            class="m-btn small danger"
            :disabled="deletingCustomerId === (r.CustomerId ?? r.UserId) || hasInvoices(r)"
            :title="hasInvoices(r) ? 'این مشتری فاکتور دارد و قابل حذف نیست' : 'حذف مشتری'"
            @click="remove(r)"
          >
            {{ deletingCustomerId === (r.CustomerId ?? r.UserId) ? "..." : "حذف" }}
          </button>
        </div>
        <div v-else></div>
      </div>
    </div>

    <div v-if="editor" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ Number(editor.CustomerId || 0) > 0 ? "ویرایش مشتری" : "افزودن مشتری" }}</h3>
          <button class="close-btn" @click="editor = null">×</button>
        </div>

        <div class="modal-body">
          <label class="form-group">
            <span>نام کامل</span>
            <input v-model="editor.FullName" />
          </label>
          <label class="form-group">
            <span>موبایل</span>
            <input v-model="editor.PhoneNumber" maxlength="11" />
          </label>
          <label class="form-group">
            <span>مانده اعتبار</span>
            <input
              v-model.number="editor.CreditBalance"
              type="number"
              :disabled="!canEditCredit"
              :min="canSubtractCredit ? undefined : originalCredit"
              :max="canAddCredit ? undefined : originalCredit"
            />
            <small>{{ creditHelpText }}</small>
          </label>
          <label class="form-group">
            <span>یادداشت</span>
            <textarea v-model="editor.Notes" rows="3"></textarea>
          </label>
          <label class="check-row">
            <span>فعال</span>
            <input v-model="editor.IsActive" type="checkbox" />
          </label>
        </div>

        <div class="modal-footer">
          <button class="m-btn" @click="editor = null">انصراف</button>
          <button class="m-btn primary" :disabled="saving" @click="save">{{ saving ? "در حال ذخیره" : "ذخیره" }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.m-shell { height: 100%; min-height: 0; display: flex; flex-direction: column; gap: 12px; }
.m-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.m-title { font-weight: 900; font-size: 18px; }
.m-sub { margin-top: 4px; font-size: 12px; color: #a7b0c3; }
.m-tools { display: flex; gap: 10px; align-items: center; width: min(680px, 100%); }
.m-input, .m-btn, .form-group input, .form-group textarea { min-height: 46px; border-radius: 8px; padding: 9px 11px; font-size: 14px; color: #eef2ff; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1); }
.m-input { width: 100%; }
.m-btn { cursor: pointer; white-space: nowrap; }
.m-btn.small { min-height: 36px; padding: 7px 9px; }
.m-btn.primary { font-weight: 900; background: rgba(20,184,166,.18); border-color: rgba(20,184,166,.34); }
.m-btn.danger { color: #fecaca; background: rgba(239,68,68,.12); border-color: rgba(239,68,68,.28); }
.m-btn:disabled { cursor: not-allowed; opacity: .5; }
.row-actions { display: flex; gap: 7px; align-items: center; }
.m-table { flex: 1; min-height: 0; overflow: auto; border-radius: 8px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.02); }
.m-tr { display: grid; grid-template-columns: 80px 1.4fr 1fr 1fr 110px 170px; gap: 10px; align-items: center; padding: 11px 12px; border-bottom: 1px solid rgba(255,255,255,.06); }
.m-th { position: sticky; top: 0; z-index: 2; font-weight: 900; color: #a7b0c3; background: rgba(16,19,26,.96); }
.bold { font-weight: 900; }
.status { color: #bbf7d0; }
.status.off { color: #fca5a5; }
.m-message { border-radius: 8px; padding: 10px 12px; color: #fde68a; background: rgba(245,158,11,.12); border: 1px solid rgba(245,158,11,.22); }
.m-empty { padding: 24px; opacity: .75; }
.modal-overlay { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; background: rgba(0,0,0,.58); }
.modal-content { width: min(520px, calc(100vw - 32px)); border-radius: 8px; padding: 14px; background: #171b24; border: 1px solid rgba(255,255,255,.1); }
.modal-header, .modal-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.modal-body { display: grid; gap: 12px; padding: 14px 0; }
.form-group { display: grid; gap: 7px; color: #a7b0c3; }
.form-group small { color: #93c5fd; }
.close-btn { min-width: 38px; min-height: 38px; border-radius: 8px; color: #eef2ff; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1); cursor: pointer; }
.check-row { display: flex; justify-content: space-between; }
</style>