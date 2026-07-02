<script setup lang="ts">
import { ref } from "vue";
import { can } from "../../../components/acl/can";
import { createDbBackup } from "../../../services/dbBackupApi";

const backupPath = ref("");
const loading = ref(false);
const message = ref("");

async function runBackup() {
  if (!can("backup.database")) return;
  if (!backupPath.value.trim()) {
    message.value = "مسیر بکاپ را وارد کنید";
    return;
  }

  loading.value = true;
  message.value = "";
  try {
    const result = await createDbBackup(backupPath.value.trim());
    message.value = result.message || `بکاپ ساخته شد: ${result.path || backupPath.value}`;
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در گرفتن بکاپ دیتابیس";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="backup-panel">
    <div class="panel-title">بکاپ دیتابیس</div>
    <p class="panel-note">
      مسیر باید روی همان سیستمی قابل دسترس باشد که SQL Server روی آن اجرا می‌شود. می‌توانید مسیر پوشه یا فایل ‎.bak بدهید.
    </p>

    <label class="field">
      <span>مسیر ذخیره بکاپ</span>
      <input v-model="backupPath" :disabled="!can('backup.database') || loading" placeholder="مثلا D:\\PargasBackups یا D:\\PargasBackups\\backup.bak" />
    </label>

    <div class="backup-actions">
      <button class="s-btn primary" :disabled="!can('backup.database') || loading" @click="runBackup">
        {{ loading ? "در حال گرفتن بکاپ" : "گرفتن بکاپ کامل" }}
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
.field input { min-height: 42px; border-radius: 10px; padding: 8px 10px; color: #eef2ff; background: rgba(0,0,0,.2); border: 1px solid rgba(255,255,255,.12); }
.backup-actions { display: flex; justify-content: flex-start; }
.s-btn { min-height: 40px; border-radius: 10px; padding: 8px 14px; color: #eef2ff; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1); cursor: pointer; }
.s-btn.primary { font-weight: 900; background: rgba(20,184,166,.18); border-color: rgba(20,184,166,.34); }
.s-btn:disabled { cursor: not-allowed; opacity: .55; }
.backup-message { border-radius: 10px; padding: 10px 12px; background: rgba(20,184,166,.1); border: 1px solid rgba(20,184,166,.22); color: #bbf7d0; }
.backup-message.warn { color: #fde68a; background: rgba(245,158,11,.12); border-color: rgba(245,158,11,.22); }
</style>
