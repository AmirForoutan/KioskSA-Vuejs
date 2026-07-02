import { GetApiAddress } from "../utilities";

type ApiEnvelope = {
  status?: boolean | string;
  message?: string;
  path?: string;
  backupPath?: string;
  compressed?: boolean;
  cancelled?: boolean;
  [key: string]: unknown;
};

function apiUrl(baseUrl: string, endpoint: string) {
  const base = baseUrl.replace(/\/$/, "");
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

async function postBackup(endpoint: string, body: unknown = {}) {
  const baseUrl = await GetApiAddress();
  const response = await fetch(apiUrl(baseUrl, endpoint), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result = (await response.json()) as ApiEnvelope;
  if (result.status === false || result.status === "false") {
    throw new Error(result.message || "خطا در عملیات بکاپ دیتابیس");
  }
  return result;
}

const root = "/database" + "/backup";

export async function getDbBackupPath() {
  return postBackup(root + "/path/get", {});
}

export async function selectDbBackupPath() {
  return postBackup(root + "/path/select", {});
}

export async function saveDbBackupPath(targetPath: string) {
  return postBackup(root + "/path/save", { BackupPath: targetPath, Path: targetPath });
}

export async function createDbBackup(targetPath?: string) {
  return postBackup(root + "/full", { BackupPath: targetPath || "", Path: targetPath || "" });
}
