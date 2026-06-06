<script setup>
import { ref } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { label } from '@/lib/format';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const mobileOpen = ref(false);

const NAV = [
  { name: 'dashboard', label: 'Boshqaruv paneli', icon: 'M3 11l9-7 9 7M5 10v10h14V10' },
  { name: 'users', label: 'Foydalanuvchilar', icon: 'M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8M12 8a4 4 0 100-8 4 4 0 000 8' },
  { name: 'jobs', label: 'Vakansiyalar', icon: 'M3 7h18v13H3zM9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 12h18' },
  { name: 'verifications', label: 'Tasdiqlashlar', icon: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4' },
  { name: 'reports', label: 'Shikoyatlar', icon: 'M5 21V4M5 4h11l-2 4 2 4H5' },
  { name: 'audit', label: 'Audit jurnali', icon: 'M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9zM14 3v6h6M8 13h8M8 17h5' },
];

async function logout() {
  await auth.logout();
  router.replace({ name: 'login' });
}
</script>

<template>
  <div class="min-h-screen flex bg-bg">
    <!-- Sidebar -->
    <aside
      class="fixed lg:static inset-y-0 left-0 z-40 w-64 shrink-0 bg-surface border-r border-line flex flex-col transition-transform"
      :class="mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
    >
      <div class="flex items-center gap-2.5 px-5 h-16 border-b border-line">
        <span class="h-9 w-9 rounded-xl bg-accent flex items-center justify-center font-serif-display italic text-[#FAF8F2] text-lg">M</span>
        <div class="leading-tight">
          <div class="font-semibold text-ink text-[15px]">Mohirlar</div>
          <div class="text-[11px] text-ink-3 tracking-wide uppercase">Admin panel</div>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto p-3 space-y-1">
        <RouterLink
          v-for="item in NAV"
          :key="item.name"
          :to="{ name: item.name }"
          class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
          :class="route.name === item.name
            ? 'bg-accent text-white shadow-sm'
            : 'text-ink-2 hover:bg-elev'"
          @click="mobileOpen = false"
        >
          <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor"
            stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path :d="item.icon" />
          </svg>
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="border-t border-line p-3">
        <div class="flex items-center gap-3 rounded-xl px-3 py-2">
          <span class="h-9 w-9 rounded-full bg-accent-soft text-accent-ink flex items-center justify-center text-sm font-semibold">
            {{ (auth.displayName[0] || 'A').toUpperCase() }}
          </span>
          <div class="min-w-0 flex-1">
            <div class="truncate text-[13px] font-medium text-ink">{{ auth.displayName }}</div>
            <div class="text-[11px] text-ink-3">{{ label(auth.user?.role) }}</div>
          </div>
          <button class="text-ink-3 hover:text-warn p-1" title="Chiqish" @click="logout">
            <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor"
              stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- backdrop on mobile -->
    <div v-if="mobileOpen" class="fixed inset-0 z-30 bg-ink/20 lg:hidden" @click="mobileOpen = false" />

    <!-- Main -->
    <div class="flex-1 min-w-0 flex flex-col">
      <header class="sticky top-0 z-20 h-16 bg-bg/85 backdrop-blur border-b border-line flex items-center gap-3 px-4 sm:px-6">
        <button class="lg:hidden text-ink-2 p-1" @click="mobileOpen = true">
          <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <h1 class="font-serif-display text-2xl text-ink">{{ route.meta.title || 'Mohirlar' }}</h1>
        <div class="flex-1" />
        <span class="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-good-soft text-good border border-good/20 px-2.5 py-1 text-xs font-medium">
          <span class="h-1.5 w-1.5 rounded-full bg-good" /> Onlayn
        </span>
      </header>

      <main class="flex-1 p-4 sm:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
