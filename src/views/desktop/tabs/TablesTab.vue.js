import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { requestInvoiceEdit } from "../../../components/stores/invoice-edit.store";
import { requestTableOrder } from "../../../components/stores/table-order.store";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import { deleteDesktopInvoice, fetchRuntimeConfig, loadDesktopInvoiceItems, loadDesktopTables, moveDesktopTableInvoice, payDesktopPos, printDesktopInvoice, saveDesktopTable, saveDesktopTableGroup, settleDesktopTableInvoice, } from "../../../services/desktopApi";
const groups = ref([]);
const tables = ref([]);
const selectedGroupId = ref(null);
const loading = ref(false);
const saving = ref(false);
const message = ref("");
const currencyIsRial = ref(false);
useDesktopToastMessage(message);
const groupForm = ref({
    TableGroupId: 0,
    GroupTitle: "",
    GroupCode: "",
    IsActive: true,
});
const tableForm = ref({
    TableId: 0,
    TableGroupId: 0,
    TableTitle: "",
    TableCode: "",
    IsActive: true,
    IsOccupied: false,
});
const contextMenu = ref(null);
const settlingTable = ref(null);
const settleCash = ref(0);
const moveTable = ref(null);
const targetTableId = ref(null);
const activeGroups = computed(() => groups.value.filter((group) => group.IsActive !== false));
const visibleTables = computed(() => tables.value.filter((table) => selectedGroupId.value === null || table.TableGroupId === selectedGroupId.value));
const freeTargetTables = computed(() => tables.value.filter((table) => table.IsActive !== false && !table.IsOccupied && table.TableId !== moveTable.value?.TableId));
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
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در دریافت میزها";
        groups.value = [];
        tables.value = [];
    }
    finally {
        loading.value = false;
    }
}
async function loadRuntimeSettings() {
    try {
        const settings = await fetchRuntimeConfig();
        currencyIsRial.value = settings.Currency === true;
    }
    catch {
        currencyIsRial.value = false;
    }
}
function amount(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}
function formatMoney(value) {
    return Math.round(amount(value)).toLocaleString();
}
function formatDuration(minutes) {
    const total = Math.max(0, Math.floor(amount(minutes)));
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}
function toPosDeviceAmount(value) {
    return Math.round(currencyIsRial.value ? value : value * 10);
}
function responseIsOk(response) {
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
function editGroup(group) {
    groupForm.value = { ...group };
}
function editTable(table) {
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
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در ذخیره گروه میز";
    }
    finally {
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
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در ذخیره میز";
    }
    finally {
        saving.value = false;
    }
}
function openContext(event, table) {
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
function startOrderForTable(table) {
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
async function editInvoice(table) {
    closeContextMenu();
    if (!table.SaleInvoiceId)
        return;
    message.value = "";
    try {
        const items = await loadDesktopInvoiceItems(table.SaleInvoiceId);
        requestInvoiceEdit({
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
        }, items);
        message.value = "فاکتور میز برای ویرایش باز شد";
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در آماده‌سازی فاکتور";
    }
}
function openSettle(table) {
    closeContextMenu();
    settlingTable.value = table;
    settleCash.value = 0;
}
async function submitSettle() {
    if (!settlingTable.value?.SaleInvoiceId)
        return;
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
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در تسویه میز";
    }
    finally {
        saving.value = false;
    }
}
async function printTableInvoice(table, usage) {
    closeContextMenu();
    if (!table.SaleInvoiceId)
        return;
    message.value = "";
    try {
        const result = await printDesktopInvoice(table.SaleInvoiceId, usage);
        message.value = result.message || "فاکتور چاپ شد";
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در چاپ فاکتور";
    }
}
function openMove(table) {
    closeContextMenu();
    moveTable.value = table;
    targetTableId.value = freeTargetTables.value[0]?.TableId || null;
}
async function submitMove() {
    if (!moveTable.value?.SaleInvoiceId || !targetTableId.value)
        return;
    saving.value = true;
    message.value = "";
    try {
        const result = await moveDesktopTableInvoice(moveTable.value.SaleInvoiceId, targetTableId.value);
        message.value = result.message || "میز جابجا شد";
        if (responseIsOk(result)) {
            moveTable.value = null;
            await loadTables();
        }
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در جابجایی میز";
    }
    finally {
        saving.value = false;
    }
}
async function cancelInvoice(table) {
    closeContextMenu();
    if (!table.SaleInvoiceId)
        return;
    if (!window.confirm(`فاکتور میز ${table.TableTitle} ابطال شود؟`))
        return;
    saving.value = true;
    message.value = "";
    try {
        const result = await deleteDesktopInvoice(table.SaleInvoiceId);
        message.value = result.message || "فاکتور ابطال شد";
        if (responseIsOk(result))
            await loadTables();
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در ابطال فاکتور";
    }
    finally {
        saving.value = false;
    }
}
function nextGroupCode() {
    const maxCode = Math.max(0, ...groups.value.map(g => Number(g.GroupCode)).filter(Number.isFinite));
    return String(maxCode + 1);
}
function nextTableCode(groupId) {
    const group = groups.value.find(g => g.TableGroupId === groupId);
    const groupCode = Number(group?.GroupCode || 0);
    const start = groupCode * 100;
    const maxCode = Math.max(start - 1, ...tables.value
        .filter(t => t.TableGroupId === groupId)
        .map(t => Number(t.TableCode))
        .filter(Number.isFinite));
    return String(maxCode + 1);
}
watch(() => tableForm.value.TableGroupId, (groupId) => {
    if (tableForm.value.TableId === 0 && groupId) {
        tableForm.value.TableCode = nextTableCode(groupId);
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['admin-box']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-box']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['t-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['t-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['t-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['group-strip']} */ ;
/** @type {__VLS_StyleScopedClasses['group-strip']} */ ;
/** @type {__VLS_StyleScopedClasses['group-strip']} */ ;
/** @type {__VLS_StyleScopedClasses['table-card']} */ ;
/** @type {__VLS_StyleScopedClasses['table-card']} */ ;
/** @type {__VLS_StyleScopedClasses['table-card']} */ ;
/** @type {__VLS_StyleScopedClasses['table-card']} */ ;
/** @type {__VLS_StyleScopedClasses['table-card']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-box']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-title']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-box']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-box']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-box']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-list']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-list']} */ ;
/** @type {__VLS_StyleScopedClasses['context-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['context-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['context-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['context-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-head']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['icon']} */ ;
/** @type {__VLS_StyleScopedClasses['tables-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['table-admin']} */ ;
/** @type {__VLS_StyleScopedClasses['table-admin']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tables-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "tables-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tables-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tables-sub" },
});
(__VLS_ctx.tables.length.toLocaleString());
(__VLS_ctx.activeGroups.length.toLocaleString());
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadTables) },
    ...{ class: "t-btn" },
    disabled: (__VLS_ctx.loading),
});
(__VLS_ctx.loading ? "در حال دریافت" : "بازخوانی");
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "group-strip" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.selectedGroupId = null;
        } },
    ...{ class: ({ active: __VLS_ctx.selectedGroupId === null }) },
});
for (const [group] of __VLS_getVForSourceType((__VLS_ctx.activeGroups))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectedGroupId = group.TableGroupId;
            } },
        key: (group.TableGroupId),
        ...{ class: ({ active: __VLS_ctx.selectedGroupId === group.TableGroupId }) },
    });
    (group.GroupTitle);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "tables-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "tables-board" },
});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-empty" },
    });
}
else if (!__VLS_ctx.visibleTables.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-empty" },
    });
}
else {
    for (const [table] of __VLS_getVForSourceType((__VLS_ctx.visibleTables))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!!(!__VLS_ctx.visibleTables.length))
                        return;
                    table.IsActive !== false && __VLS_ctx.startOrderForTable(table);
                } },
            ...{ onContextmenu: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!!(!__VLS_ctx.visibleTables.length))
                        return;
                    __VLS_ctx.openContext($event, table);
                } },
            key: (table.TableId),
            ...{ class: "table-card" },
            ...{ class: ({
                    occupied: table.IsOccupied,
                    inactive: table.IsActive === false
                }) },
        });
        if (table.IsActive === false) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "inactive-badge" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "table-amount" },
        });
        (table.IsActive === false
            ? "غیرفعال"
            : table.IsOccupied
                ? `${__VLS_ctx.formatMoney(table.Payable)} تومان`
                : "آزاد");
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "table-time" },
        });
        (table.IsOccupied
            ? __VLS_ctx.formatDuration(table.OccupiedMinutes)
            : table.TableCode);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (table.TableTitle);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (table.GroupTitle);
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "table-admin" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "admin-box" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "admin-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.resetGroupForm) },
    ...{ class: "mini" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "عنوان گروه",
});
(__VLS_ctx.groupForm.GroupTitle);
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "کد گروه",
});
(__VLS_ctx.groupForm.GroupCode);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "checkbox",
});
(__VLS_ctx.groupForm.IsActive);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.saveGroup) },
    ...{ class: "t-btn primary" },
    disabled: (__VLS_ctx.saving),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "quick-list" },
});
for (const [group] of __VLS_getVForSourceType((__VLS_ctx.groups))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.editGroup(group);
            } },
        key: (group.TableGroupId),
    });
    (group.GroupTitle);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "admin-box" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "admin-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.resetTableForm) },
    ...{ class: "mini" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.tableForm.TableGroupId),
});
for (const [group] of __VLS_getVForSourceType((__VLS_ctx.groups))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (group.TableGroupId),
        value: (group.TableGroupId),
    });
    (group.GroupTitle);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "عنوان میز",
});
(__VLS_ctx.tableForm.TableTitle);
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "کد میز",
});
(__VLS_ctx.tableForm.TableCode);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "checkbox",
});
(__VLS_ctx.tableForm.IsActive);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.saveTable) },
    ...{ class: "t-btn primary" },
    disabled: (__VLS_ctx.saving || !__VLS_ctx.groups.length),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "quick-list" },
});
for (const [table] of __VLS_getVForSourceType((__VLS_ctx.visibleTables))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.editTable(table);
            } },
        key: (`edit-${table.TableId}`),
    });
    (table.TableTitle);
}
if (__VLS_ctx.message) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-message" },
    });
    (__VLS_ctx.message);
}
if (__VLS_ctx.contextMenu) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "context-menu" },
        ...{ style: ({ top: `${__VLS_ctx.contextMenu.y}px`, left: `${__VLS_ctx.contextMenu.x}px` }) },
    });
    if (__VLS_ctx.contextMenu.table.IsOccupied) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.contextMenu))
                        return;
                    if (!(__VLS_ctx.contextMenu.table.IsOccupied))
                        return;
                    __VLS_ctx.editInvoice(__VLS_ctx.contextMenu.table);
                } },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.contextMenu))
                        return;
                    if (!(__VLS_ctx.contextMenu.table.IsOccupied))
                        return;
                    __VLS_ctx.openSettle(__VLS_ctx.contextMenu.table);
                } },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.contextMenu))
                        return;
                    if (!(__VLS_ctx.contextMenu.table.IsOccupied))
                        return;
                    __VLS_ctx.printTableInvoice(__VLS_ctx.contextMenu.table, 'kitchen');
                } },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.contextMenu))
                        return;
                    if (!(__VLS_ctx.contextMenu.table.IsOccupied))
                        return;
                    __VLS_ctx.printTableInvoice(__VLS_ctx.contextMenu.table, 'customer');
                } },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.contextMenu))
                        return;
                    if (!(__VLS_ctx.contextMenu.table.IsOccupied))
                        return;
                    __VLS_ctx.openMove(__VLS_ctx.contextMenu.table);
                } },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.contextMenu))
                        return;
                    if (!(__VLS_ctx.contextMenu.table.IsOccupied))
                        return;
                    __VLS_ctx.cancelInvoice(__VLS_ctx.contextMenu.table);
                } },
            ...{ class: "danger" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.contextMenu))
                        return;
                    if (!!(__VLS_ctx.contextMenu.table.IsOccupied))
                        return;
                    __VLS_ctx.editTable(__VLS_ctx.contextMenu.table);
                    __VLS_ctx.closeContextMenu();
                } },
        });
    }
}
if (__VLS_ctx.settlingTable) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-overlay" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-modal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-title" },
    });
    (__VLS_ctx.settlingTable.TableTitle);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-sub" },
    });
    (__VLS_ctx.formatMoney(__VLS_ctx.settlePayable));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.settlingTable))
                    return;
                __VLS_ctx.settlingTable = null;
            } },
        ...{ class: "icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
        max: (__VLS_ctx.settlePayable),
    });
    (__VLS_ctx.settleCash);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "settle-pos" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    (__VLS_ctx.formatMoney(__VLS_ctx.settlePos));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.settlingTable))
                    return;
                __VLS_ctx.settlingTable = null;
            } },
        ...{ class: "t-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.submitSettle) },
        ...{ class: "t-btn primary" },
        disabled: (__VLS_ctx.saving),
    });
}
if (__VLS_ctx.moveTable) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-overlay" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-modal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-title" },
    });
    (__VLS_ctx.moveTable.TableTitle);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-sub" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.moveTable))
                    return;
                __VLS_ctx.moveTable = null;
            } },
        ...{ class: "icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.targetTableId),
    });
    for (const [table] of __VLS_getVForSourceType((__VLS_ctx.freeTargetTables))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (table.TableId),
            value: (table.TableId),
        });
        (table.TableTitle);
        (table.GroupTitle);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.moveTable))
                    return;
                __VLS_ctx.moveTable = null;
            } },
        ...{ class: "t-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.submitMove) },
        ...{ class: "t-btn primary" },
        disabled: (__VLS_ctx.saving || !__VLS_ctx.targetTableId),
    });
}
/** @type {__VLS_StyleScopedClasses['tables-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['tables-head']} */ ;
/** @type {__VLS_StyleScopedClasses['tables-title']} */ ;
/** @type {__VLS_StyleScopedClasses['tables-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['t-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['group-strip']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['tables-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['tables-board']} */ ;
/** @type {__VLS_StyleScopedClasses['table-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['table-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['table-card']} */ ;
/** @type {__VLS_StyleScopedClasses['occupied']} */ ;
/** @type {__VLS_StyleScopedClasses['inactive']} */ ;
/** @type {__VLS_StyleScopedClasses['inactive-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['table-amount']} */ ;
/** @type {__VLS_StyleScopedClasses['table-time']} */ ;
/** @type {__VLS_StyleScopedClasses['table-admin']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-box']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-title']} */ ;
/** @type {__VLS_StyleScopedClasses['mini']} */ ;
/** @type {__VLS_StyleScopedClasses['t-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-list']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-box']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-title']} */ ;
/** @type {__VLS_StyleScopedClasses['mini']} */ ;
/** @type {__VLS_StyleScopedClasses['t-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-list']} */ ;
/** @type {__VLS_StyleScopedClasses['table-message']} */ ;
/** @type {__VLS_StyleScopedClasses['context-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['table-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-head']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-title']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['icon']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-body']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['settle-pos']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['t-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['t-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['table-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-head']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-title']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['icon']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-body']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['t-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['t-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            groups: groups,
            tables: tables,
            selectedGroupId: selectedGroupId,
            loading: loading,
            saving: saving,
            message: message,
            groupForm: groupForm,
            tableForm: tableForm,
            contextMenu: contextMenu,
            settlingTable: settlingTable,
            settleCash: settleCash,
            moveTable: moveTable,
            targetTableId: targetTableId,
            activeGroups: activeGroups,
            visibleTables: visibleTables,
            freeTargetTables: freeTargetTables,
            settlePayable: settlePayable,
            settlePos: settlePos,
            loadTables: loadTables,
            formatMoney: formatMoney,
            formatDuration: formatDuration,
            resetGroupForm: resetGroupForm,
            resetTableForm: resetTableForm,
            editGroup: editGroup,
            editTable: editTable,
            saveGroup: saveGroup,
            saveTable: saveTable,
            openContext: openContext,
            closeContextMenu: closeContextMenu,
            startOrderForTable: startOrderForTable,
            editInvoice: editInvoice,
            openSettle: openSettle,
            submitSettle: submitSettle,
            printTableInvoice: printTableInvoice,
            openMove: openMove,
            submitMove: submitMove,
            cancelInvoice: cancelInvoice,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
