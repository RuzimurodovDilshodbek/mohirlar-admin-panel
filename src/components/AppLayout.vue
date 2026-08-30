<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useModerationStore } from '@/stores/moderation';
import { label } from '@/lib/format';
import { readPref, writePref } from '@/lib/prefs';
import { resolvedTheme, themeSetting, setTheme, THEMES } from '@/lib/theme';
import Icon from '@/components/Icon.vue';
import Avatar from '@/components/Avatar.vue';
import CommandPalette from '@/components/CommandPalette.vue';

const auth = useAuthStore();
const moderation = useModerationStore();
const route = useRoute();
const router = useRouter();

// ─── Navigation ───
// Grouped, because a flat list of nine links gave no clue that "Shikoyatlar"
// is a queue you work and "Maʼlumotnomalar" is a catalogue you edit.
const NAV = [
  {
    title: '',
    items: [{ name: 'dashboard', label: 'Boshqaruv paneli', icon: 'dashboard' }],
  },
  {
    title: 'Moderatsiya',
    items: [
      { name: 'jobs', label: 'Vakansiyalar', icon: 'briefcase', badge: 'jobs' },
      { name: 'verifications', label: 'Tasdiqlashlar', icon: 'shield', badge: 'verifications' },
      { name: 'reports', label: 'Shikoyatlar', icon: 'flag', badge: 'reports' },
    ],
  },
  {
    title: 'Baza',
    items: [
      { name: 'users', label: 'Foydalanuvchilar', icon: 'users' },
      { name: 'companies', label: 'Kompaniyalar', icon: 'building', admin: true },
      { name: 'content', label: 'Maʼlumotnomalar', icon: 'list', admin: true },
    ],
  },
  {
    title: 'Tizim',
    items: [
      { name: 'commerce', label: 'Moliya va obunalar', icon: 'card', admin: true },
      { name: 'audit', label: 'Audit jurnali', icon: 'file' },
    ],
  },
];

// Companies / commerce / reference CMS live behind `role:admin` on the backend —
// a moderator must not be offered a link that can only 403.
const nav = computed(() =>
  NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.admin || auth.isAdmin) })).filter((g) => g.items.length),
);

const badgeCount = (item) => (item.badge ? moderation.byNav[item.badge] || 0 : 0);

// ─── Shell state ───
const mobileOpen = ref(false);
const collapsed = ref(readPref('sidebar.collapsed', false));
const paletteOpen = ref(false);
const userMenuOpen = ref(false);

watch(collapsed, (v) => writePref('sidebar.collapsed', v));
watch(() => route.fullPath, () => { mobileOpen.value = false; userMenuOpen.value = false; });

// ─── Connectivity ───
const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine);
const setOnline = () => { online.value = true; };
const setOffline = () => { online.value = false; };

// ─── Moderation badges ───
// Polled, because the badge is the only thing that tells a moderator a queue
// filled up while they were on another page. Paused while the tab is hidden so
// a panel left open overnight is not a background load on the API.
const POLL_MS = 60_000;
let poll = null;
function startPoll() {
  stopPoll();
  poll = setInterval(() => {
    if (document.visibilityState === 'visible') moderation.refresh();
  }, POLL_MS);
}
function stopPoll() {
  if (poll) clearInterval(poll);
  poll = null;
}
function onVisibility() {
  if (document.visibilityState === 'visible') moderation.refresh();
}

// ─── Global keys ───
function onKeydown(e) {
  const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName) || e.target?.isContentEditable;

  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    paletteOpen.value = !paletteOpen.value;
    return;
  }
  if (inField) return;
  if (e.key === '/') {
    // Pages with a search box focus it; the ones without simply ignore this.
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('admin:focus-search'));
  }
}

function onDocClick(e) {
  if (userMenuOpen.value && !e.target.closest('[data-user-menu]')) userMenuOpen.value = false;
}

onMounted(() => {
  moderation.refresh();
  startPoll();
  window.addEventListener('online', setOnline);
  window.addEventListener('offline', setOffline);
  window.addEventListener('keydown', onKeydown);
  document.addEventListener('visibilitychange', onVisibility);
  document.addEventListener('click', onDocClick);
});
onUnmounted(() => {
  stopPoll();
  window.removeEventListener('online', setOnline);
  window.removeEventListener('offline', setOffline);
  window.removeEventListener('keydown', onKeydown);
  document.removeEventListener('visibilitychange', onVisibility);
  document.removeEventListener('click', onDocClick);
});

async function logout() {
  await auth.logout();
  router.replace({ name: 'login' });
}

const pageTitle = computed(() => route.meta.title || 'Mohirlar');
const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform || '');
</script>

<template>
  <div class="flex min-h-screen bg-bg">
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[300] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm">
      Asosiy qismga oʻtish
    </a>

    <!-- ─── Sidebar ─── -->
    <aside
      class="fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col border-r border-line bg-surface transition-[width,transform] duration-250 lg:sticky lg:top-0 lg:bottom-auto lg:h-screen lg:overflow-y-auto"
      :style="{ transitionTimingFunction: 'var(--ease-out)' }"
      :class="[
        collapsed ? 'w-[72px]' : 'w-64',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ]"
    >
      <div class="flex h-16 items-center gap-2.5 border-b border-line px-4">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent font-serif-display text-lg text-white italic">M</span>
        <div v-if="!collapsed" class="min-w-0 leading-tight">
          <div class="truncate text-[15px] font-semibold text-ink">Mohirlar</div>
          <div class="text-[10px] tracking-[0.14em] text-ink-4 uppercase">Admin panel</div>
        </div>
        <button class="icon-btn ml-auto lg:hidden" aria-label="Yopish" @click="mobileOpen = false">
          <Icon name="close" :size="18" />
        </button>
      </div>

      <nav class="flex-1 space-y-4 overflow-y-auto p-3">
        <div v-for="(group, gi) in nav" :key="gi">
          <div
            v-if="group.title && !collapsed"
            class="px-3 pt-1 pb-1.5 text-[10px] font-semibold tracking-[0.12em] text-ink-4 uppercase"
          >
            {{ group.title }}
          </div>
          <div v-else-if="group.title && collapsed" class="mx-3 mb-2 border-t border-line-2" />

          <RouterLink
            v-for="item in group.items"
            :key="item.name"
            :to="{ name: item.name }"
            class="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150"
            :class="[
              route.name === item.name ? 'bg-accent text-white' : 'text-ink-2 hover:bg-elev hover:text-ink',
              collapsed ? 'justify-center px-0' : '',
            ]"
            :title="collapsed ? item.label : undefined"
          >
            <span class="relative">
              <Icon :name="item.icon" :size="18" />
              <!-- Collapsed rail keeps the signal: a dot instead of a number. -->
              <span
                v-if="collapsed && badgeCount(item)"
                class="absolute -top-1 -right-1 h-2 w-2 rounded-full ring-2"
                :class="route.name === item.name ? 'bg-white ring-accent' : 'bg-warn ring-surface'"
              />
            </span>
            <template v-if="!collapsed">
              <span class="flex-1 truncate">{{ item.label }}</span>
              <span
                v-if="badgeCount(item)"
                class="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums"
                :class="route.name === item.name ? 'bg-white/22 text-white' : 'bg-warn-soft text-warn-ink'"
              >{{ badgeCount(item) > 99 ? '99+' : badgeCount(item) }}</span>
            </template>
          </RouterLink>
        </div>
      </nav>

      <div class="border-t border-line p-3">
        <button
          class="hidden w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-ink-3 transition-colors hover:bg-elev hover:text-ink lg:flex"
          :class="collapsed ? 'justify-center px-0' : ''"
          :title="collapsed ? 'Panelni yoyish' : 'Panelni yigʻish'"
          @click="collapsed = !collapsed"
        >
          <Icon :name="collapsed ? 'right' : 'left'" :size="18" />
          <span v-if="!collapsed">Yigʻish</span>
        </button>
      </div>
    </aside>

    <!-- backdrop on mobile -->
    <Transition name="fade">
      <div v-if="mobileOpen" class="fixed inset-0 z-30 lg:hidden" :style="{ background: 'var(--scrim)' }" @click="mobileOpen = false" />
    </Transition>

    <!-- ─── Main ─── -->
    <div class="flex min-w-0 flex-1 flex-col">
      <header class="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-line bg-bg/80 px-4 backdrop-blur-md sm:px-6">
        <button class="icon-btn lg:hidden" aria-label="Menyu" @click="mobileOpen = true">
          <Icon name="menu" :size="20" />
        </button>

        <h1 class="truncate font-serif-display text-xl text-ink sm:text-2xl">{{ pageTitle }}</h1>

        <div class="flex-1" />

        <!-- Search / command trigger -->
        <button
          class="hidden h-9 items-center gap-2 rounded-xl border border-line bg-surface pr-2 pl-3 text-sm text-ink-3 transition-colors hover:border-ink-4 hover:text-ink md:flex"
          @click="paletteOpen = true"
        >
          <Icon name="search" :size="15" />
          <span class="pr-6">Qidirish…</span>
          <span class="kbd">{{ isMac ? '⌘' : 'Ctrl' }}</span>
          <span class="kbd">K</span>
        </button>
        <button class="icon-btn md:hidden" aria-label="Qidirish" @click="paletteOpen = true">
          <Icon name="search" :size="18" />
        </button>

        <span
          v-if="!online"
          class="inline-flex items-center gap-1.5 rounded-full border border-warn/25 bg-warn-soft px-2.5 py-1 text-xs font-medium text-warn-ink"
          title="Internet aloqasi yoʻq — maʼlumotlar eskirgan boʻlishi mumkin"
        >
          <Icon name="offline" :size="13" />
          <span class="hidden sm:inline">Oflayn</span>
        </span>

        <!-- Theme -->
        <button
          class="icon-btn"
          :aria-label="resolvedTheme === 'dark' ? 'Yorugʻ rejim' : 'Qorongʻi rejim'"
          :title="resolvedTheme === 'dark' ? 'Yorugʻ rejimga oʻtish' : 'Qorongʻi rejimga oʻtish'"
          @click="setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')"
        >
          <Icon :name="resolvedTheme === 'dark' ? 'sun' : 'moon'" :size="18" />
        </button>

        <!-- User menu -->
        <div class="relative" data-user-menu>
          <button
            class="flex items-center gap-2 rounded-xl py-1 pr-2 pl-1 transition-colors hover:bg-elev"
            :aria-expanded="userMenuOpen"
            @click="userMenuOpen = !userMenuOpen"
          >
            <Avatar :name="auth.displayName" :seed="auth.user?.id" :size="32" />
            <span class="hidden text-left leading-tight sm:block">
              <span class="block max-w-[140px] truncate text-[13px] font-medium text-ink">{{ auth.displayName }}</span>
              <span class="block text-[11px] text-ink-3">{{ label(auth.user?.role) }}</span>
            </span>
            <Icon name="down" :size="14" class="hidden text-ink-4 sm:block" />
          </button>

          <Transition name="menu">
            <div
              v-if="userMenuOpen"
              class="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-surface py-1.5"
              :style="{ boxShadow: 'var(--shadow-pop)' }"
            >
              <div class="border-b border-line px-4 py-3">
                <div class="truncate text-sm font-medium text-ink">{{ auth.displayName }}</div>
                <div class="mt-0.5 text-xs text-ink-3">{{ label(auth.user?.role) }}</div>
              </div>

              <div class="px-3 py-2.5">
                <div class="mb-1.5 text-[10px] font-semibold tracking-wider text-ink-4 uppercase">Koʻrinish</div>
                <div class="flex gap-1 rounded-lg bg-elev p-1">
                  <button
                    v-for="t in THEMES"
                    :key="t.value"
                    class="flex-1 rounded-md py-1.5 text-xs font-medium transition-colors"
                    :class="themeSetting === t.value ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink'"
                    @click="setTheme(t.value)"
                  >{{ t.label }}</button>
                </div>
              </div>

              <div class="border-t border-line pt-1.5">
                <button
                  class="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-ink-2 transition-colors hover:bg-elev hover:text-ink"
                  @click="paletteOpen = true; userMenuOpen = false"
                >
                  <Icon name="command" :size="16" />
                  Buyruqlar paneli
                  <span class="kbd ml-auto">{{ isMac ? '⌘K' : 'Ctrl K' }}</span>
                </button>
                <button
                  class="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-danger-ink transition-colors hover:bg-danger-soft"
                  @click="logout"
                >
                  <Icon name="logout" :size="16" />
                  Chiqish
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </header>

      <main id="main" class="flex-1 p-4 sm:p-6">
        <RouterView v-slot="{ Component, route: r }">
          <div :key="r.name" class="page-enter mx-auto w-full max-w-[1400px]">
            <component :is="Component" />
          </div>
        </RouterView>
      </main>
    </div>

    <CommandPalette :open="paletteOpen" @close="paletteOpen = false" />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.menu-enter-active,
.menu-leave-active {
  transition: opacity 0.16s var(--ease-out), transform 0.16s var(--ease-out);
}
.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
</style>
