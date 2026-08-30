<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { CommerceApi, StatsApi, toApiError } from '@/lib/api';
import { useCursorList } from '@/lib/useCursorList';
import { useQuerySync } from '@/lib/useQuerySync';
import { label, planFeature, fmtDate, fmtDateTime, fmtNum, som, somFull, chartColor } from '@/lib/format';
import { exportCsv } from '@/lib/csv';
import { toastOk } from '@/lib/toast';
import PageHeader from '@/components/PageHeader.vue';
import SectionCard from '@/components/SectionCard.vue';
import DataState from '@/components/DataState.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import StatCard from '@/components/StatCard.vue';
import LoadMore from '@/components/LoadMore.vue';
import BarChart from '@/components/charts/BarChart.vue';
import Icon from '@/components/Icon.vue';

const tab = ref('subscriptions');
const tabs = [
  { value: 'subscriptions', label: 'Obunalar' },
  { value: 'payments', label: 'Toʻlovlar' },
  { value: 'plans', label: 'Tariflar' },
];

// ─── Revenue summary (from /admin/stats.subscriptions) ───
const summary = ref(null);
async function loadSummary() {
  try {
    const s = await StatsApi.get();
    summary.value = s?.subscriptions || null;
  } catch {
    summary.value = null;
  }
}

// ─── Lists ───
const subs = useCursorList((params) => CommerceApi.subscriptions(params));
const pays = useCursorList((params) => CommerceApi.payments(params));

const subStatus = ref('all');
const payStatus = ref('all');
const payProvider = ref('all');

const subStatusTabs = [
  { value: 'all', label: 'Barchasi' },
  { value: 'active', label: label('active') },
  { value: 'trialing', label: label('trialing') },
  { value: 'past_due', label: label('past_due') },
  { value: 'canceled', label: label('canceled') },
];
const payStatusTabs = [
  { value: 'all', label: 'Barchasi' },
  { value: 'success', label: label('success') },
  { value: 'pending', label: label('pending') },
  { value: 'failed', label: label('failed') },
  { value: 'refunded', label: label('refunded') },
];
const providerTabs = [
  { value: 'all', label: 'Barcha usullar' },
  { value: 'payme', label: 'Payme' },
  { value: 'click', label: 'Click' },
  { value: 'uzum', label: 'Uzum' },
];

function reloadSubs() {
  const params = {};
  if (subStatus.value !== 'all') params.status = subStatus.value;
  subs.load(params);
}
function reloadPays() {
  const params = {};
  if (payStatus.value !== 'all') params.status = payStatus.value;
  if (payProvider.value !== 'all') params.provider = payProvider.value;
  pays.load(params);
}
watch(subStatus, reloadSubs);
watch([payStatus, payProvider], reloadPays);

// ─── Plans ───
const plans = ref([]);
const plansLoading = ref(false);
const plansError = ref(null);
async function loadPlans() {
  plansLoading.value = true;
  plansError.value = null;
  try {
    const res = await CommerceApi.plans();
    plans.value = Array.isArray(res) ? res : res?.data ?? [];
  } catch (e) {
    plansError.value = toApiError(e, 'Tariflar yuklanmadi').message;
  } finally {
    plansLoading.value = false;
  }
}

// lazy-load each tab's data on first visit
const loaded = { subscriptions: false, payments: false, plans: false };
useQuerySync({ tab, subStatus, payStatus, payProvider }, { tab: 'subscriptions', subStatus: 'all', payStatus: 'all', payProvider: 'all' });
watch(tab, (t) => {
  if (loaded[t]) return;
  loaded[t] = true;
  if (t === 'subscriptions') reloadSubs();
  else if (t === 'payments') reloadPays();
  else if (t === 'plans') loadPlans();
}, { immediate: true });

onMounted(loadSummary);

// helpers — field names follow the admin resources
// (SubscriptionAdminResource / PaymentAdminResource / PlanAdminResource).
const userOf = (r) => r?.user?.email || r?.user?.phone || r?.user_email || r?.email || '—';
const planOf = (r) => r?.plan?.name || r?.plan_name || r?.plan?.title || (typeof r?.plan === 'string' ? r.plan : '—');
// Payments carry their own `amount`; subscriptions do not — the charge is the
// plan price for the subscription's billing period.
const payAmount = (r) => (r?.amount ?? null);
const subAmount = (r) => {
  const plan = r?.plan;
  if (!plan) return null;
  return (r?.billing_period === 'yearly' ? plan.price_yearly_uzs : plan.price_monthly_uzs) ?? null;
};
const planMonthly = (p) => (p?.price_monthly_uzs ?? null);
const planYearly = (p) => (p?.price_yearly_uzs ?? null);
const planName = (p) => p?.name || p?.name_uz || p?.code || '—';
// Only the explicit *_free codes are genuinely free. `emp_enterprise` carries
// no public price (0 in the DB, null in some payloads) because it is sold by
// negotiation — showing it as "Bepul" was telling readers the opposite.
const isFreePlan = (p) => /(^|_)free$/i.test(String(p?.code ?? ''));
const planPriceText = (p) => (isFreePlan(p) ? 'Bepul' : 'Kelishuv asosida');

const summaryCards = computed(() => {
  const s = summary.value;
  if (!s) return [];
  return [
    { value: som(s.mrr ?? 0), label: 'Oylik daromad (MRR)', tone: 'info', icon: 'money',
      sub: 'faol, pullik obunalar boʻyicha' },
    { value: som(s.revenue_total ?? 0), label: 'Jami daromad', tone: 'good', icon: 'chart',
      sub: 'muvaffaqiyatli toʻlovlar yigʻindisi' },
    { value: fmtNum(s.active_count ?? 0), label: 'Faol obunalar', tone: 'accent', icon: 'shield',
      sub: 'sinov muddatidagilar bilan' },
  ];
});

// ─── Revenue by month ───
// Bucketed from the payments already loaded, so it needs no extra endpoint. It
// grows as more pages are pulled in — the caption says so rather than passing
// a partial sum off as the full history.
const MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];
const revenueBars = computed(() => {
  const rows = pays.items.value.filter((p) => ['success', 'succeeded', 'paid'].includes(p.status));
  if (!rows.length) return [];
  const buckets = new Map();
  for (const p of rows) {
    const d = new Date(p.paid_at || p.created_at);
    if (isNaN(d)) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
    const prev = buckets.get(key) || { value: 0, d };
    prev.value += p.amount ?? 0;
    buckets.set(key, prev);
  }
  return [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-12)
    .map(([, v]) => ({
      label: MONTHS[v.d.getMonth()],
      value: v.value,
      hint: `${MONTHS[v.d.getMonth()]} ${v.d.getFullYear()}`,
    }));
});
const accent = computed(() => chartColor('good'));

function exportSubs() {
  exportCsv(
    'mohirlar-obunalar',
    [
      { label: 'Foydalanuvchi', get: userOf },
      { label: 'Tarif', get: planOf },
      { label: 'Davr', get: (r) => label(r.billing_period) },
      { label: 'Holat', get: (r) => label(r.status) },
      { label: 'Summa', get: (r) => subAmount(r) ?? '' },
      { label: 'Qoʻlda berilgan', get: (r) => (r.granted_by_admin ? 'ha' : 'yoʻq') },
      { label: 'Tugash sanasi', get: (r) => fmtDate(r.ends_at) },
    ],
    subs.items.value,
  );
  toastOk(`${subs.items.value.length} ta yozuv yuklab olindi`);
}
function exportPays() {
  exportCsv(
    'mohirlar-tolovlar',
    [
      { label: 'Foydalanuvchi', get: userOf },
      { label: 'Usul', key: 'provider' },
      { label: 'Holat', get: (r) => label(r.status) },
      { label: 'Summa', key: 'amount' },
      { label: 'Tranzaksiya', key: 'provider_transaction_id' },
      { label: 'Sana', get: (r) => fmtDateTime(r.paid_at || r.created_at) },
    ],
    pays.items.value,
  );
  toastOk(`${pays.items.value.length} ta yozuv yuklab olindi`);
}

const plansByAudience = computed(() => {
  const groups = { candidate: [], employer: [] };
  for (const p of plans.value) (groups[p.audience] ||= []).push(p);
  return Object.entries(groups).filter(([, v]) => v.length);
});
</script>

<template>
  <div class="space-y-5">
    <PageHeader
      description="Daromad koʻrsatkichlari, obunalar va toʻlov tarixi. Qoʻlda berilgan tariflar MRR hisobiga kirmaydi."
    />

    <!-- Revenue summary -->
    <div v-if="summaryCards.length" class="grid gap-4 sm:grid-cols-3">
      <StatCard v-for="c in summaryCards" :key="c.label" v-bind="c" />
    </div>

    <FilterTabs v-model="tab" :options="tabs" />

    <!-- ─── Subscriptions ─── -->
    <div v-if="tab === 'subscriptions'" class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <FilterTabs v-model="subStatus" :options="subStatusTabs" size="sm" />
        <button class="btn btn-neutral btn-sm" :disabled="!subs.items.value.length" @click="exportSubs">
          <Icon name="download" :size="15" /> CSV
        </button>
      </div>

      <DataState
        :loading="subs.loading.value" :error="subs.error.value"
        :empty="!subs.items.value.length" empty-text="Obunalar topilmadi"
        empty-icon="card" @retry="reloadSubs"
      >
        <div class="card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="tbl min-w-[640px]">
              <thead>
                <tr>
                  <th>Foydalanuvchi</th>
                  <th>Tarif</th>
                  <th>Holat</th>
                  <th class="text-right">Summa</th>
                  <th class="hidden md:table-cell">Tugash sanasi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in subs.items.value" :key="r.id">
                  <td class="font-medium text-ink">{{ userOf(r) }}</td>
                  <td class="text-ink-2">
                    {{ planOf(r) }}
                    <span v-if="r.billing_period" class="text-xs text-ink-3">· {{ label(r.billing_period) }}</span>
                    <span v-if="r.granted_by_admin" class="ml-1 text-xs text-ink-4" title="Administrator qoʻlda bergan — MRR ga kirmaydi">· qoʻlda</span>
                  </td>
                  <td><StatusBadge :value="r.status" size="sm" /></td>
                  <td class="text-right text-ink tabular-nums">
                    {{ subAmount(r) != null ? somFull(subAmount(r)) : '—' }}
                  </td>
                  <td class="hidden text-ink-3 md:table-cell">{{ fmtDate(r.ends_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <LoadMore
          :has-more="!!subs.nextCursor.value" :loading="subs.loadingMore.value"
          :count="subs.items.value.length" @more="subs.loadMore()"
        />
      </DataState>
    </div>

    <!-- ─── Payments ─── -->
    <div v-else-if="tab === 'payments'" class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap gap-x-5 gap-y-2">
          <FilterTabs v-model="payStatus" :options="payStatusTabs" size="sm" />
          <FilterTabs v-model="payProvider" :options="providerTabs" size="sm" />
        </div>
        <button class="btn btn-neutral btn-sm" :disabled="!pays.items.value.length" @click="exportPays">
          <Icon name="download" :size="15" /> CSV
        </button>
      </div>

      <SectionCard
        v-if="revenueBars.length > 1"
        title="Oylar boʻyicha tushum"
        hint="Yuklangan toʻlovlar asosida — pastdagi roʻyxatni davom ettirsangiz kengayadi"
      >
        <BarChart :bars="revenueBars" :color="accent" :formatter="somFull" />
      </SectionCard>

      <DataState
        :loading="pays.loading.value" :error="pays.error.value"
        :empty="!pays.items.value.length" empty-text="Toʻlovlar topilmadi"
        empty-icon="money" @retry="reloadPays"
      >
        <div class="card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="tbl min-w-[680px]">
              <thead>
                <tr>
                  <th>Foydalanuvchi</th>
                  <th class="hidden sm:table-cell">Usul</th>
                  <th>Holat</th>
                  <th class="text-right">Summa</th>
                  <th>Sana</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in pays.items.value" :key="r.id">
                  <td class="font-medium text-ink">{{ userOf(r) }}</td>
                  <td class="hidden capitalize sm:table-cell text-ink-2">{{ r.provider || '—' }}</td>
                  <td><StatusBadge :value="r.status" size="sm" /></td>
                  <td class="text-right text-ink tabular-nums">{{ payAmount(r) != null ? somFull(payAmount(r)) : '—' }}</td>
                  <td class="whitespace-nowrap text-ink-3">{{ fmtDateTime(r.paid_at || r.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <LoadMore
          :has-more="!!pays.nextCursor.value" :loading="pays.loadingMore.value"
          :count="pays.items.value.length" @more="pays.loadMore()"
        />
      </DataState>
    </div>

    <!-- ─── Plans ─── -->
    <div v-else class="space-y-6">
      <DataState
        :loading="plansLoading" :error="plansError"
        :empty="!plans.length" empty-text="Tariflar topilmadi"
        empty-icon="card" skeleton="cards" @retry="loadPlans"
      >
        <section v-for="[audience, group] in plansByAudience" :key="audience" class="space-y-3">
          <h3 class="text-sm font-semibold text-ink-2">
            {{ label(audience) }} tariflari
            <span class="ml-1 font-normal text-ink-4">({{ group.length }})</span>
          </h3>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="p in group" :key="p.id || planName(p)" class="card flex flex-col p-5">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h4 class="font-semibold text-ink">{{ planName(p) }}</h4>
                  <code class="text-[11px] text-ink-4">{{ p.code }}</code>
                </div>
                <StatusBadge v-if="p.is_public === false" text="Nofaol" tone="neutral" size="sm" />
              </div>

              <div class="mt-3 font-serif-display text-ink" :class="planMonthly(p) ? 'text-2xl' : 'text-xl'">
                {{ planMonthly(p) ? somFull(planMonthly(p)) : planPriceText(p) }}
                <span v-if="planMonthly(p)" class="font-sans text-sm text-ink-3">/ {{ label('monthly') }}</span>
              </div>
              <div v-if="planYearly(p)" class="mt-0.5 text-sm text-ink-3">
                {{ somFull(planYearly(p)) }} / {{ label('yearly') }}
              </div>

              <div v-if="p.subscriptions_count != null" class="mt-2">
                <span class="chip py-0.5 text-[11px]">{{ fmtNum(p.subscriptions_count) }} obuna</span>
              </div>

              <ul v-if="Array.isArray(p.features) && p.features.length" class="mt-4 space-y-1.5 text-sm text-ink-2">
                <li v-for="(f, i) in p.features" :key="i" class="flex items-start gap-2">
                  <Icon name="check" :size="15" :stroke="2.2" class="mt-0.5 shrink-0 text-good" />
                  {{ planFeature(f) }}
                </li>
              </ul>
              <p v-else-if="p.description" class="mt-4 text-sm text-ink-3">{{ p.description }}</p>
            </div>
          </div>
        </section>
      </DataState>
    </div>
  </div>
</template>
