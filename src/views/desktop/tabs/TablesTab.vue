<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { requestInvoiceEdit } from "../../../components/stores/invoice-edit.store";
import { requestTableOrder } from "../../../components/stores/table-order.store";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import {
  deleteDesktopInvoice,
  fetchRuntimeConfig,
  loadDesktopInvoiceItems,
  loadDesktopTables,
  moveDesktopTableInvoice,
  payDesktopPos,
  printDesktopInvoice,
  saveDesktopTable,
  saveDesktopTableGroup,
  settleDesktopTableInvoice,
  type ApiEnvelope,
  type DesktopDiningTable,
  type DesktopTableGroup,
} from "../../../services/desktopApi";

const groups = ref<DesktopTableGroup[]>([]);
const tables = ref<DesktopDiningTable[]>([]);
const selectedGroupId = ref<number | null>(null);
const loading = ref(false);
const saving = ref(false);
const message = ref("");
const currencyIsRial = ref(false);

useDesktopToastMessage(message);

const groupForm = ref<DesktopTableGroup>({
  TableGroupId: 0,
  GroupTitle: "",
  GroupCode: "",
  IsActive: true,
});
const tableForm = ref<DesktopDiningTable>({
  TableId: 0,
  TableGroupId: 0,
  TableTitle: "",
  TableCode: "",
  IsActive: true,
  IsOccupied: false,
});

const contextMenu = ref<{ x: number; y: number; table: DesktopDiningTable } | null>(null);
const settlingTable = ref<DesktopDiningTable | null>(null);
const settleCash = ref(0);
const moveTable = ref<DesktopDiningTable | null>(null);
const targetTableId = ref<number | null>(null);

const activeGroups = computed(() => groups.value.filter((group) => group.IsActive !== false));
const visibleTables = computed(() =>
  tables.value.filter((table) => selectedGroupId.value === null || table.TableGroupId === selectedGroupId.value)
);
const freeTargetTables = computed(() =>
  tables.value.filter((table) => table.IsActive !== false && !table.IsOccupied && table.TableId !== moveTable.value?.TableId)
);
const settlePayable = computed(() => amount(settlingTable.value?.Payable));
const settlePos = computed(() => Math.max(0, settlePayable.value - amount(settleCash.value)));

onMounted(() => {
  void loadTables();
  void loadRuntimeSettings();
  window.addEventListener("click", closeContextMenu);
});

onBeforeUnmount(() => {
  window.removeEventListener("click", closeContextMenu);
});

async function loadTables() {
  loading.value = true;
  message.value = "";
  try {
    const result = await loadDesktopTables();
    groups.value = result.groups;
    tables.value = result.tables;
    if (selectedGroupId.value === null && result.groups.length) {
      selectedGroupId.value = result.groups[0].TableGroupId;
    }
    if (!tableForm.value.TableGroupId) {
      tableForm.value.TableGroupId = result.groups[0]?.TableGroupId || 0;
    }
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در دریافت میزها";
    groups.value = [];
    tables.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadRuntimeSettings() {
  try {
    const settings = await fetchRuntimeConfig();
    currencyIsRial.value = settings.Currency === true;
  } catch {
    currencyIsRial.value = false;
  }
}

function amount(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value: unknown) {
  return Math.round(amount(value)).toLocaleString();
}

function formatDuration(minutes: unknown) {
  const total = Math.max(0, Math.floor(amount(minutes)));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function toPosDeviceAmount(value: number) {
  return Math.round(currencyIsRial.value ? value : value * 10);
}

function responseIsOk(response: ApiEnvelope) {
  return response.status === true || response.status === "ok" || response.status === undefined;
}

function resetGroupForm() {
  groupForm.value = {
    TableGroupId: 0,
    GroupTitle: "",
    GroupCode: "",
    IsActive: true,
  };
}

function resetTableForm() {
  const groupId = selectedGroupId.value || groups.value[0]?.TableGroupId || 0;

  tableForm.value = {
    TableId: 0,
    TableGroupId: groupId,
    TableTitle: "",
    TableCode: groupId ? nextTableCode(groupId) : "",
    IsActive: true,
    IsOccupied: false,
  };
}

function editGroup(group: DesktopTableGroup) {
  groupForm.value = { ...group };
}

function editTable(table: DesktopDiningTable) {
  tableForm.value = { ...table };
}

async function saveGroup() {
  saving.value = true;
  message.value = "";
  try {
    const payload = { ...groupForm.value };

    if (payload.TableGroupId === 0 && !payload.GroupCode) {
      payload.GroupCode = nextGroupCode();
    }

    const result = await saveDesktopTableGroup(payload);

    message.value = result.message || "گروه میز ذخیره شد";
    if (responseIsOk(result)) {
      await loadTables();
      resetGroupForm();
    }
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در ذخیره گروه میز";
  } finally {
    saving.value = false;
  }
}

async function saveTable() {
  saving.value = true;
  message.value = "";
  try {
    if (!tableForm.value.TableCode && tableForm.value.TableGroupId) {
      tableForm.value.TableCode = nextTableCode(tableForm.value.TableGroupId);
    }

    const result = await saveDesktopTable(tableForm.value);
    message.value = result.message || "میز ذخیره شد";
    if (responseIsOk(result)) {
      resetTableForm();
      await loadTables();
    }
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در ذخیره میز";
  } finally {
    saving.value = false;
  }
}

function openContext(event: MouseEvent, table: DesktopDiningTable) {
  event.preventDefault();

  const menuWidth = 220;
  const menuHeight = table.IsOccupied ? 270 : 60;
  const padding = 8;

  let x = event.clientX;
  let y = event.clientY;

  if (x + menuWidth + padding > window.innerWidth) {
    x = window.innerWidth - menuWidth - padding;
  }

  if (y + menuHeight + padding > window.innerHeight) {
    y = window.innerHeight - menuHeight - padding;
  }

  contextMenu.value = {
    x: Math.max(padding, x),
    y: Math.max(padding, y),
    table,
  };
}

function closeContextMenu() {
  contextMenu.value = null;
}

function startOrderForTable(table: DesktopDiningTable) {
  if (table.IsActive === false) {
    message.value = "این میز غیرفعال است";
    return;
  }

  closeContextMenu();
  if (table.IsOccupied && table.SaleInvoiceId) {
    void editInvoice(table);
    return;
  }

  requestTableOrder(table);
  message.value = `میز ${table.TableTitle} برای سفارش سالن انتخاب شد`;
}

async function editInvoice(table: DesktopDiningTable) {
  closeContextMenu();
  if (!table.SaleInvoiceId) return;
  message.value = "";
  try {
    const items = await loadDesktopInvoiceItems(table.SaleInvoiceId);
    requestInvoiceEdit(
      {
        SaleInvoiceId: table.SaleInvoiceId,
        SaleInvoiceNumberDay: table.SaleInvoiceNumberDay || 0,
        OrderDate: "",
        OrderTime: "",
        CustomerCode: 1,
        CustomerName: "",
        Phone: "",
        Price: amount(table.Payable),
        Tax: 0,
        PackingPrice: 0,
        Payable: amount(table.Payable),
        InvoiceTypeName: "سالن",
        TableId: table.TableId,
        TableTitle: table.TableTitle,
        TableCode: table.TableCode,
        IsSettled: false,
        TableOpenedAt: table.OpenedAt,
      },
      items
    );
    message.value = "فاکتور میز برای ویرایش باز شد";
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در آماده‌سازی فاکتور";
  }
}

function openSettle(table: DesktopDiningTable) {
  closeContextMenu();
  settlingTable.value = table;
  settleCash.value = 0;
}

async function submitSettle() {
  if (!settlingTable.value?.SaleInvoiceId) return;
  saving.value = true;
  message.value = "";
  try {
    if (settlePos.value > 0) {
      const posResult = await payDesktopPos(toPosDeviceAmount(settlePos.value));
      if (!responseIsOk(posResult)) {
        message.value = posResult.message || "پرداخت کارتخوان تایید نشد";
        return;
      }
    }

    const result = await settleDesktopTableInvoice(settlingTable.value.SaleInvoiceId, {
      CashPrice: amount(settleCash.value),
      PosPrice: settlePos.value,
      CreditPrice: 0,
    });
    message.value = result.message || "فاکتور میز تسویه شد";
    if (responseIsOk(result)) {
      settlingTable.value = null;
      await loadTables();
    }
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در تسویه میز";
  } finally {
    saving.value = false;
  }
}

async function printTableInvoice(table: DesktopDiningTable, usage: "customer" | "kitchen") {
  closeContextMenu();
  if (!table.SaleInvoiceId) return;
  message.value = "";
  try {
    const result = await printDesktopInvoice(table.SaleInvoiceId, usage);
    message.value = result.message || "فاکتور چاپ شد";
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در چاپ فاکتور";
  }
}

function openMove(table: DesktopDiningTable) {
  closeContextMenu();
  moveTable.value = table;
  targetTableId.value = freeTargetTables.value[0]?.TableId || null;
}

async function submitMove() {
  if (!moveTable.value?.SaleInvoiceId || !targetTableId.value) return;
  saving.value = true;
  message.value = "";
  try {
    const result = await moveDesktopTableInvoice(moveTable.value.SaleInvoiceId, targetTableId.value);
    message.value = result.message || "میز جابجا شد";
    if (responseIsOk(result)) {
      moveTable.value = null;
      await loadTables();
    }
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در جابجایی میز";
  } finally {
    saving.value = false;
  }
}

async function cancelInvoice(table: DesktopDiningTable) {
  closeContextMenu();
  if (!table.SaleInvoiceId) return;
  if (!window.confirm(`فاکتور میز ${table.TableTitle} ابطال شود؟`)) return;
  saving.value = true;
  message.value = "";
  try {
    const result = await deleteDesktopInvoice(table.SaleInvoiceId);
    message.value = result.message || "فاکتور ابطال شد";
    if (responseIsOk(result)) await loadTables();
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در ابطال فاکتور";
  } finally {
    saving.value = false;
  }
}

function nextGroupCode() {
  const maxCode = Math.max(
    0,
    ...groups.value.map(g => Number(g.GroupCode)).filter(Number.isFinite)
  );
  return String(maxCode + 1);
}

function nextTableCode(groupId: number) {
  const group = groups.value.find(g => g.TableGroupId === groupId);
  const groupCode = Number(group?.GroupCode || 0);

  const start = groupCode * 100;

  const maxCode = Math.max(
    start - 1,
    ...tables.value
      .filter(t => t.TableGroupId === groupId)
      .map(t => Number(t.TableCode))
      .filter(Number.isFinite)
  );

  return String(maxCode + 1);
}

watch(
  () => tableForm.value.TableGroupId,
  (groupId) => {
    if (tableForm.value.TableId === 0 && groupId) {
      tableForm.value.TableCode = nextTableCode(groupId);
    }
  }
);
</script>

<template>
  <div class="tables-shell">
    <header class="tables-head">
      <div>
        <div class="tables-title">میزها</div>
        <div class="tables-sub">{{ tables.length.toLocaleString() }} میز، {{ activeGroups.length.toLocaleString() }}
          گروه فعال</div>
      </div>
      <button class="t-btn" :disabled="loading" @click="loadTables">
        {{ loading ? "در حال دریافت" : "بازخوانی" }}
      </button>
    </header>

    <div class="group-strip">
      <button :class="{ active: selectedGroupId === null }" @click="selectedGroupId = null">همه</button>
      <button v-for="group in activeGroups" :key="group.TableGroupId"
        :class="{ active: selectedGroupId === group.TableGroupId }" @click="selectedGroupId = group.TableGroupId">
        {{ group.GroupTitle }}
      </button>
    </div>

    <main class="tables-layout">
      <section class="tables-board">
        <div v-if="loading" class="table-empty">در حال دریافت میزها...</div>
        <div v-else-if="!visibleTables.length" class="table-empty">میزی برای این گروه تعریف نشده است</div>
        <template v-else>
          <button v-for="table in visibleTables" :key="table.TableId" class="table-card" :class="{
            occupied: table.IsOccupied,
            inactive: table.IsActive === false
          }" @click="table.IsActive !== false && startOrderForTable(table)" @contextmenu=" openContext($event,
            table)">
            <span v-if="table.IsActive === false" class="inactive-badge">
              غیرفعال
            </span>

            <span class="table-amount">
              {{
                table.IsActive === false
                  ? "غیرفعال"
                  : table.IsOccupied
                    ? `${formatMoney(table.Payable)} تومان`
                    : "آزاد"
              }}
            </span>

            <span class="table-time">
              {{
                table.IsOccupied
                  ? formatDuration(table.OccupiedMinutes)
                  : table.TableCode
              }}
            </span>

            <strong>{{ table.TableTitle }}</strong>
            <small>{{ table.GroupTitle }}</small>
          </button>
        </template>
      </section>

      <aside class="table-admin">
        <section class="admin-box">
          <div class="admin-title">
            <span>گروه میز</span>
            <button class="mini" @click="resetGroupForm">جدید</button>
          </div>
          <input v-model="groupForm.GroupTitle" placeholder="عنوان گروه" />
          <input v-model="groupForm.GroupCode" placeholder="کد گروه" />
          <label><span>فعال</span><input v-model="groupForm.IsActive" type="checkbox" /></label>
          <button class="t-btn primary" :disabled="saving" @click="saveGroup">ذخیره گروه</button>
          <div class="quick-list">
            <button v-for="group in groups" :key="group.TableGroupId" @click="editGroup(group)">{{ group.GroupTitle
            }}</button>
          </div>
        </section>

        <section class="admin-box">
          <div class="admin-title">
            <span>میز</span>
            <button class="mini" @click="resetTableForm">جدید</button>
          </div>
          <select v-model.number="tableForm.TableGroupId">
            <option v-for="group in groups" :key="group.TableGroupId" :value="group.TableGroupId">{{ group.GroupTitle }}
            </option>
          </select>
          <input v-model="tableForm.TableTitle" placeholder="عنوان میز" />
          <input v-model="tableForm.TableCode" placeholder="کد میز" />
          <label><span>فعال</span><input v-model="tableForm.IsActive" type="checkbox" /></label>
          <button class="t-btn primary" :disabled="saving || !groups.length" @click="saveTable">ذخیره میز</button>
          <div class="quick-list">
            <button v-for="table in visibleTables" :key="`edit-${table.TableId}`" @click="editTable(table)">{{
              table.TableTitle }}</button>
          </div>
        </section>
      </aside>
    </main>

    <div v-if="message" class="table-message">{{ message }}</div>

    <div v-if="contextMenu" class="context-menu" :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }">
      <template v-if="contextMenu.table.IsOccupied">
        <button @click="editInvoice(contextMenu.table)">ویرایش</button>
        <button @click="openSettle(contextMenu.table)">تسویه</button>
        <button @click="printTableInvoice(contextMenu.table, 'kitchen')">چاپ فاکتور آشپزخانه</button>
        <button @click="printTableInvoice(contextMenu.table, 'customer')">چاپ فاکتور مشتری</button>
        <button @click="openMove(contextMenu.table)">جابجایی میز</button>
        <button class="danger" @click="cancelInvoice(contextMenu.table)">ابطال</button>
      </template>
      <button v-else @click="editTable(contextMenu.table); closeContextMenu()">ویرایش میز</button>
    </div>

    <div v-if="settlingTable" class="modal-overlay">
      <div class="table-modal">
        <div class="modal-head">
          <div>
            <div class="modal-title">تسویه میز {{ settlingTable.TableTitle }}</div>
            <div class="modal-sub">مبلغ فاکتور {{ formatMoney(settlePayable) }} تومان</div>
          </div>
          <button class="icon" @click="settlingTable = null">×</button>
        </div>
        <div class="modal-body">
          <label class="field">
            <span>نقدی</span>
            <input v-model.number="settleCash" type="number" min="0" :max="settlePayable" />
          </label>
          <div class="settle-pos">
            <span>کارتخوان</span>
            <b>{{ formatMoney(settlePos) }} تومان</b>
          </div>
        </div>
        <div class="modal-actions">
          <button class="t-btn" @click="settlingTable = null">برگشت</button>
          <button class="t-btn primary" :disabled="saving" @click="submitSettle">ثبت تسویه</button>
        </div>
      </div>
    </div>

    <div v-if="moveTable" class="modal-overlay">
      <div class="table-modal">
        <div class="modal-head">
          <div>
            <div class="modal-title">جابجایی {{ moveTable.TableTitle }}</div>
            <div class="modal-sub">میز مقصد باید آزاد باشد</div>
          </div>
          <button class="icon" @click="moveTable = null">×</button>
        </div>
        <div class="modal-body">
          <label class="field">
            <span>میز مقصد</span>
            <select v-model.number="targetTableId">
              <option v-for="table in freeTargetTables" :key="table.TableId" :value="table.TableId">
                {{ table.TableTitle }} - {{ table.GroupTitle }}
              </option>
            </select>
          </label>
        </div>
        <div class="modal-actions">
          <button class="t-btn" @click="moveTable = null">برگشت</button>
          <button class="t-btn primary" :disabled="saving || !targetTableId" @click="submitMove">جابجا کن</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tables-shell {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  direction: rtl;
}

.tables-head,
.admin-title,
.modal-head,
.modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tables-title {
  font-size: 20px;
  font-weight: 900;
}

.tables-sub,
.modal-sub {
  margin-top: 4px;
  color: #a7b0c3;
  font-size: 13px;
}

.t-btn,
.group-strip button,
.table-card,
.admin-box input,
.admin-box select,
.admin-box label,
.quick-list button,
.context-menu button,
.field input,
.field select,
.icon {
  border-radius: 8px;
  font-family: inherit;
}

.t-btn {
  min-height: 44px;
  padding: 8px 12px;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
}

.t-btn.primary {
  font-weight: 900;
  background: rgba(20, 184, 166, 0.18);
  border-color: rgba(20, 184, 166, 0.34);
}

.t-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.group-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.group-strip button {
  min-height: 42px;
  padding: 8px 14px;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  white-space: nowrap;
}

.group-strip button.active {
  color: #ccfbf1;
  background: rgba(20, 184, 166, 0.16);
  border-color: rgba(20, 184, 166, 0.34);
  font-weight: 900;
}

.tables-layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 12px;
}

.tables-board {
  min-height: 0;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  align-content: start;
  gap: 12px;
}

.table-card {
  aspect-ratio: 1 / 0.88;
  min-height: 132px;
  display: grid;
  grid-template-rows: 22px 22px 1fr 20px;
  align-items: center;
  justify-items: center;
  gap: 4px;
  padding: 12px;
  color: #dcfce7;
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.26);
  cursor: pointer;
}

.table-card.occupied {
  color: #fee2e2;
  background: rgba(239, 68, 68, 0.18);
  border-color: rgba(239, 68, 68, 0.38);
}

.table-card.inactive {
  position: relative;
  color: #d1d5db;
  background: rgba(107, 114, 128, 0.15);
  border-color: rgba(107, 114, 128, 0.35);
  overflow: hidden;
}

.inactive-badge {
  position: absolute;
  top: 12px;
  left: -32px;

  width: 120px;
  text-align: center;

  transform: rotate(-45deg);

  background: rgba(107, 114, 128, 0.9);
  color: white;

  font-size: 11px;
  font-weight: 900;

  padding: 4px 0;

  pointer-events: none;
  z-index: 5;
}

.table-card strong {
  font-size: 18px;
  font-weight: 900;
}

.table-card small,
.table-time {
  color: #a7b0c3;
}

.table-amount {
  font-weight: 900;
}

.table-admin {
  min-height: 0;
  overflow: auto;
  display: grid;
  gap: 12px;
}

.admin-box {
  display: grid;
  gap: 9px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.admin-title {
  font-weight: 900;
}

.mini {
  min-height: 30px;
  border-radius: 8px;
  color: #ccfbf1;
  background: rgba(20, 184, 166, 0.12);
  border: 1px solid rgba(20, 184, 166, 0.22);
  cursor: pointer;
}

.admin-box input,
.admin-box select,
.field input,
.field select {
  min-height: 42px;
  padding: 8px 10px;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.admin-box label {
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  color: #a7b0c3;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.quick-list {
  max-height: 92px;
  overflow: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.quick-list button {
  min-height: 30px;
  color: #dbeafe;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.22);
  cursor: pointer;
}

.table-empty,
.table-message {
  border-radius: 8px;
  padding: 12px;
  color: #fde68a;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.22);
}

.context-menu {
  position: fixed;
  z-index: 160;
  width: 220px;
  display: grid;
  padding: 6px;
  border-radius: 8px;
  background: #171b24;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.4);
}

.context-menu button {
  min-height: 38px;
  text-align: right;
  color: #eef2ff;
  background: transparent;
  border: 0;
  padding: 8px;
  cursor: pointer;
}

.context-menu button:hover {
  background: rgba(255, 255, 255, 0.06);
}

.context-menu button.danger {
  color: #fecaca;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 150;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.64);
}

.table-modal {
  width: min(460px, calc(100vw - 48px));
  border-radius: 8px;
  background: #171b24;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.modal-head,
.modal-actions {
  padding: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-actions {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: 0;
}

.modal-title {
  font-size: 17px;
  font-weight: 900;
}

.modal-body {
  padding: 14px;
  display: grid;
  gap: 12px;
}

.field {
  display: grid;
  gap: 7px;
  color: #a7b0c3;
}

.settle-pos {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  border-radius: 8px;
  padding: 12px;
  color: #bfdbfe;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.icon {
  width: 38px;
  height: 38px;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
}

@media (max-width: 1100px) {
  .tables-layout {
    grid-template-columns: 1fr;
  }

  .table-admin {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .table-admin {
    grid-template-columns: 1fr;
  }
}
</style>
