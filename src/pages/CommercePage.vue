<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { CommerceApi, StatsApi, toApiError } from '@/lib/api';
import { useCursorList } from '@/lib/useCursorList';
import { label, fmtDate, fmtDateTime, fmtNum, som, somFull } from '@/lib/format';
import DataState from '@/components/DataState.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import StatCard from '@/components/StatCard.vue';
import UiKit from '@/components/UiKit.vue';

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
const subStatusTabs = [
  { value: 'all', label: 'Barchasi' },
  { value: 'active', label: label('active') },
  { value: 'trialing', label: label('trialing') },
  { value: 'past_due', label: label('past_due') },
  { value: 'canceled', label: label('canceled') },
];

function reloadSubs() {
  const params = {};
  if (subStatus.value !== 'all') params.status = subStatus.value;
  subs.load(params);
}
watch(subStatus, reloadSubs);

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
watch(tab, (t) => {
  if (loaded[t]) return;
  loaded[t] = true;
  if (t === 'subscriptions') reloadSubs();
  else if (t === 'payments') pays.load({});
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

const summaryCards = computed(() => {
  const s = summary.value;
  if (!s) return [];
  return [
    { value: som(s.mrr ?? 0), label: 'Oylik daromad (MRR)', tone: 'ai',
      icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
    { value: som(s.revenue_total ?? 0), label: 'Jami daromad', tone: 'good',
      icon: 'M3 3v18h18M7 15l3-3 3 3 5-6' },
    { value: fmtNum(s.active_count ?? 0), label: 'Faol obunalar', tone: 'accent',
      icon: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4' },
  ];
});
</script>

<template>
  <div class="space-y-5">
    <!-- Revenue summary -->
    <div v-if="summaryCards.length" class="grid gap-4 sm:grid-cols-3">
      <StatCard v-for="c in summaryCards" :key="c.label" :value="c.value" :label="c.label" :tone="c.tone" :icon="c.icon" />
    </div>

    <FilterTabs v-model="tab" :options="tabs" />

    <!-- Subscriptions -->
    <div v-if="tab === 'subscriptions'" class="space-y-4">
      <FilterTabs v-model="subStatus" :options="subStatusTabs" />
      <DataState :loading="subs.loading.value" :error="subs.error.value"
        :empty="!subs.items.value.length" empty-text="Obunalar topilmadi" @retry="reloadSubs">
        <div class="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table class="w-full text-sm min-w-[560px]">
            <thead class="bg-elev/60 text-ink-3 text-xs uppercase tracking-wide">
              <tr>
                <th class="text-left font-semibold px-4 py-3">Foydalanuvchi</th>
                <th class="text-left font-semibold px-4 py-3">Tarif</th>
                <th class="text-left font-semibold px-4 py-3">Holat</th>
                <th class="text-right font-semibold px-4 py-3">Summa</th>
                <th class="text-left font-semibold px-4 py-3 hidden md:table-cell">Tugash sanasi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="r in subs.items.value" :key="r.id" class="hover:bg-elev/40">
                <td class="px-4 py-3 font-medium text-ink">{{ userOf(r) }}</td>
                <td class="px-4 py-3 text-ink-2">
                  {{ planOf(r) }}
                  <span v-if="r.billing_period" class="text-xs text-ink-3">· {{ label(r.billing_period) }}</span>
                </td>
                <td class="px-4 py-3"><StatusBadge :value="r.status" /></td>
                <td class="px-4 py-3 text-right text-ink tabular-nums">{{ subAmount(r) != null ? somFull(subAmount(r)) : '—' }}</td>
                <td class="px-4 py-3 hidden md:table-cell text-ink-3">{{ fmtDate(r.ends_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="subs.nextCursor.value" class="mt-4 flex justify-center">
          <button class="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-medium hover:bg-elev disabled:opacity-50"
            :disabled="subs.loadingMore.value" @click="subs.loadMore()">
            <UiKit v-if="subs.loadingMore.value" class="!h-4 !w-4" /> Koʻproq yuklash
          </button>
        </div>
      </DataState>
    </div>

    <!-- Payments -->
    <div v-else-if="tab === 'payments'" class="space-y-4">
      <DataState :loading="pays.loading.value" :error="pays.error.value"
        :empty="!pays.items.value.length" empty-text="Toʻlovlar topilmadi" @retry="pays.load({})">
        <div class="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table class="w-full text-sm min-w-[560px]">
            <thead class="bg-elev/60 text-ink-3 text-xs uppercase tracking-wide">
              <tr>
                <th class="text-left font-semibold px-4 py-3">Foydalanuvchi</th>
                <th class="text-left font-semibold px-4 py-3 hidden sm:table-cell">Usul</th>
                <th class="text-left font-semibold px-4 py-3">Holat</th>
                <th class="text-right font-semibold px-4 py-3">Summa</th>
                <th class="text-left font-semibold px-4 py-3">Sana</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="r in pays.items.value" :key="r.id" class="hover:bg-elev/40">
                <td class="px-4 py-3 font-medium text-ink">{{ userOf(r) }}</td>
                <td class="px-4 py-3 hidden sm:table-cell text-ink-2">{{ r.provider || '—' }}</td>
                <td class="px-4 py-3"><StatusBadge :value="r.status" /></td>
                <td class="px-4 py-3 text-right text-ink tabular-nums">{{ payAmount(r) != null ? somFull(payAmount(r)) : '—' }}</td>
                <td class="px-4 py-3 text-ink-3 whitespace-nowrap">{{ fmtDateTime(r.paid_at || r.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="pays.nextCursor.value" class="mt-4 flex justify-center">
          <button class="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-medium hover:bg-elev disabled:opacity-50"
            :disabled="pays.loadingMore.value" @click="pays.loadMore()">
            <UiKit v-if="pays.loadingMore.value" class="!h-4 !w-4" /> Koʻproq yuklash
          </button>
        </div>
      </DataState>
    </div>

    <!-- Plans -->
    <div v-else class="space-y-4">
      <DataState :loading="plansLoading" :error="plansError"
        :empty="!plans.length" empty-text="Tariflar topilmadi" @retry="loadPlans">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="p in plans" :key="p.id || planName(p)" class="rounded-2xl border border-line bg-surface p-5">
            <div class="flex items-center justify-between gap-2">
              <h3 class="font-medium text-ink">{{ planName(p) }}</h3>
              <StatusBadge v-if="p.is_public === false" value="unverified" text="Nofaol" tone="neutral" />
            </div>
            <div class="mt-2 font-serif-display text-2xl text-ink">
              {{ planMonthly(p) != null ? somFull(planMonthly(p)) : '—' }}
              <span class="text-sm text-ink-3 font-sans">/ {{ label('monthly') }}</span>
            </div>
            <div v-if="planYearly(p)" class="mt-0.5 text-sm text-ink-3">
              {{ somFull(planYearly(p)) }} / {{ label('yearly') }}
            </div>
            <div v-if="p.subscriptions_count != null" class="mt-1 text-xs text-ink-4">
              {{ fmtNum(p.subscriptions_count) }} obuna
            </div>
            <ul v-if="Array.isArray(p.features) && p.features.length" class="mt-3 space-y-1.5 text-sm text-ink-2">
              <li v-for="(f, i) in p.features" :key="i" class="flex items-start gap-2">
                <svg viewBox="0 0 24 24" class="h-4 w-4 text-good mt-0.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                {{ typeof f === 'string' ? f : (f.label || f.name) }}
              </li>
            </ul>
            <p v-else-if="p.description" class="mt-3 text-sm text-ink-3">{{ p.description }}</p>
          </div>
        </div>
      </DataState>
    </div>
  </div>
</template>
