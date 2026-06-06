<script setup>
import { ref, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import UiKit from '@/components/UiKit.vue';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const remember = ref(true);
const submitting = ref(false);
const error = ref('');
const lockoutLeft = ref(0);
let timer = null;

function startLockout(seconds) {
  lockoutLeft.value = seconds;
  clearInterval(timer);
  timer = setInterval(() => {
    lockoutLeft.value -= 1;
    if (lockoutLeft.value <= 0) clearInterval(timer);
  }, 1000);
}
onUnmounted(() => clearInterval(timer));

async function submit() {
  if (submitting.value || lockoutLeft.value > 0) return;
  error.value = '';
  submitting.value = true;
  const res = await auth.login({ email: email.value.trim(), password: password.value, remember: remember.value });
  submitting.value = false;
  if (res.ok) {
    router.replace(route.query.redirect || { name: 'dashboard' });
    return;
  }
  const e = res.error;
  error.value = e.message;
  if (e.code === 'auth.rate_limited' && e.details?.retry_after_seconds) {
    startLockout(Number(e.details.retry_after_seconds));
  }
}
</script>

<template>
  <div class="min-h-screen grid lg:grid-cols-2">
    <!-- Brand panel -->
    <div class="hidden lg:flex flex-col justify-between bg-accent text-[#FAF8F2] p-12 relative overflow-hidden">
      <div class="absolute -right-24 -top-24 h-96 w-96 rounded-full border border-[#FAF8F2]/15" />
      <div class="absolute -right-10 top-20 h-72 w-72 rounded-full border border-[#FAF8F2]/10" />
      <div class="flex items-center gap-3 relative">
        <span class="h-11 w-11 rounded-2xl bg-[#FAF8F2]/15 flex items-center justify-center font-serif-display italic text-2xl">M</span>
        <span class="text-lg font-semibold">Mohirlar</span>
      </div>
      <div class="relative">
        <h1 class="font-serif-display text-4xl leading-tight">Moderatsiya va <span class="italic">boshqaruv</span> markazi</h1>
        <p class="mt-4 text-[#FAF8F2]/70 max-w-md leading-relaxed">
          Foydalanuvchilar, vakansiyalar, tasdiqlashlar va shikoyatlarni bir joydan boshqaring.
          Har bir amal audit jurnaliga yoziladi.
        </p>
      </div>
      <div class="relative text-sm text-[#FAF8F2]/60">© 2026 Mohirlar</div>
    </div>

    <!-- Form -->
    <div class="flex items-center justify-center p-6 sm:p-12">
      <form class="w-full max-w-sm" @submit.prevent="submit">
        <div class="lg:hidden mb-8 flex items-center gap-2.5">
          <span class="h-10 w-10 rounded-xl bg-accent flex items-center justify-center font-serif-display italic text-[#FAF8F2] text-lg">M</span>
          <span class="font-semibold text-ink">Mohirlar admin</span>
        </div>

        <h2 class="font-serif-display text-3xl text-ink">Xush kelibsiz</h2>
        <p class="text-ink-3 mt-1.5 text-sm">Admin panelga kirish uchun maʼlumotlaringizni kiriting.</p>

        <div v-if="error" class="mt-5 rounded-xl border border-warn/25 bg-warn-soft px-4 py-3 text-sm text-warn">
          {{ error }}
          <span v-if="lockoutLeft > 0" class="block mt-1 font-mono text-xs">
            Qayta urinish: {{ lockoutLeft }}s
          </span>
        </div>

        <label class="block mt-6">
          <span class="text-xs font-semibold uppercase tracking-wide text-ink-3">Email</span>
          <input
            v-model="email" type="email" required autocomplete="username"
            placeholder="admin@mohirlar.uz"
            class="mt-1.5 w-full h-11 rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
        </label>

        <label class="block mt-4">
          <span class="text-xs font-semibold uppercase tracking-wide text-ink-3">Parol</span>
          <input
            v-model="password" type="password" required autocomplete="current-password"
            placeholder="••••••••"
            class="mt-1.5 w-full h-11 rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
        </label>

        <label class="mt-4 flex items-center gap-2.5 text-sm text-ink-2 select-none cursor-pointer">
          <input v-model="remember" type="checkbox" class="h-4 w-4 rounded border-line text-accent focus:ring-accent/30" />
          Meni eslab qol
        </label>

        <button
          type="submit"
          :disabled="submitting || lockoutLeft > 0"
          class="mt-6 w-full h-12 rounded-xl bg-ink text-white font-medium text-[15px] flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-ink/90 transition-colors"
        >
          <UiKit v-if="submitting" class="!h-4 !w-4 !border-white/40 !border-t-white" />
          <span>{{ lockoutLeft > 0 ? `Kuting (${lockoutLeft}s)` : 'Kirish' }}</span>
        </button>

        <p class="mt-6 text-xs text-ink-4 text-center">
          Faqat administrator va moderatorlar uchun.
        </p>
      </form>
    </div>
  </div>
</template>
