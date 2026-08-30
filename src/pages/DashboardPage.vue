<script setup>
import { ref, computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { StatsApi, AuditApi, toApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useModerationStore } from '@/stores/moderation';
import {
  auditLabel, auditTone, label, tone, targetLabel, timeAgo, fmtNum, som, somFull,
  fmtLongDay, fmtTime, delta, chartColor, USER_ROLES,
} from '@/lib/format';
import { readPref, writePref } from '@/lib/prefs';
import PageHeader from '@/components/PageHeader.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatCard from '@/components/StatCard.vue';
import Skeleton from '@/components/Skeleton.vue';
import EmptyState from '@/components/EmptyState.vue';
import Spinner from '@/components/Spinner.vue';
import Icon from '@/components/Icon.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import TrendChart from '@/components/charts/TrendChart.vue';
import DonutChart from '@/components/charts/DonutChart.vue';
import FunnelBars from '@/components/charts/FunnelBars.vue';
import BreakdownBars from '@/components/charts/BreakdownBars.vue';

const auth = useAuthStore();
const moderation = useModerationStore();

const loading = ref(true);
const refreshing = ref(false);
const stats = ref(null);
const statsError = ref(null);
const recent = ref([]);
const fetchedAt = ref(null);

// The 30-day series is always fetched; the range only decides how much of it
// is drawn. Switching is instant and costs no request.
const RANGES = [
  { value: '7', label: '7 kun' },
  { value: '14', label: '14 kun' },
  { value: '30', label: '30 kun' },
];
const range = ref(String(readPref('dashboard.range', '30')));
function setRange(v) {
  range.value = v;
  writePref('dashboard.range', v);
}

async function load({ silent = false } = {}) {
  if (silent) refreshing.value = true;
  statsError.value = null;
  const [s] = await Promise.allSettled([
    StatsApi.get(),
    AuditApi.list({}).then((res) => { recent.value = (res?.data ?? []).slice(0, 8); }).catch(() => {}),
    moderation.refresh({ force: true }),
  ]);
  if (s.status === 'fulfilled') {
    stats.value = s.value;
    fetchedAt.value = new Date();
  } else {
    statsError.value = toApiError(s.reason, 'Statistika hozircha mavjud emas').message;
    stats.value = null;
  }
  loading.value = false;
  refreshing.value = false;
}

onMounted(() => load());

// ─── Derived views (all defensive: a field the API stops sending must not
//     take the page down with it) ───
const s = computed(() => stats.value || {});
const users = computed(() => s.value.users || {});
const jobs = computed(() => s.value.jobs || {});
const apps = computed(() => s.value.applications || {});
const companies = computed(() => s.value.companies || {});
const subs = computed(() => s.value.subscriptions || {});
const talent = computed(() => s.value.talent || {});
const funnel = computed(() => s.value.funnel || {});
const ts = computed(() => s.value.timeseries || {});

const signups = computed(() => (ts.value.signups_30d || []).map((p) => p.count ?? 0));
const applications = computed(() => (ts.value.applications_30d || []).map((p) => p.count ?? 0));
const days = computed(() => Number(range.value) || 30);
const tail = (arr) => arr.slice(-days.value);

/** Sum of the last `n` values ending `offset` buckets from the end. */
function window7(arr, offset = 0) {
  const end = arr.length - offset;
  if (end < 7) return null;
  return arr.slice(Math.max(0, end - 7), end).reduce((a, b) => a + b, 0);
}
const signupDelta = computed(() => delta(window7(signups.value), window7(signups.value, 7)));
const appDelta = computed(() => delta(window7(applications.value), window7(applications.value, 7)));

const trendSeries = computed(() => {
  const out = [];
  if (signups.value.length) out.push({ label: 'Roʻyxatdan oʻtishlar', color: chartColor('accent'), data: tail(signups.value) });
  if (applications.value.length) out.push({ label: 'Arizalar', color: chartColor('ai'), data: tail(applications.value) });
  return out;
});
const trendLabels = computed(() => {
  const src = ts.value.signups_30d?.length ? ts.value.signups_30d : ts.value.applications_30d || [];
  return tail(src).map((p) => p.date);
});
const hasTrend = computed(() => trendSeries.value.some((se) => se.data.length));
const trendTotal = computed(() =>
  trendSeries.value.map((se) => ({ label: se.label, value: se.data.reduce((a, b) => a + b, 0), color: se.color })),
);

const byRole = computed(() => users.value.by_role ?? users.value);
// Older payloads pluralise the role at the top level (`users.candidates`).
const ROLE_LEGACY_KEY = { candidate: 'candidates', employer: 'employers', moderator: 'moderators', admin: 'admins' };
// Colour by the role's tone, so a donut slice matches that role's StatusBadge.
const roleSegments = computed(() =>
  USER_ROLES.map((role) => ({
    label: label(role),
    value: byRole.value[role] ?? users.value[ROLE_LEGACY_KEY[role]] ?? 0,
    color: chartColor(tone(role)),
  })),
);

const funnelStages = computed(() => {
  const f = funnel.value;
  const rows = [
    { key: 'job_views', label: 'Vakansiya koʻrishlari', color: chartColor('accent') },
    { key: 'applications_total', label: 'Arizalar', color: chartColor('info') },
    { key: 'shortlisted', label: 'Qisqa roʻyxat', color: chartColor('warn') },
    { key: 'interview', label: 'Suhbat', color: chartColor('ai') },
    { key: 'hired', label: 'Ishga olindi', color: chartColor('good') },
  ];
  return rows.filter((r) => f[r.key] != null).map((r) => ({ label: r.label, value: f[r.key], color: r.color }));
});
const hasFunnel = computed(() => funnelStages.value.length > 0);

// Both breakdowns colour a status through the same tone map the badges use, so
// a bar can never disagree with the badge for that status — and the colour no
// longer depends on the order the API happens to send the keys in.
const JOB_STAGES = ['active', 'pending_review', 'draft', 'paused', 'closed', 'rejected'];
const jobStages = computed(() =>
  JOB_STAGES
    .map((k) => ({ label: label(k), value: jobs.value[k] ?? 0, color: chartColor(tone(k)) }))
    .filter((r) => r.value > 0),
);

const appStatusItems = computed(() =>
  Object.entries(apps.value.by_status || {})
    .filter(([, v]) => (v ?? 0) > 0)
    .map(([k, v]) => ({ label: label(k), value: v ?? 0, color: chartColor(tone(k)) })),
);

// ─── Moderation queues ───
const queues = computed(() => [
  {
    key: 'jobs', title: 'Koʻrib chiqilayotgan vakansiyalar', hint: 'Tasdiqlashni kutmoqda',
    count: moderation.counts.pending_jobs, to: { name: 'jobs' }, tone: 'warn', icon: 'briefcase',
  },
  {
    key: 'verifications', title: 'Kutilayotgan tasdiqlashlar', hint: 'Hujjatlar tekshiruvi',
    count: moderation.counts.pending_verifications, to: { name: 'verifications' }, tone: 'info', icon: 'shield',
  },
  {
    key: 'reports', title: 'Ochiq shikoyatlar', hint: 'Foydalanuvchi murojaatlari',
    count: moderation.counts.open_reports, to: { name: 'reports' }, tone: 'danger', icon: 'flag',
  },
]);
const TONE = {
  warn: 'bg-warn-soft text-warn-ink',
  info: 'bg-info-soft text-info-ink',
  danger: 'bg-danger-soft text-danger-ink',
};
const LOG_TONE = {
  good: 'bg-good-soft text-good-ink',
  danger: 'bg-danger-soft text-danger-ink',
  ai: 'bg-ai-soft text-ai-ink',
  info: 'bg-info-soft text-info-ink',
};
const LOG_ICON = { good: 'check', danger: 'close', ai: 'star', info: 'edit' };

const greeting = computed(() => {
  const name = auth.user?.email ? auth.user.email.split('@')[0] : '';
  return `Assalomu alaykum${name ? ', ' + name : ''}`;
});
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="greeting" :description="`${fmtLongDay()} · platforma koʻrsatkichlari va moderatsiya navbatlari`">
      <template #actions>
        <FilterTabs :model-value="range" :options="RANGES" size="sm" @update:model-value="setRange" />
        <button class="icon-btn" title="Yangilash" :disabled="refreshing" @click="load({ silent: true })">
          <Spinner v-if="refreshing" :size="16" />
          <Icon v-else name="refresh" :size="17" />
        </button>
      </template>
      <template #meta>
        <p v-if="fetchedAt" class="mt-1 text-xs text-ink-4">Yangilangan: {{ fmtTime(fetchedAt) }}</p>
      </template>
    </PageHeader>

    <template v-if="loading">
      <Skeleton variant="stats" :rows="6" />
      <div class="grid gap-4 lg:grid-cols-3">
        <div class="card p-5 lg:col-span-2"><Skeleton variant="chart" /></div>
        <div class="card p-5"><Skeleton variant="list" :rows="4" /></div>
      </div>
    </template>

    <template v-else>
      <!-- Stats unavailable -->
      <div v-if="statsError" class="card">
        <EmptyState
          icon="alert"
          tone="danger"
          title="Statistikani yuklab boʻlmadi"
          :hint="statsError"
          action-label="Qayta urinish"
          @action="load({ silent: true })"
        />
      </div>

      <template v-if="stats">
        <!-- ─── KPI ─── -->
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            :value="fmtNum(users.total ?? 0)" label="Foydalanuvchilar" tone="accent" icon="users"
            :sub="`${fmtNum(users.new_last_7d ?? users.new_7d ?? 0)} ta yangi · 7 kun`"
            :spark="signups" :delta="signupDelta" :to="{ name: 'users' }"
          />
          <StatCard
            :value="fmtNum(jobs.active ?? 0)" label="Faol vakansiyalar" tone="good" icon="briefcase"
            :sub="`${fmtNum(jobs.pending_review ?? 0)} ta koʻrib chiqilmoqda · ${fmtNum(jobs.total ?? 0)} jami`"
            :to="{ name: 'jobs', query: { status: 'active' } }"
          />
          <StatCard
            :value="fmtNum(apps.total ?? 0)" label="Arizalar" tone="ai" icon="file"
            :sub="`${fmtNum(apps.new_last_7d ?? apps.new_7d ?? 0)} ta yangi · 7 kun`"
            :spark="applications" :delta="appDelta"
          />
          <StatCard
            :value="som(subs.mrr ?? 0)" label="Oylik daromad (MRR)" tone="info" icon="money"
            :sub="`${somFull(subs.revenue_total ?? 0)} jami · ${fmtNum(subs.active_count ?? 0)} ta obuna`"
            :to="auth.isAdmin ? { name: 'commerce' } : null"
          />
          <StatCard
            :value="fmtNum(companies.total ?? 0)" label="Kompaniyalar" tone="warn" icon="building"
            :sub="`${fmtNum(companies.verified ?? 0)} ta tasdiqlangan`"
            :to="auth.isAdmin ? { name: 'companies' } : null"
          />
          <StatCard
            :value="fmtNum(talent.available_count ?? 0)" label="Ish qidirayotgan mutaxassislar" tone="neutral" icon="star"
            sub="faol yoki takliflarga ochiq"
          />
        </div>

        <!-- ─── Growth + roles ─── -->
        <div class="grid gap-4 lg:grid-cols-3">
          <SectionCard class="lg:col-span-2" :title="`Oʻsish · soʻnggi ${days} kun`">
            <template #actions>
              <span v-for="t in trendTotal" :key="t.label" class="text-xs text-ink-3">
                <span class="font-semibold" :style="{ color: t.color }">{{ fmtNum(t.value) }}</span>
                {{ t.label.toLowerCase() }}
              </span>
            </template>
            <TrendChart v-if="hasTrend" :series="trendSeries" :labels="trendLabels" />
            <p v-else class="py-14 text-center text-sm text-ink-3">Vaqt qatori maʼlumotlari yoʻq</p>
          </SectionCard>

          <SectionCard title="Foydalanuvchilar tarkibi">
            <DonutChart :segments="roleSegments" center-label="jami" />
          </SectionCard>
        </div>

        <!-- ─── Funnel + breakdowns ─── -->
        <div class="grid gap-4 lg:grid-cols-3">
          <SectionCard class="lg:col-span-2" title="Ariza voronkasi" hint="Har bosqichda oldingisiga nisbatan qancha qolgani">
            <FunnelBars v-if="hasFunnel" :stages="funnelStages" />
            <p v-else class="py-14 text-center text-sm text-ink-3">Voronka maʼlumotlari yoʻq</p>
          </SectionCard>

          <div class="space-y-4">
            <SectionCard v-if="jobStages.length" title="Vakansiyalar holati">
              <BreakdownBars :items="jobStages" />
            </SectionCard>
            <SectionCard v-if="appStatusItems.length" title="Arizalar holati">
              <BreakdownBars :items="appStatusItems" />
            </SectionCard>
          </div>
        </div>
      </template>

      <!-- ─── Moderation queues ─── -->
      <div class="grid gap-4 sm:grid-cols-3">
        <RouterLink v-for="c in queues" :key="c.key" :to="c.to" class="card card-hover p-5">
          <div class="flex items-center justify-between">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl" :class="TONE[c.tone]">
              <Icon :name="c.icon" :size="19" />
            </span>
            <Icon name="right" :size="16" class="text-ink-4" />
          </div>
          <div class="mt-3.5 font-serif-display text-[30px] leading-none" :class="c.count ? 'text-ink' : 'text-ink-4'">
            {{ fmtNum(c.count ?? 0) }}
          </div>
          <div class="mt-2 text-sm font-medium text-ink-2">{{ c.title }}</div>
          <div class="mt-0.5 text-xs text-ink-3">{{ c.count ? c.hint : 'Navbat boʻsh' }}</div>
        </RouterLink>
      </div>

      <!-- ─── Recent activity ─── -->
      <SectionCard title="Soʻnggi amallar" flush>
        <template #actions>
          <RouterLink :to="{ name: 'audit' }" class="link text-sm">Audit jurnali →</RouterLink>
        </template>
        <ul v-if="recent.length" class="divide-y divide-line-2">
          <li v-for="log in recent" :key="log.id" class="flex items-center gap-3 px-5 py-3">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" :class="LOG_TONE[auditTone(log.action)]">
              <Icon :name="LOG_ICON[auditTone(log.action)]" :size="14" :stroke="2.2" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-medium text-ink">{{ auditLabel(log.action) }}</div>
              <div class="truncate text-xs text-ink-3">
                {{ log.actor ? label(log.actor.role) : 'Tizim' }}
                · {{ targetLabel(log.target_type) }}<span v-if="log.target_id"> #{{ log.target_id }}</span>
              </div>
            </div>
            <span class="shrink-0 text-xs text-ink-4">{{ timeAgo(log.created_at) }}</span>
          </li>
        </ul>
        <p v-else class="px-5 py-10 text-center text-sm text-ink-3">Hozircha amallar yoʻq</p>
      </SectionCard>
    </template>
  </div>
</template>
