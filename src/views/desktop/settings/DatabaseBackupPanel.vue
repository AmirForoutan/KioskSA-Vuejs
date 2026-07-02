<script setup lang="ts">
import { onMounted, ref } from "vue";
import { can } from "../../../components/acl/can";
import { createDbBackup, getDbBackupPath, saveDbBackupPath, selectDbBackupPath } from "../../../services/dbBackupApi";

const backupPath = ref("");
const loading = ref(false);
const message = ref("");

onMounted(loadSavedPath);

async function loadSavedPath() {
  if (!can("backup.database")) return;
  try {
    const result = await getDbBackupPath();
    backupPath.value = String(result.path || result.backupPath || "");
  } catch {
    backupPath.value = "";
  }
}

async function choosePathAndBackup() {
  if (!can("backup.database")) return;
  loading.value = true;
  message.value = "";
  try {
    const selected = await selectDbBackupPath();
    backupPath.value = String(selected.path || selected.backupPath || backupPath.value || "");
    if (!backupPath.value.trim()) {
      message.value = selected.message || "انتخاب مسیر لغو شد";
      return;
    }

    const result = await createDbBackup(backupPath.value.trim());
    message.value = `${result.message || "بکاپ ساخته شد"}${result.path ? ` - ${result.path}` : ""}`;
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در انتخاب مسیر یا گرفتن بکاپ";
  } finally {
    loading.value = false;
  }
}

async function savePathOnly() {
  if (!can("backup.database")) return;
  if (!backupPath.value.trim()) {
    message.value = "مسیر را وارد یا انتخاب کنید";
    return;
  }

  loading.value = true;
  message.value = "";
  try {
    const result = await saveDbBackupPath(backupPath.value.trim());
    backupPath.value = String(result.path || result.backupPath || backupPath.value);
    message.value = result.message || "مسیر ذخیره شد";
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در ذخیره مسیر";
  } finally {
    loading.value = false;
  }
}

async function runBackup() {
  if (!can("backup.database")) return;
  if (!backupPath.value.trim()) {
    message.value = "مسیر را وارد یا انتخاب کنید";
    return;
  }

  loading.value = true;
  message.value = "";
  try {
    const result = await createDbBackup(backupPath.value.trim());
    backupPath.value = String(result.backupPath || backupPath.value);
    message.value = `${result.message || "بکاپ ساخته شد"}${result.path ? ` - ${result.path}` : ""}`;
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در گرفتن بکاپ";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="backup-panel">
    <div class="panel-title">بکاپ دیتابیس</div>
    <p class="panel-note">
      مسیر در دیتابیس ذخیره می‌شود. با انتخاب مسیر، پنجره انتخاب پوشه روی سیستم سرویس باز می‌شود و سپس فایل با نامی شبیه Pargas_1405-04-10-195010.bak ساخته می‌شود.
    </p>

    <label class="field">
      <span>مسیر ذخیره</span>
      <div class="path-row">
        <input v-model="backupPath" :disabled="!can('backup.database') || loading" placeholder="مسیر پوشه ذخیره‌سازی" />
        <button class="s-btn" type="button" :disabled="!can('backup.database') || loading" @click="choosePathAndBackup">
          انتخاب مسیر و بکاپ
        </button>
      </div>
    </label>

    <div class="backup-actions">
      <button class="s-btn" :disabled="!can('backup.database') || loading || !backupPath.trim()" @click="savePathOnly">ذخیره مسیر</button>
      <button class="s-btn primary" :disabled="!can('backup.database') || loading || !backupPath.trim()" @click="runBackup">
        {{ loading ? "در حال عملیات" : "بکاپ با مسیر فعلی" }}
      </button>
    </div>

    <div v-if="!can('backup.database')" class="backup-message warn">دسترسی گرفتن بکاپ برای این کاربر فعال نیست.</div>
    <div v-if="message" class="backup-message">{{ message }}</div>
  </section>
</template>

<style scoped>
.backup-panel { border-radius: 14px; padding: 14px; background: rgba(255,255,255,.035); border: 1px solid rgba(255,255,255,.08); display: grid; gap: 12px; }
.panel-title { font-weight: 900; font-size: 16px; }
.panel-note { margin: 0; color: #a7b0c3; font-size: 13px; line-height: 1.9; }
.field { display: grid; gap: 7px; color: #cbd5e1; }
.path-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; }
.field input { min-height: 42px; border-radius: 10px; padding: 8px 10px; color: #eef2ff; background: rgba(0,0,0,.2); border: 1px solid rgba(255,255,255,.12); }
.backup-actions { display: flex; justify-content: flex-start; gap: 8px; flex-wrap: wrap; }
.s-btn { min-height: 40px; border-radius: 10px; padding: 8px 14px; color: #eef2ff; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1); cursor: pointer; }
.s-btn.primary { font-weight: 900; background: rgba(20,184,166,.18); border-color: rgba(20,184,166,.34); }
.s-btn:disabled { cursor: not-allowed; opacity: .55; }
.backup-message { border-radius: 10px; padding: 10px 12px; background: rgba(20,184,166,.1); border: 1px solid rgba(20,184,166,.22); color: #bbf7d0; }
.backup-message.warn { color: #fde68a; background: rgba(245,158,11,.12); border-color: rgba(245,158,11,.22); }
@media (max-width: 760px) { .path-row { grid-template-columns: 1fr; } }
</style>
