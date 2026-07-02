import { GetApiAddress } from "../utilities";
function apiUrl(baseUrl, endpoint) {
    const base = baseUrl.replace(/\/$/, "");
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
}
export async function createDbBackup(targetPath) {
    const baseUrl = await GetApiAddress();
    const response = await fetch(apiUrl(baseUrl, "/database/backup/full"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ BackupPath: targetPath, Path: targetPath }),
    });
    if (!response.ok)
        throw new Error(`HTTP ${response.status}`);
    const result = (await response.json());
    if (result.status === false || result.status === "false") {
        throw new Error(result.message || "خطا در گرفتن بکاپ دیتابیس");
    }
    return result;
}
