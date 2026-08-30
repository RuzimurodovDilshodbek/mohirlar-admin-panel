<script setup>
import { ref, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { resolvedTheme, setTheme } from '@/lib/theme';
import Spinner from '@/components/Spinner.vue';
import Icon from '@/components/Icon.vue';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const remember = ref(true);
const reveal = ref(false);
const capsOn = ref(false);
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

// Caps Lock is the single most common reason a correct password is rejected,
// and the field masks the evidence.
function onKey(e) {
  capsOn.value = e.getModifierState?.('CapsLock') ?? false;
}

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
  <div class="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
    <!-- ─── Brand panel ─── -->
    <div class="relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex" style="background: #04070f">
      <!-- Deep-space wash: the same night sky the mobile app opens on. -->
      <div class="pointer-events-none absolute inset-0" style="background: radial-gradient(120% 80% at 15% 0%, rgba(61,107,255,0.30) 0%, rgba(61,107,255,0.06) 42%, transparent 70%)" />
      <div class="pointer-events-none absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full border border-white/10" />
      <div class="pointer-events-none absolute -right-16 top-24 h-80 w-80 rounded-full border border-white/[0.07]" />
      <div class="pointer-events-none absolute right-24 bottom-10 h-56 w-56 rounded-full" style="background: radial-gradient(circle, rgba(124,58,237,0.22), transparent 65%)" />

      <div class="relative flex items-center gap-3">
        <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 font-serif-display text-2xl italic backdrop-blur">M</span>
        <span class="text-lg font-semibold">Mohirlar</span>
      </div>

      <div class="relative max-w-lg">
        <h1 class="font-serif-display text-[42px] leading-[1.1]">
          Moderatsiya va <span class="italic" style="color: #93aaff">boshqaruv</span> markazi
        </h1>
        <p class="mt-5 leading-relaxed text-white/60">
          Foydalanuvchilar, vakansiyalar, tasdiqlashlar va shikoyatlarni bir joydan boshqaring.
          Har bir amal audit jurnaliga yoziladi.
        </p>

        <ul class="mt-8 space-y-3">
          <li v-for="f in ['Jonli moderatsiya navbatlari', 'Platforma koʻrsatkichlari va daromad', 'Toʻliq audit izi']" :key="f"
            class="flex items-center gap-3 text-sm text-white/75">
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
              <Icon name="check" :size="13" :stroke="2.4" />
            </span>
            {{ f }}
          </li>
        </ul>
      </div>

      <div class="relative text-sm text-white/40">© 2026 Mohirlar</div>
    </div>

    <!-- ─── Form ─── -->
    <div class="relative flex items-center justify-center p-6 sm:p-12">
      <button
        class="icon-btn absolute top-5 right-5"
        :title="resolvedTheme === 'dark' ? 'Yorugʻ rejim' : 'Qorongʻi rejim'"
        @click="setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')"
      >
        <Icon :name="resolvedTheme === 'dark' ? 'sun' : 'moon'" :size="18" />
      </button>

      <form class="w-full max-w-sm" @submit.prevent="submit">
        <div class="mb-8 flex items-center gap-2.5 lg:hidden">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-accent font-serif-display text-lg text-white italic">M</span>
          <span class="font-semibold text-ink">Mohirlar admin</span>
        </div>

        <h2 class="font-serif-display text-[32px] leading-tight text-ink">Xush kelibsiz</h2>
        <p class="mt-1.5 text-sm text-ink-3">Admin panelga kirish uchun maʼlumotlaringizni kiriting.</p>

        <Transition name="shake">
          <div v-if="error" class="mt-5 flex gap-2.5 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger-ink">
            <Icon name="alert" :size="16" class="mt-0.5 shrink-0" />
            <div>
              {{ error }}
              <span v-if="lockoutLeft > 0" class="mt-1 block font-mono text-xs">Qayta urinish: {{ lockoutLeft }}s</span>
            </div>
          </div>
        </Transition>

        <label class="mt-6 block">
          <span class="field-label">Email</span>
          <input
            v-model="email" type="email" required autocomplete="username" autofocus
            placeholder="admin@mohirlar.uz"
            class="input mt-1.5"
          />
        </label>

        <label class="mt-4 block">
          <span class="field-label">Parol</span>
          <div class="relative mt-1.5">
            <input
              v-model="password" :type="reveal ? 'text' : 'password'" required autocomplete="current-password"
              placeholder="••••••••"
              class="input pr-11"
              @keyup="onKey"
              @keydown="onKey"
            />
            <button
              type="button"
              class="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-lg p-2 text-ink-4 transition-colors hover:text-ink"
              :aria-label="reveal ? 'Parolni yashirish' : 'Parolni koʻrsatish'"
              @click="reveal = !reveal"
            >
              <Icon :name="reveal ? 'ban' : 'eye'" :size="16" />
            </button>
          </div>
          <span v-if="capsOn" class="mt-1.5 flex items-center gap-1.5 text-xs text-warn-ink">
            <Icon name="alert" :size="12" /> Caps Lock yoqilgan
          </span>
        </label>

        <label class="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-ink-2 select-none">
          <input v-model="remember" type="checkbox" class="h-4 w-4 rounded border-line accent-[var(--color-accent)]" />
          Meni eslab qol
        </label>

        <button type="submit" class="btn btn-primary btn-lg mt-6 w-full" :disabled="submitting || lockoutLeft > 0">
          <Spinner v-if="submitting" :size="16" on-fill />
          <span>{{ lockoutLeft > 0 ? `Kuting (${lockoutLeft}s)` : 'Kirish' }}</span>
        </button>

        <p class="mt-6 text-center text-xs text-ink-4">Faqat administrator va moderatorlar uchun.</p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.shake-enter-active {
  animation: shake 0.32s var(--ease-out);
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
</style>
