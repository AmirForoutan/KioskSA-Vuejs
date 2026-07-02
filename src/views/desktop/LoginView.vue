<script setup lang="ts">
import { ref } from "vue";
import { loginDesktop } from "../../services/desktopApi";
import { setDesktopUser } from "../../components/stores/auth.store";
import { useDesktopToastMessage } from "./useDesktopToastMessage";

const username = ref("");
const password = ref("");
const loading = ref(false);
const message = ref("");

useDesktopToastMessage(message);

async function login() {
  if (!username.value.trim() || !password.value.trim()) {
    message.value = "نام کاربری و رمز عبور را وارد کنید";
    return;
  }

  loading.value = true;
  message.value = "";
  try {
    const result = await loginDesktop(username.value.trim(), password.value);
    if (!result.status || !result.user) {
      message.value = result.message || "ورود ناموفق بود";
      return;
    }
    setDesktopUser(result.user);
  } catch (error) {
    message.value = error instanceof Error ? error.message : "خطا در ورود";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="login-shell" dir="rtl">
    <section class="login-panel">
      <div class="brand">POS</div>
      <h1>ورود به نرم افزار</h1>

      <form class="login-form" @submit.prevent="login">
        <label>
          <span>نام کاربری</span>
          <input v-model="username" autocomplete="username" />
        </label>
        <label>
          <span>رمز عبور</span>
          <input v-model="password" type="password" autocomplete="current-password" />
        </label>
        <button :disabled="loading">{{ loading ? "در حال ورود" : "ورود" }}</button>
      </form>

      <div v-if="message" class="message">{{ message }}</div>
    </section>
  </main>
</template>

<style scoped>
.login-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #10131a;
  color: #eef2ff;
  padding: 24px;
}

.login-panel {
  width: min(420px, 100%);
  border-radius: 8px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.brand {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  font-weight: 900;
  background: rgba(20, 184, 166, 0.18);
  border: 1px solid rgba(20, 184, 166, 0.34);
}

h1 {
  margin: 18px 0 8px;
  font-size: 24px;
}

p {
  margin: 0 0 18px;
  color: #a7b0c3;
}

.login-form {
  display: grid;
  gap: 12px;
}

label {
  display: grid;
  gap: 7px;
  color: #a7b0c3;
}

input,
button {
  min-height: 48px;
  border-radius: 8px;
  padding: 9px 11px;
  font-size: 15px;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

button {
  margin-top: 4px;
  cursor: pointer;
  font-weight: 900;
  background: rgba(20, 184, 166, 0.18);
  border-color: rgba(20, 184, 166, 0.34);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.message {
  margin-top: 12px;
  border-radius: 8px;
  padding: 10px 12px;
  color: #fde68a;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.22);
}
</style>
