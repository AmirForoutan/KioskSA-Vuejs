import { watch } from "vue";
import { useToast } from "vue-toastification";
const errorPatterns = [
    "خطا",
    "ناموفق",
    "تایید نشد",
    "دریافت نشد",
    "پیدا نشد",
    "کامل نبود",
    "معتبر نیست",
    "رعایت نشده",
    "غیرفعال",
    "اصلاح کنید",
    "لازم است",
    "ابتدا",
    "باید",
    "نشد",
];
const successPatterns = ["ذخیره شد", "حذف شد", "چاپ شد", "تسویه شد", "انتخاب شد", "باز شد", "انجام شد", "برقرار است"];
function classifyMessage(message) {
    if (errorPatterns.some((pattern) => message.includes(pattern)))
        return "error";
    if (successPatterns.some((pattern) => message.includes(pattern)))
        return "success";
    return "info";
}
export function useDesktopToastMessage(message) {
    const toast = useToast();
    watch(message, (value) => {
        const text = value.trim();
        if (!text)
            return;
        const type = classifyMessage(text);
        if (type === "error") {
            toast.error(text);
            return;
        }
        if (type === "success") {
            toast.success(text);
            return;
        }
        toast.info(text);
    });
}
