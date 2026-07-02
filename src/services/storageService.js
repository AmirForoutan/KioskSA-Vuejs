// src/services/storageService.js
import localforage from "localforage";

localforage.config({
  name: "kioskApp",
  storeName: "myKioskApp",
  driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE],
});

export async function saveData(key, data) {
  try {
    if (!key) throw new Error("کلید نباید خالی باشد");
    const finalData = JSON.parse(JSON.stringify(data));
    await localforage.setItem(key, finalData);
    console.log(`داده با کلید ${key} ذخیره شد`);
  } catch (error) {
    console.error("خطا در ذخیره داده:", error);
    throw error;
  }
}

export async function getData(key) {
  try {
    if (!key) throw new Error("کلید نباید خالی باشد");
    console.log(`داده با کلید ${key} پیدا  شد`);
    return await localforage.getItem(key);
  } catch (error) {
    console.error("خطا در پیدا کردن داده:", error);
    throw error;
  }
}

export async function removeData(key) {
  await localforage.removeItem(key);
}

export async function clearAllData() {
  await localforage.clear();
}
