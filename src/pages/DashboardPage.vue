<script setup>
import { ref, computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { StatsApi, AuditApi, toApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useModerationStore } from '@/stores/moderation';
import { auditLabel, label, shortClass, timeAgo, fmtNum, som, CHART_COLORS } from '@/lib/format';
import UiKit from '@/components/UiKit.vue';
import StatCard from '@/components/StatCard.vue';
import TrendChart from '@/components/charts/TrendChart.vue';
import DonutChart from '@/components/charts/DonutChart.vue';
import FunnelBars from '@/components/charts/FunnelBars.vue';
import BreakdownBars from '@/components/charts/BreakdownBars.vue';

const auth = useAuthStore();
const moderation = useModerationStore();

const loading = ref(true);
const stats = ref(null);
const statsError = ref(null);
const recent = ref([]);

const ICONS = {
  users: 'M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8M12 8a4 4 0 100-8 4 4 0 000 8',
  jobs: 'M3 7h18v13H3zM9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 12h18',
  apps: 'M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9zM14 3v6h6M9 13h6M9 17h4',
  money: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
  company: 'M3 21h18M6 21V7l6-4 6 4v14M10 9h.01M14 9h.01M10 13h.01M14 13h.01M10 17h.01M14 17h.01',
  talent: 'M12 2l2.4 7.4H22l-6 4.6 2.3 7.4L12 17l-6.3 4.4L8 14 2 9.4h7.6z',
};

async function loadStats() {
  statsError.value = null;
  try {
    stats.value = await StatsApi.get();
  } catch (e) {
    statsError.value = toApiError(e, 'Statistika hozircha mavjud emas').message;
    stats.value = null;
  }
}

onMounted(async () => {
  moderation.refresh();
  await Promise.allSettled([
    loadStats(),
    AuditApi.list({}).then((res) => { recent.value = (res?.data ?? []).slice(0, 7); }).catch(() => {}),
  ]);
  loading.value = false;
});

// ─── Derived views (all defensive) ───
const s = computed(() => stats.value || {});
const users = computed(() => s.value.users || {});
const jobs = computed(() => s.value.jobs || {});
const apps = computed(() => s.value.applications || {});
const companies = computed(() => s.value.companies || {});
const subs = computed(() => s.value.subscriptions || {});
const talent = computed(() => s.value.talent || {});
const funnel = computed(() => s.value.funnel || {});
const ts = computed(() => s.value.timeseries || {});

const trendSeries = computed(() => {
  const signups = (ts.value.signups_30d || []).map((p) => p.count ?? 0);
  const applications = (ts.value.applications_30d || []).map((p) => p.count ?? 0);
  const out = [];
  if (signups.length) out.push({ label: 'Roʻyxatdan oʻtishlar', color: CHART_COLORS.accent, data: signups });
  if (applications.length) out.push({ label: 'Arizalar', color: CHART_COLORS.info, data: applications });
  return out;
});
const trendLabels = computed(() => {
  const src = ts.value.signups_30d?.length ? ts.value.signups_30d : ts.value.applications_30d || [];
  return src.map((p) => p.date);
});
const hasTrend = computed(() => trendSeries.value.some((se) => se.data.length));

const byRole = computed(() => users.value.by_role ?? users.value);
const roleSegments = computed(() => [
  { label: label('candidate'), value: byRole.value.candidate ?? users.value.candidates ?? 0, color: CHART_COLORS.neutral },
  { label: label('employer'), value: byRole.value.employer ?? users.value.employers ?? 0, color: CHART_COLORS.accent },
  { label: label('moderator'), value: byRole.value.moderator ?? users.value.moderators ?? 0, color: CHART_COLORS.info },
  { label: label('admin'), value: byRole.value.admin ?? users.value.admins ?? 0, color: CHART_COLORS.ai },
]);

const funnelStages = computed(() => {
  const f = funnel.value;
  const rows = [
    { key: 'job_views', label: 'Vakansiya koʻrishlari', color: CHART_COLORS.accent },
    { key: 'applications_total', label: 'Arizalar', color: CHART_COLORS.info },
    { key: 'shortlisted', label: 'Qisqa roʻyxat', color: '#6366f1' },
    { key: 'interview', label: 'Suhbat', color: CHART_COLORS.ai },
    { key: 'hired', label: 'Ishga olindi', color: CHART_COLORS.good },
  ];
  return rows.filter((r) => f[r.key] != null).map((r) => ({ label: r.label, value: f[r.key], color: r.color }));
});
const hasFunnel = computed(() => funnelStages.value.length > 0);

const jobStages = computed(() => [
  { label: label('active'), value: jobs.value.active ?? 0, color: CHART_COLORS.good },
  { label: label('pending_review'), value: jobs.value.pending_review ?? 0, color: CHART_COLORS.warn },
  { label: label('paused'), value: jobs.value.paused ?? 0, color: CHART_COLORS.neutral },
  { label: label('closed'), value: jobs.value.closed ?? 0, color: CHART_COLORS.ink },
]);

const APP_COLORS = [CHART_COLORS.info, '#6366f1', CHART_COLORS.ai, CHART_COLORS.good, CHART_COLORS.warn, CHART_COLORS.neutral, CHART_COLORS.ink];
const appStatusItems = computed(() =>
  Object.entries(apps.value.by_status || {}).map(([k, v], i) => ({
    label: label(k),
    value: v ?? 0,
    color: APP_COLORS[i % APP_COLORS.length],
  })),
);

// moderation quick-links
const queues = computed(() => [
  { key: 'jobs', title: 'Koʻrib chiqilayotgan vakansiyalar', count: moderation.counts.pending_jobs, to: { name: 'jobs' }, tone: 'warn',
    icon: 'M3 7h18v13H3zM9 7V5a2 2 0 012-2h2a2 2 0 012 2v2' },
  { key: 'verifications', title: 'Kutilayotgan tasdiqlashlar', count: moderation.counts.pending_verifications, to: { name: 'verifications' }, tone: 'info',
    icon: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4' },
  { key: 'reports', title: 'Ochiq shikoyatlar', count: moderation.counts.open_reports, to: { name: 'reports' }, tone: 'danger',
    icon: 'M5 21V4M5 4h11l-2 4 2 4H5' },
]);
const TONE = { warn: 'bg-warn-soft text-warn', info: 'bg-info-soft text-info', danger: 'bg-warn-soft text-warn' };
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="font-serif-display text-2xl text-ink">
        Assalomu alaykum{{ auth.user?.email ? ', ' + auth.user.email.split('@')[0] : '' }}
      </h2>
      <p class="text-sm text-ink-3 mt-0.5">Platforma koʻrsatkichlari va moderatsiya navbatlari.</p>
    </div>

    <div v-if="loading" class="py-20 flex justify-center"><UiKit /></div>

    <template v-else>
      <!-- Stats unavailable notice -->
      <div v-if="statsError" class="rounded-2xl border border-warn/25 bg-warn-soft/60 px-5 py-4 flex items-start gap-3">
        <span class="h-8 w-8 rounded-xl bg-warn-soft text-warn flex items-center justify-center shrink-0">!</span>
        <div class="flex-1">
          <p class="text-sm text-ink-2">{{ statsError }}</p>
          <button class="mt-1 text-sm font-medium text-accent hover:underline" @click="loadStats">Qayta urinish</button>
        </div>
      </div>

      <template v-if="stats">
        <!-- KPI cards -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard :value="fmtNum(users.total ?? 0)" label="Foydalanuvchilar" tone="accent" :icon="ICONS.users"
            :sub="`${fmtNum((users.new_7d ?? users.new_last_7d) ?? 0)} yangi · 7 kun`" :trend="(users.new_7d ?? users.new_last_7d) != null ? `+${fmtNum((users.new_7d ?? users.new_last_7d))}` : ''" />
          <StatCard :value="fmtNum(jobs.active ?? 0)" label="Faol vakansiyalar" tone="good" :icon="ICONS.jobs"
            :sub="`${fmtNum(jobs.pending_review ?? 0)} koʻrib chiqilmoqda`" />
          <StatCard :value="fmtNum(apps.total ?? 0)" label="Arizalar" tone="info" :icon="ICONS.apps"
            :sub="`${fmtNum((apps.new_7d ?? apps.new_last_7d) ?? 0)} yangi · 7 kun`" :trend="(apps.new_7d ?? apps.new_last_7d) != null ? `+${fmtNum((apps.new_7d ?? apps.new_last_7d))}` : ''" trendTone="info" />
          <StatCard :value="som(subs.mrr ?? 0)" label="Oylik daromad (MRR)" tone="ai" :icon="ICONS.money"
            :sub="`${som(subs.revenue_total ?? 0)} jami · ${fmtNum(subs.active_count ?? 0)} obuna`" />
          <StatCard :value="fmtNum(companies.total ?? 0)" label="Kompaniyalar" tone="warn" :icon="ICONS.company"
            :sub="`${fmtNum(companies.verified ?? 0)} tasdiqlangan`" />
          <StatCard :value="fmtNum(talent.available_count ?? 0)" label="Mavjud mutaxassislar" tone="neutral" :icon="ICONS.talent"
            sub="ish qidirmoqda" />
        </div>

        <!-- Growth + roles -->
        <div class="grid gap-4 lg:grid-cols-3">
          <section class="lg:col-span-2 rounded-2xl border border-line bg-surface p-5">
            <h3 class="font-medium text-ink mb-3">Oʻsish · soʻnggi 30 kun</h3>
            <TrendChart v-if="hasTrend" :series="trendSeries" :labels="trendLabels" />
            <div v-else class="py-14 text-center text-sm text-ink-3">Vaqt qatori maʼlumotlari yoʻq</div>
          </section>
          <section class="rounded-2xl border border-line bg-surface p-5">
            <h3 class="font-medium text-ink mb-3">Foydalanuvchilar tarkibi</h3>
            <DonutChart :segments="roleSegments" center-label="jami foydalanuvchi" />
          </section>
        </div>

        <!-- Funnel + jobs/apps breakdown -->
        <div class="grid gap-4 lg:grid-cols-3">
          <section class="lg:col-span-2 rounded-2xl border border-line bg-surface p-5">
            <h3 class="font-medium text-ink mb-4">Ariza voronkasi</h3>
            <FunnelBars v-if="hasFunnel" :stages="funnelStages" />
            <div v-else class="py-14 text-center text-sm text-ink-3">Voronka maʼlumotlari yoʻq</div>
          </section>
          <div class="space-y-4">
            <section class="rounded-2xl border border-line bg-surface p-5">
              <h3 class="font-medium text-ink mb-3">Vakansiyalar holati</h3>
              <BreakdownBars :items="jobStages" />
            </section>
            <section v-if="appStatusItems.length" class="rounded-2xl border border-line bg-surface p-5">
              <h3 class="font-medium text-ink mb-3">Arizalar holati</h3>
              <BreakdownBars :items="appStatusItems" />
            </section>
          </div>
        </div>
      </template>

      <!-- Moderation quick-links -->
      <div class="grid gap-4 sm:grid-cols-3">
        <RouterLink v-for="c in queues" :key="c.key" :to="c.to"
          class="rounded-2xl border border-line bg-surface p-5 hover:border-accent/40 hover:shadow-sm transition-all">
          <div class="flex items-center justify-between">
            <span class="h-10 w-10 rounded-xl flex items-center justify-center" :class="TONE[c.tone]">
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path :d="c.icon" /></svg>
            </span>
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-ink-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </div>
          <div class="mt-3 font-serif-display text-3xl text-ink">{{ fmtNum(c.count ?? 0) }}</div>
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
