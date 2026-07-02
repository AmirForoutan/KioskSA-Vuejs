import { GetApiAddress, sendToAmountPOS } from "../utilities";

// Made By Amirreza Foroutan For HamiPOS +989120496824

// Get Items For View Scale Order
export async function fetchScaleCategories(conId) {
  const serviceAdd = await sendToAmountPOS();
  const response = await fetch(serviceAdd + "/getscalegoodsgroup", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
    body: JSON.stringify({ ConnectionsId: conId }),
  });
  return await response.json();
}

export async function fetchScaleGoods(conId) {
  const serviceAdd = await sendToAmountPOS();
  const response = await fetch(serviceAdd + "/getscalegoods", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
    body: JSON.stringify({ ConnectionsId: conId }),
  });
  return await response.json();
}
////////////////////////////////
// get Items For View Kisok Order
export async function fetchCategories(conId) {
  const serviceAdd = await sendToAmountPOS();
  const response = await fetch(serviceAdd + "/getgoodsgroup", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
    body: JSON.stringify({ ConnectionsId: conId }),
  });
  return await response.json();
}

export async function fetchGoods(conId) {
  const serviceAdd = await sendToAmountPOS();
  const response = await fetch(serviceAdd + "/getgoods", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
    body: JSON.stringify({ ConnectionsId: conId }),
  });
  return await response.json();
}

export async function fetchToppings(conId) {
  const serviceAdd = await sendToAmountPOS();
  const response = await fetch(serviceAdd + "/ToppingGoodsDetails", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
    body: JSON.stringify({ ConnectionsId: conId }),
  });
  return await response.json();
}

export async function fetchToppingLevels(conId) {
  const serviceAdd = await sendToAmountPOS();
  const response = await fetch(serviceAdd + "/GetToppingLevel", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
    body: JSON.stringify({ ConnectionsId: conId }),
  });
  return await response.json();
}

export async function fetchToppingProducts(conId) {
  const serviceAdd = await sendToAmountPOS();
  const response = await fetch(serviceAdd + "/GetToppingGoods", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
    body: JSON.stringify({ ConnectionsId: conId }),
  });
  return await response.json();
}

export async function fetchTables(conId) {
  const serviceAdd = await sendToAmountPOS();
  const response = await fetch(serviceAdd + "/tables", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
    body: JSON.stringify({ ConnectionsId: conId }),
  });
  return await response.json();
}
// get Goods Discounts List
export async function fetchGoodsDiscounts(conId) {
  const serviceAdd = await sendToAmountPOS();
  const response = await fetch(serviceAdd + "/discounts", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
    body: JSON.stringify({ ConnectionsId: conId }),
  });
  return await response.json();
}
// get Discount Cart Goods
export async function fetchDiscountsCarts(discountsCart, conId) {
  const serviceAdd = await sendToAmountPOS();
  const response = await fetch(serviceAdd + "/discountscart", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
    body: JSON.stringify({
      ConnectionsId: conId,
      DiscountCart: discountsCart,
    }),
  });
  return await response.json();
}
//////////////////////////////////////////////////////////////////////////////
// متد ارسال فاکتور به سرویس
export async function sendInvoice(invoiceData) {
  const serviceAdd = await sendToAmountPOS();
  const response = await fetch(serviceAdd + "/printers", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
    body: JSON.stringify(invoiceData),
  });
  return await response.json();
}

// متد ارسال فاکتور به سرویس برای فاکتور های معمولی
export async function sendInvoicescale(invoiceData) {
  const serviceAdd = await sendToAmountPOS();
  const response = await fetch(serviceAdd + "/printersscale", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
    body: JSON.stringify(invoiceData),
  });
  return await response.json();
}

//  متد ارسال مبلغ به پوز درخواست
export async function sendToPOS(amount) {
  const serviceAdd = await sendToAmountPOS();
  const response = await fetch(serviceAdd + "/pay", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
    body: JSON.stringify({ Amount: amount }),
  });
  return await response.json();
}

// متد ارسال مبلغ به پوز برای دستگاه های اندروید
export async function sendToPOSAndroid(invoiceDataAndroid) {
  const response = await fetch("myapp://pay", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
    body: JSON.stringify({ Amount: invoiceDataAndroid }),
  });
  return await response.json();
}

// متد درخواست اطلاعات مشتری از باشگاه مشتریان حامی
export async function getCustomerData(userPhone, branchId) {
  const serviceAdd = await sendToAmountPOS();
  const response = await fetch(serviceAdd + "/hamiclub", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
    body: JSON.stringify({ PhoneNumber: userPhone, Branchid: branchId }),
  });
  return await response.json();
}

//ارسال بارکد به سرویس جهت دریافت اطلاعات فاکتور
export async function getScaleInvoice(barCode) {
  const serviceAdd = await sendToAmountPOS();
  const response = await fetch(serviceAdd + "/getscaleinvoice", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
    body: JSON.stringify({ Barcode: barCode }),
  });
  return await response.json();
}

// بررسی مجوز داشتن استفاده از برنامه کیوسک
export async function getKioskLicense() {
  const serviceAdd = await sendToAmountPOS();
  const response = await fetch(serviceAdd + "/license", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
    body: JSON.stringify({ Barcode: "00" }),
  });
  return await response.json();
}
////////////////////////// Image Apis //////////////////////
// آپلود فایل در سرور
export async function setImage(formData) {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(serviceAdd + "/upload", {
    method: "POST",
    body: formData,
  });
  return await response.json();
}

// حذف فایل در سرور
export async function deleteImage(formData) {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(serviceAdd + "/delete", {
    method: "POST",
    body: formData,
  });
  return await response.json();
}
//////////////////////////
// دریافت دسته بندی ها برای نمایش در قسمت ادمین
export async function fetchCategoriesApi(conId) {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(serviceAdd + "/getgoodsgroup", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
    body: JSON.stringify({ ConnectionsId: conId }),
  });
  return await response.json();
}
// دریافت کالاها برای قسمت ادمین
export async function fetchGoodsApi(conId) {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(serviceAdd + "/getgoods", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
    body: JSON.stringify({ ConnectionsId: conId }),
  });
  return await response.json();
}
// دریافت آیتم های تاپینگ
export async function fetchToppingItemsApi() {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(serviceAdd + "/gettoppinggoods", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
  });
  return await response.json();
}
// دریافت لول های تاپینگ ها
export async function fetchToppingLevelsApi() {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(serviceAdd + "/gettoppinglevel", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
  });
  return await response.json();
}

// دریافت اقلام تاپینگ ها
export async function fetchProductToppingsApi() {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(serviceAdd + "/toppinggoodsdetails", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
  });
  return await response.json();
}

// ذخیره اطلاعات دسته بندی ها
export async function saveCategoryApi(data) {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(serviceAdd + "/setcategories", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
    body: JSON.stringify(data),
  });
  return await response.json();
}

// ذخیره اطلاعات کالا ها
export async function saveProductApi(data) {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(serviceAdd + "/setproducts", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
    body: JSON.stringify(data),
  });
  return await response.json();
}

// ذخیره اطلاعات تاپینگ ها
export async function saveToppingItemApi(data) {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(serviceAdd + "/settoppingitem", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
    body: JSON.stringify(data),
  });
  return await response.json();
}

// ذخیره اطلاعات لول تاپینگ ها
export async function saveToppingLevelApi(data) {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(serviceAdd + "/settoppinglevel", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
    body: JSON.stringify(data),
  });
  return await response.json();
}

// ذخیره اطلاعات اقلام تاپینگ ها
export async function saveProductToppingApi(data) {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(serviceAdd + "/settoppingproducts", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // درخواست ساده
    },
    body: JSON.stringify(data),
  });
  return await response.json();
}

/////////////////////////
// دریافت تعداد Connection Strings
export async function GetCountBranches() {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(serviceAdd + "/branches", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ Barcode: "00" }),
  });
  return await response.json();
}
///////////////////
// حذف دسته بندی
export async function Delete(id, type) {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(serviceAdd + "/deleteitem", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ Id: id, Type: type }),
  });
  return await response.json();
}
///////
// دریافت اطلاعات فاکتور ها
export async function fetchInvoicesApi(data) {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(serviceAdd + "/getinvoices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return await response.json();
}

export async function fetchInvoiceItemsApi(data) {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(serviceAdd + "/getinvoiceitems", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ SaleInvoiceId: data }),
  });
  return await response.json();
}

export async function deleteInvoiceApi(invoiceId) {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(serviceAdd + "/deleteinvoice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      SaleInvoiceId: invoiceId,
      InvoiceId: invoiceId,
      Id: invoiceId,
    }),
  });
  return await response.json();
}

//////////////////////////////////////

export async function fetchCustomersApi() {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(`${serviceAdd}/getcustomers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  return await response.json();
}

export async function searchCustomers(searchTerm) {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(`${serviceAdd}/searchcustomer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ searchTerm }),
  });
  return await response.json();
}

export async function saveCustomerApi(customerData) {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(`${serviceAdd}/savecustomer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(customerData),
  });
  return await response.json();
}

export async function deleteCustomerApi(customerId) {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(`${serviceAdd}/deletecustomer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ CustomerId: customerId, UserId: customerId }),
  });
  return await response.json();
}

export async function manageCredit(creditData) {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(`${serviceAdd}/managecredit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(creditData),
  });
  return await response.json();
}

export async function processDebtPayment(paymentData) {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(`${serviceAdd}/paycustomerdebt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(paymentData),
  });
  return await response.json();
}

export async function useCustomerCredit(data) {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(`${serviceAdd}/paycustomerdebt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return await response.json();
}

export async function updateCustomerStatusApi(customerId, stat) {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(`${serviceAdd}/setcustomerstat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ UserId: customerId, NewStat: stat }),
  });
  return await response.json();
}

export async function fetchCustomerCredit(customerPhone) {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(`${serviceAdd}/getcustomercredit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ PhoneNumber: customerPhone }),
  });
  return await response.json();
}

// transaction APIs

export async function updateTransactionApi(data) {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(`${serviceAdd}/updatetransaction`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return await response.json();
}

export async function deleteTransactionApi(data) {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(`${serviceAdd}/deletetransaction`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ TranId: data }),
  });
  return await response.json();
}

export async function checkStockLicense() {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(`${serviceAdd}/havestock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return await response.json();
}

export async function checkStockGoods(data) {
  const serviceAdd = await GetApiAddress();
  const response = await fetch(`${serviceAdd}/checkstock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ Items: data }),
  });
  return await response.json();
}
