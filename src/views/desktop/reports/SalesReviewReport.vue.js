import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import "@majidh1/jalalidatepicker";
import "@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css";
import { can } from "../../../components/acl/can";
import { requestInvoiceEdit } from "../../../components/stores/invoice-edit.store";
import { deleteDesktopInvoice, loadDesktopInvoices, loadDesktopInvoiceItems, printDesktopInvoice, } from "../../../services/desktopApi";
import { exportToExcel } from "../../utils/exportExcel";
import { setupJalaliDateInputs } from "../../../utilities";
import { useDesktopToastMessage } from "../useDesktopToastMessage";
import { escapeHtml, formatMoney, money, moneyPair, printReceipt, reportRange } from "./receiptPrint";
const from = ref("");
const to = ref("");
const q = ref("");
const loading = ref(false);
const printLoading = ref(false);
const message = ref("");
const rows = ref([]);
useDesktopToastMessage(message);
const editingInvoiceId = ref(null);
const deletingInvoiceId = ref(null);
const contextMenu = ref(null);
const canEditInvoices = computed(() => can("reports.invoices.edit"));
const canDeleteInvoices = computed(() => can("reports.invoices.delete"));
const canManageInvoices = computed(() => canEditInvoices.value || canDeleteInvoices.value);
const filtered = computed(() => {
    const s = q.value.trim();
    if (!s)
        return rows.value;
    return rows.value.filter((row) => {
        const haystack = `${row.SaleInvoiceNumberDay} ${row.CustomerName ?? ""} ${row.Phone ?? ""} ${row.InvoiceTypeName ?? ""} ${row.TableTitle ?? ""} ${row.TableCode ?? ""}`;
        return haystack.includes(s);
    });
});
const totalRaw = computed(() => filtered.value.reduce((sum, row) => sum + money(row.Price), 0));
const totalPayable = computed(() => filtered.value.reduce((sum, row) => sum + money(row.Payable), 0));
const totalDiscount = computed(() => filtered.value.reduce((sum, row) => sum + invoiceDiscount(row), 0));
const totalTax = computed(() => filtered.value.reduce((sum, row) => sum + money(row.Tax), 0));
const totalPacking = computed(() => filtered.value.reduce((sum, row) => sum + money(row.PackingPrice), 0));
const totalPos = computed(() => filtered.value.reduce((sum, row) => sum + paymentPart(row, "pos"), 0));
const totalCash = computed(() => filtered.value.reduce((sum, row) => sum + paymentPart(row, "cash"), 0));
const totalCredit = computed(() => filtered.value.reduce((sum, row) => sum + paymentPart(row, "credit"), 0));
const totalRefund = computed(() => filtered.value.reduce((sum, row) => sum + refundAmount(row), 0));
const totalNetPaid = computed(() => filtered.value.reduce((sum, row) => sum + netPaidAmount(row), 0));
onMounted(() => {
    setupJalaliDateInputs();
    loadReport();
    window.addEventListener("click", closeContextMenu);
});
onBeforeUnmount(() => {
    window.removeEventListener("click", closeContextMenu);
});
async function loadReport() {
    loading.value = true;
    message.value = "";
    try {
        rows.value = await loadDesktopInvoices({ FromDate: from.value.trim(), ToDate: to.value.trim() });
        if (!rows.value.length)
            message.value = "فاکتوری برای این بازه پیدا نشد";
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در دریافت گزارش فروش";
        rows.value = [];
    }
    finally {
        loading.value = false;
    }
}
function optionalAmount(row, ...keys) {
    for (const key of keys) {
        const value = row[key];
        if (value !== undefined && value !== null && value !== "")
            return money(value);
    }
    return null;
}
function invoiceDiscount(row) {
    return optionalAmount(row, "Discount", "InvoiceDiscount", "TotalDiscount", "discount", "invoiceDiscount", "totalDiscount") ?? 0;
}
function paymentPart(row, key) {
    const pos = money(row.PosPrice);
    const cash = money(row.CashPrice);
    const credit = money(row.CreditPrice);
    const hasReceiptData = Boolean(row.HasFinancialReceipts ?? row.hasFinancialReceipts) || optionalAmount(row, "ReceivedAmount", "receivedAmount") !== null || refundAmount(row) > 0;
    if (pos + cash + credit === 0 && money(row.Payable) > 0 && !hasReceiptData)
        return key === "pos" ? money(row.Payable) : 0;
    if (key === "cash")
        return cash;
    if (key === "credit")
        return credit;
    return pos;
}
function refundAmount(row) {
    return optionalAmount(row, "RefundAmount", "refundAmount") ?? 0;
}
function receivedAmount(row) {
    const explicit = optionalAmount(row, "ReceivedAmount", "receivedAmount");
    if (explicit !== null)
        return explicit;
    return paymentPart(row, "cash") + paymentPart(row, "pos") + paymentPart(row, "credit");
}
function netPaidAmount(row) {
    const explicit = optionalAmount(row, "NetPaidAmount", "netPaidAmount");
    if (explicit !== null)
        return explicit;
    return Math.max(0, receivedAmount(row) - refundAmount(row));
}
function responseIsOk(response) {
    return response.status === true || response.status === "ok" || response.status === undefined;
}
async function startEdit(row) {
    if (!canEditInvoices.value)
        return;
    editingInvoiceId.value = row.SaleInvoiceId;
    message.value = "";
    try {
        const items = await loadDesktopInvoiceItems(row.SaleInvoiceId);
        requestInvoiceEdit(row, items);
        message.value = "فاکتور برای ویرایش در سفارشگیری باز شد";
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در آماده‌سازی فاکتور برای ویرایش";
    }
    finally {
        editingInvoiceId.value = null;
    }
}
async function deleteInvoice(row) {
    if (!canDeleteInvoices.value)
        return;
    const confirmed = window.confirm(`فاکتور شماره ${row.SaleInvoiceNumberDay} حذف شود؟`);
    if (!confirmed)
        return;
    deletingInvoiceId.value = row.SaleInvoiceId;
    message.value = "";
    try {
        const result = await deleteDesktopInvoice(row.SaleInvoiceId);
        if (!responseIsOk(result)) {
            message.value = result.message || "حذف فاکتور ناموفق بود";
            return;
        }
        rows.value = rows.value.filter((item) => item.SaleInvoiceId !== row.SaleInvoiceId);
        message.value = result.message || "فاکتور حذف شد";
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در حذف فاکتور";
    }
    finally {
        deletingInvoiceId.value = null;
    }
}
function openContextMenu(event, row) {
    event.preventDefault();
    contextMenu.value = { x: event.clientX, y: event.clientY, row };
}
function closeContextMenu() {
    contextMenu.value = null;
}
async function printInvoice(row, usage) {
    closeContextMenu();
    message.value = "";
    try {
        const result = await printDesktopInvoice(row.SaleInvoiceId, usage);
        message.value = result.message || "فاکتور چاپ شد";
    }
    catch (error) {
        message.value = error instanceof Error ? error.message : "خطا در چاپ فاکتور";
    }
}
function exportExcel() {
    if (!can("reports.export.excel"))
        return;
    exportToExcel(filtered.value.map((row) => ({ ...row, Discount: invoiceDiscount(row), CashPrice: paymentPart(row, "cash"), PosPrice: paymentPart(row, "pos"), CreditPrice: paymentPart(row, "credit"), RefundAmount: refundAmount(row), NetPaidAmount: netPaidAmount(row) })), [
        { key: "SaleInvoiceNumberDay", title: "شماره روزانه" }, { key: "OrderDate", title: "تاریخ" }, { key: "OrderTime", title: "ساعت ثبت" }, { key: "CustomerName", title: "مشتری فاکتور" }, { key: "Phone", title: "موبایل" }, { key: "InvoiceTypeName", title: "نوع سفارش" }, { key: "Price", title: "جمع خام" }, { key: "Discount", title: "تخفیف" }, { key: "Tax", title: "مالیات" }, { key: "PackingPrice", title: "بسته‌بندی" }, { key: "CashPrice", title: "نقدی" }, { key: "PosPrice", title: "کارتخوان" }, { key: "CreditPrice", title: "اعتباری" }, { key: "RefundAmount", title: "عودت" }, { key: "NetPaidAmount", title: "خالص تسویه" }, { key: "Payable", title: "قابل پرداخت" },
    ], "sales-review");
}
function printSalesSummaryReport() {
    const payments = [moneyPair("نقدی", totalCash.value), moneyPair("کارتخوان", totalPos.value), moneyPair("اعتباری", totalCredit.value), moneyPair("عودت", totalRefund.value), moneyPair("خالص تسویه", totalNetPaid.value)].join("");
    printReceipt("سرجمع فروش و تسویه", reportRange(from.value, to.value), `<div class="section"><div class="section-title">سرجمع فروش</div>
      ${moneyPair("تعداد فاکتور", filtered.value.length)}${moneyPair("جمع خام", totalRaw.value)}${moneyPair("جمع تخفیف", totalDiscount.value)}${moneyPair("مالیات", totalTax.value)}${moneyPair("بسته‌بندی", totalPacking.value)}${moneyPair("قابل پرداخت", totalPayable.value)}
    </div><div class="section"><div class="section-title">نحوه تسویه</div>${payments}</div>`);
}
function normalizeItemForPrint(item) {
    const quantity = money(item.Quantity ?? item.Count ?? item.GoodsCount ?? 1);
    const unitPrice = money(item.Price ?? item.GoodsPrice ?? item.ProductPrice);
    const goodsName = String(item.GoodsName || item.ProductTitle || item.ProductName || item.GoodsCode || item.ProductCode || item.GoodsId || "کالای نامشخص");
    const total = money(item.TotalPrice ?? item.Payable ?? item.SumPrice ?? item.SumItem ?? item.GoodsSumItem) || unitPrice * quantity;
    return { goodsKey: String(item.GoodsId || item.ProductId || item.GoodsCode || item.ProductCode || goodsName), goodsName, quantity, total };
}
async function printSalesItemsReport() {
    if (!filtered.value.length || printLoading.value)
        return;
    printLoading.value = true;
    message.value = "";
    try {
        const nested = await Promise.all(filtered.value.map(async (invoice) => {
            try {
                const items = await loadDesktopInvoiceItems(invoice.SaleInvoiceId);
                return items.map(normalizeItemForPrint);
            }
            catch {
                return [];
            }
        }));
        const map = new Map();
        nested.flat().forEach((line) => {
            const current = map.get(line.goodsKey) || { goodsKey: line.goodsKey, goodsName: line.goodsName, quantity: 0, total: 0 };
            current.quantity += line.quantity;
            current.total += line.total;
            map.set(line.goodsKey, current);
        });
        const items = Array.from(map.values()).sort((a, b) => b.total - a.total);
        const itemRows = items.map((row) => `<tr><td>${escapeHtml(row.goodsName)}</td><td class="num">${formatMoney(row.quantity)}</td><td class="num">${formatMoney(row.total)}</td></tr>`).join("");
        printReceipt("جمع فروش به همراه اقلام", reportRange(from.value, to.value), `<div class="section"><div class="section-title">سرجمع</div>${moneyPair("جمع فروش", totalPayable.value)}${moneyPair("جمع تخفیف", totalDiscount.value)}${moneyPair("تعداد فاکتور", filtered.value.length)}</div>
      <div class="section"><div class="section-title">گزارش اقلام</div><table><thead><tr><th>کالا</th><th class="num">تعداد</th><th class="num">مبلغ</th></tr></thead><tbody>${itemRows}</tbody></table></div>`);
    }
    finally {
        printLoading.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['r-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['r-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['r-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['r-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['r-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['r-message']} */ ;
/** @type {__VLS_StyleScopedClasses['r-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['r-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['r-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['pay']} */ ;
/** @type {__VLS_StyleScopedClasses['pay']} */ ;
/** @type {__VLS_StyleScopedClasses['pay']} */ ;
/** @type {__VLS_StyleScopedClasses['pay']} */ ;
/** @type {__VLS_StyleScopedClasses['pay']} */ ;
/** @type {__VLS_StyleScopedClasses['pay']} */ ;
/** @type {__VLS_StyleScopedClasses['row-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['r-mini']} */ ;
/** @type {__VLS_StyleScopedClasses['r-mini']} */ ;
/** @type {__VLS_StyleScopedClasses['row-context-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['row-context-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['r-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['r-summary']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "r-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "r-toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "r-input" },
    placeholder: "جستجوی شماره، مشتری، موبایل...",
});
(__VLS_ctx.q);
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "r-input" },
    placeholder: "از تاریخ، مثل 1404/03/01",
    readonly: true,
    'data-jdp': true,
});
(__VLS_ctx.from);
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "r-input" },
    placeholder: "تا تاریخ، مثل 1404/03/31",
    readonly: true,
    'data-jdp': true,
});
(__VLS_ctx.to);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadReport) },
    ...{ class: "r-btn primary" },
    disabled: (__VLS_ctx.loading),
});
(__VLS_ctx.loading ? "در حال دریافت" : "اعمال فیلتر");
if (__VLS_ctx.can('reports.export.excel')) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.exportExcel) },
        ...{ class: "r-btn" },
        disabled: (!__VLS_ctx.filtered.length),
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.printSalesSummaryReport) },
    ...{ class: "r-btn" },
    disabled: (!__VLS_ctx.filtered.length),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.printSalesItemsReport) },
    ...{ class: "r-btn" },
    disabled: (!__VLS_ctx.filtered.length || __VLS_ctx.printLoading),
});
(__VLS_ctx.printLoading ? "آماده‌سازی" : "چاپ فروش اقلام");
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "r-summary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.filtered.length.toLocaleString());
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.totalPayable.toLocaleString());
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.totalDiscount.toLocaleString());
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.totalCash.toLocaleString());
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.totalPos.toLocaleString());
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.totalCredit.toLocaleString());
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.totalRefund.toLocaleString());
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.totalNetPaid.toLocaleString());
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
(__VLS_ctx.totalTax.toLocaleString());
if (__VLS_ctx.message) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "r-message" },
    });
    (__VLS_ctx.message);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "r-table" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "r-tr r-th" },
    ...{ class: ({ 'has-actions': __VLS_ctx.canManageInvoices }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
if (__VLS_ctx.canManageInvoices) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
}
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "r-empty" },
    });
}
for (const [row] of __VLS_getVForSourceType((__VLS_ctx.filtered))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onContextmenu: (...[$event]) => {
                __VLS_ctx.openContextMenu($event, row);
            } },
        ...{ class: "r-tr" },
        ...{ class: ({ 'has-actions': __VLS_ctx.canManageInvoices }) },
        key: (row.SaleInvoiceId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bold" },
    });
    (row.SaleInvoiceNumberDay);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (row.OrderDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (row.OrderTime);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "customer-cell" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "bold" },
    });
    (row.CustomerName || "بدون مشتری");
    if (row.Phone) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (row.Phone);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (row.InvoiceTypeName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (__VLS_ctx.money(row.Price).toLocaleString());
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "pay discount" },
    });
    (__VLS_ctx.invoiceDiscount(row).toLocaleString());
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (__VLS_ctx.money(row.Tax).toLocaleString());
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (__VLS_ctx.money(row.PackingPrice).toLocaleString());
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "pay cash" },
    });
    (__VLS_ctx.paymentPart(row, "cash").toLocaleString());
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "pay pos" },
    });
    (__VLS_ctx.paymentPart(row, "pos").toLocaleString());
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "pay credit" },
    });
    (__VLS_ctx.paymentPart(row, "credit").toLocaleString());
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "pay refund" },
    });
    (__VLS_ctx.refundAmount(row).toLocaleString());
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "pay net" },
    });
    (__VLS_ctx.netPaidAmount(row).toLocaleString());
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (row.LastModifyDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bold" },
    });
    (__VLS_ctx.money(row.Payable).toLocaleString());
    if (__VLS_ctx.canManageInvoices) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row-actions" },
        });
        if (__VLS_ctx.canEditInvoices) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.canManageInvoices))
                            return;
                        if (!(__VLS_ctx.canEditInvoices))
                            return;
                        __VLS_ctx.startEdit(row);
                    } },
                ...{ class: "r-mini" },
                disabled: (__VLS_ctx.editingInvoiceId === row.SaleInvoiceId),
            });
            (__VLS_ctx.editingInvoiceId === row.SaleInvoiceId ? "..." : "ویرایش");
        }
        if (__VLS_ctx.canDeleteInvoices) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.canManageInvoices))
                            return;
                        if (!(__VLS_ctx.canDeleteInvoices))
                            return;
                        __VLS_ctx.deleteInvoice(row);
                    } },
                ...{ class: "r-mini danger" },
                disabled: (__VLS_ctx.deletingInvoiceId === row.SaleInvoiceId),
            });
            (__VLS_ctx.deletingInvoiceId === row.SaleInvoiceId ? "..." : "حذف");
        }
    }
}
if (__VLS_ctx.contextMenu) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row-context-menu" },
        ...{ style: ({ top: `${__VLS_ctx.contextMenu.y}px`, left: `${__VLS_ctx.contextMenu.x}px` }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.contextMenu))
                    return;
                __VLS_ctx.printInvoice(__VLS_ctx.contextMenu.row, 'kitchen');
            } },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.contextMenu))
                    return;
                __VLS_ctx.printInvoice(__VLS_ctx.contextMenu.row, 'customer');
            } },
    });
}
/** @type {__VLS_StyleScopedClasses['r-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['r-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['r-input']} */ ;
/** @type {__VLS_StyleScopedClasses['r-input']} */ ;
/** @type {__VLS_StyleScopedClasses['r-input']} */ ;
/** @type {__VLS_StyleScopedClasses['r-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['r-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['r-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['r-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['r-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['r-message']} */ ;
/** @type {__VLS_StyleScopedClasses['r-table']} */ ;
/** @type {__VLS_StyleScopedClasses['r-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['r-th']} */ ;
/** @type {__VLS_StyleScopedClasses['has-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['r-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['r-tr']} */ ;
/** @type {__VLS_StyleScopedClasses['has-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
/** @type {__VLS_StyleScopedClasses['pay']} */ ;
/** @type {__VLS_StyleScopedClasses['discount']} */ ;
/** @type {__VLS_StyleScopedClasses['pay']} */ ;
/** @type {__VLS_StyleScopedClasses['cash']} */ ;
/** @type {__VLS_StyleScopedClasses['pay']} */ ;
/** @type {__VLS_StyleScopedClasses['pos']} */ ;
/** @type {__VLS_StyleScopedClasses['pay']} */ ;
/** @type {__VLS_StyleScopedClasses['credit']} */ ;
/** @type {__VLS_StyleScopedClasses['pay']} */ ;
/** @type {__VLS_StyleScopedClasses['refund']} */ ;
/** @type {__VLS_StyleScopedClasses['pay']} */ ;
/** @type {__VLS_StyleScopedClasses['net']} */ ;
/** @type {__VLS_StyleScopedClasses['bold']} */ ;
/** @type {__VLS_StyleScopedClasses['row-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['r-mini']} */ ;
/** @type {__VLS_StyleScopedClasses['r-mini']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['row-context-menu']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            can: can,
            money: money,
            from: from,
            to: to,
            q: q,
            loading: loading,
            printLoading: printLoading,
            message: message,
            editingInvoiceId: editingInvoiceId,
            deletingInvoiceId: deletingInvoiceId,
            contextMenu: contextMenu,
            canEditInvoices: canEditInvoices,
            canDeleteInvoices: canDeleteInvoices,
            canManageInvoices: canManageInvoices,
            filtered: filtered,
            totalPayable: totalPayable,
            totalDiscount: totalDiscount,
            totalTax: totalTax,
            totalPos: totalPos,
            totalCash: totalCash,
            totalCredit: totalCredit,
            totalRefund: totalRefund,
            totalNetPaid: totalNetPaid,
            loadReport: loadReport,
            invoiceDiscount: invoiceDiscount,
            paymentPart: paymentPart,
            refundAmount: refundAmount,
            netPaidAmount: netPaidAmount,
            startEdit: startEdit,
            deleteInvoice: deleteInvoice,
            openContextMenu: openContextMenu,
            printInvoice: printInvoice,
            exportExcel: exportExcel,
            printSalesSummaryReport: printSalesSummaryReport,
            printSalesItemsReport: printSalesItemsReport,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
