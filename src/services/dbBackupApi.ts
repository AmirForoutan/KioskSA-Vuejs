import { GetApiAddress } from "../utilities";

type ApiEnvelope = {
  status?: boolean | string;
  message?: string;
  path?: string;
  [key: string]: unknown;
};

function apiUrl(baseUrl: string, endpoint: string) {
  const base = baseUrl.replace(/\/$/, "");
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

export async function createDbBackup(targetPath: string) {
  const baseUrl = await GetApiAddress();
  const response = await fetch(apiUrl(baseUrl, "/database/backup/full"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ BackupPath: targetPath, Path: targetPath }),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result = (await response.json()) as ApiEnvelope;
  if (result.status === false || result.status === "false") {
    throw new Error(result.message || "خطا در گرفتن بکاپ دیتابیس");
  }
  return result;
}
