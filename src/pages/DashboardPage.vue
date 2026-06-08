<script setup>
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { JobsApi, VerificationsApi, ReportsApi, AuditApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { auditLabel, label, shortClass, timeAgo } from '@/lib/format';
import UiKit from '@/components/UiKit.vue';

const auth = useAuthStore();
const loading = ref(true);

// "needs attention" queues — there's no aggregate stats endpoint, so we read
// the first page of each moderation queue and surface the head counts.
const cards = ref([
  { key: 'jobs', title: 'Koʻrib chiqilayotgan vakansiyalar', count: 0, more: false, to: { name: 'jobs' }, tone: 'warn',
    icon: 'M3 7h18v13H3zM9 7V5a2 2 0 012-2h2a2 2 0 012 2v2' },
  { key: 'verifications', title: 'Kutilayotgan tasdiqlashlar', count: 0, more: false, to: { name: 'verifications' }, tone: 'info',
    icon: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4' },
  { key: 'reports', title: 'Ochiq shikoyatlar', count: 0, more: false, to: { name: 'reports' }, tone: 'danger',
    icon: 'M5 21V4M5 4h11l-2 4 2 4H5' },
]);

const recent = ref([]);

const TONE = {
  warn: 'bg-warn-soft text-warn', info: 'bg-info-soft text-info',
  danger: 'bg-warn-soft text-warn', accent: 'bg-accent-soft text-accent-ink',
};

onMounted(async () => {
  try {
    const [jobs, vers, reps, audit] = await Promise.allSettled([
      JobsApi.list({ status: 'pending_review' }),
      VerificationsApi.list({ status: 'pending' }),
      ReportsApi.list({ status: 'open' }),
      AuditApi.list({}),
    ]);
    const fill = (key, res) => {
      const c = cards.value.find((x) => x.key === key);
      if (res.status === 'fulfilled') {
        c.count = res.value?.data?.length ?? 0;
        c.more = !!(res.value?.meta?.next_cursor || res.value?.links?.next);
      }
    };
    fill('jobs', jobs);
    fill('verifications', vers);
    fill('reports', reps);
    if (audit.status === 'fulfilled') recent.value = (audit.value?.data ?? []).slice(0, 8);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="font-serif-display text-2xl text-ink">Assalomu alaykum{{ auth.user?.email ? ', ' + auth.user.email.split('@')[0] : '' }}</h2>
      <p class="text-sm text-ink-3 mt-0.5">Moderatsiya navbatlari va soʻnggi amallar.</p>
    </div>

    <div v-if="loading" class="py-16 flex justify-center"><UiKit /></div>

    <template v-else>
      <!-- Attention cards -->
      <div class="grid gap-4 sm:grid-cols-3">
        <RouterLink
          v-for="c in cards" :key="c.key" :to="c.to"
          class="rounded-2xl border border-line bg-surface p-5 hover:border-accent/40 hover:shadow-sm transition-all"
        >
          <div class="flex items-center justify-between">
            <span class="h-10 w-10 rounded-xl flex items-center justify-center" :class="TONE[c.tone]">
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path :d="c.icon" /></svg>
            </span>
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-ink-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </div>
          <div class="mt-3 font-serif-display text-3xl text-ink">{{ c.count }}<span v-if="c.more" class="text-ink-4 text-xl">+</span></div>
          <div class="text-sm text-ink-3">{{ c.title }}</div>
        </RouterLink>
      </div>

      <!-- Recent activity -->
      <div class="rounded-2xl border border-line bg-surface overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 class="font-medium text-ink">Soʻnggi amallar</h3>
          <RouterLink :to="{ name: 'audit' }" class="text-sm text-accent hover:underline">Audit jurnali →</RouterLink>
        </div>
        <ul v-if="recent.length" class="divide-y divide-line">
          <li v-for="log in recent" :key="log.id" class="flex items-center justify-between gap-3 px-5 py-3">
            <div class="min-w-0">
              <div class="text-sm font-medium text-ink">{{ auditLabel(log.action) }}</div>
              <div class="text-xs text-ink-3">
                {{ log.actor ? label(log.actor.role) : 'Tizim' }}
                · {{ shortClass(log.target_type) }}<span v-if="log.target_id"> #{{ log.target_id }}</span>
              </div>
            </div>
            <span class="shrink-0 text-xs text-ink-4">{{ timeAgo(log.created_at) }}</span>
          </li>
        </ul>
        <div v-else class="px-5 py-10 text-center text-sm text-ink-3">Hozircha amallar yoʻq</div>
      </div>
    </template>
  </div>
</template>
