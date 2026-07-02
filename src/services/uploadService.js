import axios from "axios";
import { useToast } from "vue-toastification";

const toast = useToast();

// ایجاد یک instance از axios با تنظیمات پایه
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || window.location.origin,
  timeout: 10000,
});

// تابع برای آپلود تصاویر
export async function uploadImage({ file, itemId, itemType }) {
  try {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("itemId", itemId);
    formData.append("itemType", itemType);

    const endpoint =
      itemType === "category" ? "/api/upload/group" : "/api/upload/product";

    const response = await api.post(endpoint, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (response.data.success) {
      return response.data.imageUrl; // فرض کنید سرور آدرس تصویر آپلود شده را برمی‌گرداند
    }
    throw new Error(response.data.message || "خطا در آپلود تصویر");
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
}

// تابع برای حذف تصاویر
export async function deleteImage(itemId, itemType) {
  try {
    const endpoint =
      itemType === "category"
        ? `/api/delete/group/${itemId}`
        : `/api/delete/product/${itemId}`;

    const response = await api.delete(endpoint);

    if (response.data.success) {
      return true;
    }
    throw new Error(response.data.message || "خطا در حذف تصویر");
  } catch (error) {
    console.error("Delete error:", error);
    throw error;
  }
}
