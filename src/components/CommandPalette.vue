<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { UsersApi, JobsApi, CompaniesApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useModerationStore } from '@/stores/moderation';
import { toggleTheme, resolvedTheme } from '@/lib/theme';
import { label, salaryRange } from '@/lib/format';
import Icon from '@/components/Icon.vue';
import Spinner from '@/components/Spinner.vue';

// ─── Command palette (⌘K / Ctrl+K) ───
// The panel has ten sections and three of them are searchable lists behind
// their own filters. Finding one company used to be: pick the page, wait for
// the default filter, type, wait again. This is one keystroke from anywhere.

const props = defineProps({ open: { type: Boolean, default: false } });
const emit = defineEmits(['close']);

const router = useRouter();
const auth = useAuthStore();
const moderation = useModerationStore();

const q = ref('');
const cursor = ref(0);
const inputEl = ref(null);
const listEl = ref(null);
const searching = ref(false);
const remote = ref({ users: [], jobs: [], companies: [] });

const PAGES = [
  { name: 'dashboard', label: 'Boshqaruv paneli', icon: 'dashboard', keywords: 'dashboard statistika kpi bosh' },
  { name: 'users', label: 'Foydalanuvchilar', icon: 'users', keywords: 'user foydalanuvchi nomzod ish beruvchi' },
  { name: 'jobs', label: 'Vakansiyalar', icon: 'briefcase', keywords: 'job vakansiya ish moderatsiya' },
  { name: 'companies', label: 'Kompaniyalar', icon: 'building', keywords: 'company kompaniya tashkilot', admin: true },
  { name: 'verifications', label: 'Tasdiqlashlar', icon: 'shield', keywords: 'verification tasdiq hujjat pasport' },
  { name: 'reports', label: 'Shikoyatlar', icon: 'flag', keywords: 'report shikoyat spam' },
  { name: 'commerce', label: 'Moliya va obunalar', icon: 'card', keywords: 'payment tolov obuna tarif mrr', admin: true },
  { name: 'content', label: 'Maʼlumotnomalar', icon: 'list', keywords: 'kategoriya konikma tuman reference', admin: true },
  { name: 'audit', label: 'Audit jurnali', icon: 'file', keywords: 'audit log jurnal tarix' },
];

const ACTIONS = computed(() => [
  {
    id: 'theme',
    label: resolvedTheme.value === 'dark' ? 'Yorugʻ rejimga oʻtish' : 'Qorongʻi rejimga oʻtish',
    icon: resolvedTheme.value === 'dark' ? 'sun' : 'moon',
    keywords: 'theme rejim dark light qorongi yorug',
    run: toggleTheme,
    keepOpen: true,
  },
  {
    id: 'refresh',
    label: 'Moderatsiya hisoblagichlarini yangilash',
    icon: 'refresh',
    keywords: 'refresh yangilash counts badge',
    run: () => moderation.refresh({ force: true }),
  },
  {
    id: 'logout',
    label: 'Tizimdan chiqish',
    icon: 'logout',
    keywords: 'logout chiqish exit',
    run: async () => {
      await auth.logout();
      router.replace({ name: 'login' });
    },
  },
]);

const norm = (s) => String(s ?? '').toLowerCase().trim();

const pageItems = computed(() => {
  const term = norm(q.value);
  return PAGES.filter((p) => !p.admin || auth.isAdmin)
    .filter((p) => !term || norm(p.label).includes(term) || norm(p.keywords).includes(term))
    .map((p) => ({
      key: `page:${p.name}`,
      icon: p.icon,
      title: p.label,
      badge: moderation.byNav[p.name] || 0,
      run: () => router.push({ name: p.name }),
    }));
});

const actionItems = computed(() => {
  const term = norm(q.value);
  return ACTIONS.value
    .filter((a) => !term || norm(a.label).includes(term) || norm(a.keywords).includes(term))
    .map((a) => ({ key: `action:${a.id}`, icon: a.icon, title: a.label, run: a.run, keepOpen: a.keepOpen }));
});

const userItems = computed(() =>
  remote.value.users.map((u) => ({
    key: `user:${u.id}`,
    icon: 'user',
    title: u.full_name || u.phone || u.email || '—',
    sub: [u.full_name ? u.phone : null, label(u.role)].filter(Boolean).join(' · '),
    run: () => router.push({ name: 'users', query: { q: u.phone || u.email || '' } }),
  })),
);
const jobItems = computed(() =>
  remote.value.jobs.map((j) => ({
    key: `job:${j.id}`,
    icon: 'briefcase',
    title: j.title,
    sub: [j.company?.name, salaryRange(j.salary_min, j.salary_max)].filter(Boolean).join(' · '),
    run: () => router.push({ name: 'jobs', query: { status: 'all', q: j.title } }),
  })),
);
const companyItems = computed(() =>
  remote.value.companies.map((c) => ({
    key: `company:${c.id}`,
    icon: 'building',
    title: c.name,
    sub: c.verified ? 'Tasdiqlangan' : 'Tasdiqlanmagan',
    run: () => router.push({ name: 'companies', query: { q: c.name } }),
  })),
);

const groups = computed(() =>
  [
    { title: 'Sahifalar', items: pageItems.value },
    { title: 'Foydalanuvchilar', items: userItems.value },
    { title: 'Vakansiyalar', items: jobItems.value },
    { title: 'Kompaniyalar', items: companyItems.value },
    { title: 'Amallar', items: actionItems.value },
  ].filter((g) => g.items.length),
);

const flat = computed(() => groups.value.flatMap((g) => g.items));

// ─── Remote search ───
// A token guards against a slow first request landing after a faster second
// one and overwriting newer results with older ones.
let token = 0;
let timer = null;

watch(q, (term) => {
  clearTimeout(timer);
  const t = norm(term);
  if (t.length < 2) {
    remote.value = { users: [], jobs: [], companies: [] };
    searching.value = false;
    return;
  }
  searching.value = true;
  timer = setTimeout(() => runSearch(t), 260);
});

async function runSearch(term) {
  const mine = ++token;
  const take = (res) => (res?.data ?? []).slice(0, 4);
  const calls = [
    UsersApi.list({ q: term }).then(take).catch(() => []),
    JobsApi.list({ status: 'all', q: term }).then(take).catch(() => []),
    auth.isAdmin ? CompaniesApi.list({ q: term }).then(take).catch(() => []) : Promise.resolve([]),
  ];
  const [users, jobs, companies] = await Promise.all(calls);
  if (mine !== token) return;
  remote.value = { users, jobs, companies };
  searching.value = false;
  cursor.value = 0;
}

// ─── Keyboard ───
function move(step) {
  if (!flat.value.length) return;
  cursor.value = (cursor.value + step + flat.value.length) % flat.value.length;
  nextTick(() => {
    listEl.value?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  });
}

function choose(item) {
  if (!item) return;
  if (!item.keepOpen) emit('close');
  item.run();
}

function onKeydown(e) {
  if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
  else if (e.key === 'Enter') { e.preventDefault(); choose(flat.value[cursor.value]); }
  else if (e.key === 'Escape') { e.preventDefault(); emit('close'); }
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    q.value = '';
    cursor.value = 0;
    remote.value = { users: [], jobs: [], companies: [] };
    await nextTick();
    inputEl.value?.focus();
  },
);
watch(flat, () => { if (cursor.value >= flat.value.length) cursor.value = 0; });

onUnmounted(() => clearTimeout(timer));

const indexOf = (item) => flat.value.findIndex((i) => i.key === item.key);
</script>

<template>
  <Teleport to="body">
    <Transition name="cmdk">
      <div v-if="open" class="fixed inset-0 z-[180] flex items-start justify-center p-4 pt-[12vh]" @keydown="onKeydown">
        <div class="cmdk-scrim absolute inset-0 backdrop-blur-[3px]" :style="{ background: 'var(--scrim)' }" @click="emit('close')" />

        <div
          class="cmdk-panel relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-line bg-surface"
          :style="{ boxShadow: 'var(--shadow-pop)' }"
          role="dialog"
          aria-modal="true"
          aria-label="Buyruqlar paneli"
        >
          <div class="flex items-center gap-3 border-b border-line px-4">
            <Icon name="search" :size="18" class="text-ink-4" />
            <input
              ref="inputEl"
              v-model="q"
              type="text"
              placeholder="Sahifa, foydalanuvchi, vakansiya yoki amal qidiring…"
              class="no-ring h-14 flex-1 border-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-4"
            />
            <Spinner v-if="searching" :size="16" />
            <span class="kbd">ESC</span>
          </div>

          <div ref="listEl" class="flex-1 overflow-y-auto overscroll-contain p-2">
            <div v-for="g in groups" :key="g.title" class="mb-1">
              <div class="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-ink-4 uppercase">
                {{ g.title }}
              </div>
              <button
                v-for="item in g.items"
                :key="item.key"
                class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
                :class="indexOf(item) === cursor ? 'bg-accent-soft' : 'hover:bg-elev'"
                :data-active="indexOf(item) === cursor"
                @click="choose(item)"
                @mousemove="cursor = indexOf(item)"
              >
                <span
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  :class="indexOf(item) === cursor ? 'bg-accent text-white' : 'bg-elev text-ink-3'"
                >
                  <Icon :name="item.icon" :size="16" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium text-ink">{{ item.title }}</span>
                  <span v-if="item.sub" class="block truncate text-xs text-ink-3">{{ item.sub }}</span>
                </span>
                <span
                  v-if="item.badge"
                  class="shrink-0 rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-semibold text-warn-ink"
                >{{ item.badge }}</span>
                <Icon v-if="indexOf(item) === cursor" name="arrowRight" :size="14" class="text-accent-ink" />
              </button>
            </div>

            <div v-if="!flat.length" class="px-4 py-12 text-center">
              <p class="text-sm text-ink-3">“{{ q }}” boʻyicha hech narsa topilmadi</p>
              <p class="mt-1 text-xs text-ink-4">Telefon, email, ism, vakansiya yoki kompaniya nomini kiriting</p>
            </div>
          </div>

          <div class="flex items-center gap-4 border-t border-line bg-elev/50 px-4 py-2.5 text-[11px] text-ink-4">
            <span class="flex items-center gap-1.5"><span class="kbd">↑</span><span class="kbd">↓</span> tanlash</span>
            <span class="flex items-center gap-1.5"><span class="kbd">↵</span> ochish</span>
            <span class="ml-auto flex items-center gap-1.5"><span class="kbd">Ctrl</span><span class="kbd">K</span></span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cmdk-enter-active .cmdk-scrim,
.cmdk-leave-active .cmdk-scrim {
  transition: opacity 0.18s ease;
}
.cmdk-enter-active .cmdk-panel,
.cmdk-leave-active .cmdk-panel {
  transition: opacity 0.2s var(--ease-out), transform 0.2s var(--ease-out);
}
.cmdk-enter-from .cmdk-scrim,
.cmdk-leave-to .cmdk-scrim {
  opacity: 0;
}
.cmdk-enter-from .cmdk-panel,
.cmdk-leave-to .cmdk-panel {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}
</style>
