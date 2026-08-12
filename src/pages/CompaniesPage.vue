<script setup>
import { ref, watch, computed } from 'vue';
import { CompaniesApi, toApiError } from '@/lib/api';
import { useCursorList } from '@/lib/useCursorList';
import { fmtDate, fmtNum } from '@/lib/format';
import { toastOk, toastErr } from '@/lib/toast';
import DataState from '@/components/DataState.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import UiKit from '@/components/UiKit.vue';

const list = useCursorList((params) => CompaniesApi.list(params));

const verified = ref('all');
const q = ref('');
let searchTimer = null;

const verifiedTabs = [
  { value: 'all', label: 'Barchasi' },
  { value: 'true', label: 'Tasdiqlangan' },
  { value: 'false', label: 'Tasdiqlanmagan' },
];

function reload() {
  const params = {};
  if (verified.value !== 'all') params.verified = verified.value;
  if (q.value.trim()) params.q = q.value.trim();
  list.load(params);
}
watch(verified, reload, { immediate: true });
watch(q, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(reload, 350);
});

// tolerate different field names for the verified flag
function isVerified(c) {
  if (!c) return false;
  return c.verified ?? c.is_verified ?? !!c.verified_at;
}
function industryOf(c) {
  return c?.industry?.name || c?.industry_name || c?.industry || '—';
}
function locationOf(c) {
  return c?.city || c?.region?.name || c?.district?.name || c?.location || '';
}

// ─── Detail / actions ───
const selected = ref(null);
const loadingDetail = ref(false);
const acting = ref('');
const note = ref('');

async function open(c) {
  selected.value = c;
  note.value = '';
  loadingDetail.value = true;
  try {
    selected.value = await CompaniesApi.show(c.uuid || c.id);
  } catch {
    /* keep row data */
  } finally {
    loadingDetail.value = false;
  }
}
function close() {
  if (acting.value) return;
  selected.value = null;
}

function sync(updated) {
  selected.value = updated;
  const nowVerified = isVerified(updated);
  if (verified.value === 'true' && !nowVerified) list.remove(updated.id);
  else if (verified.value === 'false' && nowVerified) list.remove(updated.id);
  else list.patch(updated);
}

async function toggleVerify() {
  if (acting.value || !selected.value) return;
  const target = !isVerified(selected.value);
  acting.value = 'verify';
  try {
    const uuid = selected.value.uuid || selected.value.id;
    const body = note.value.trim() ? { note: note.value.trim(), reason: note.value.trim() } : undefined;
    const updated = target
      ? await CompaniesApi.verify(uuid, body)
      : await CompaniesApi.unverify(uuid, body);
    sync(updated);
    toastOk(target ? 'Kompaniya tasdiqlandi' : 'Tasdiq bekor qilindi');
    selected.value = null;
  } catch (e) {
    toastErr(toApiError(e, 'Xatolik').message);
  } finally {
    acting.value = '';
  }
}

const detailRows = computed(() => {
  const c = selected.value;
  if (!c) return [];
  // Keys match CompanyAdminResource (size_bucket is a range string like "11-50").
  return [
    ['Sanoat', industryOf(c)],
    ['Manzil', locationOf(c) || '—'],
    ['Veb-sayt', c.website || '—'],
    ['Xodimlar', c.size_bucket ? `${c.size_bucket} xodim` : '—'],
    ['Vakansiyalar', c.jobs_count != null ? fmtNum(c.jobs_count) : '—'],
    ['Obunachilar', c.followers_count != null ? fmtNum(c.followers_count) : '—'],
    ['Roʻyxatdan oʻtgan', fmtDate(c.created_at)],
  ];
});
</script>

<template>
  <div class="space-y-5">
    <div class="space-y-3">
      <div class="relative max-w-sm">
        <svg viewBox="0 0 24 24" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-4"
          fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
        </svg>
        <input v-model="q" type="search" placeholder="Kompaniya nomi boʻyicha qidirish"
          class="w-full h-10 rounded-xl border border-line bg-surface pl-9 pr-3 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15" />
      </div>
      <FilterTabs v-model="verified" :options="verifiedTabs" />
    </div>

    <DataState
      :loading="list.loading.value" :error="list.error.value"
      :empty="!list.items.value.length" empty-text="Kompaniyalar topilmadi" @retry="reload"
    >
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <button v-for="c in list.items.value" :key="c.id"
          class="text-left rounded-2xl border border-line bg-surface p-4 hover:border-accent/40 hover:shadow-sm transition-all"
          @click="open(c)">
          <div class="flex items-start gap-3">
            <span class="h-11 w-11 rounded-xl bg-accent-soft text-accent-ink flex items-center justify-center font-semibold text-lg shrink-0 overflow-hidden">
              <img v-if="c.logo_url" :src="c.logo_url" :alt="c.name" class="h-full w-full object-cover" />
              <template v-else>{{ (c.name?.[0] || 'K').toUpperCase() }}</template>
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <h3 class="font-medium text-ink leading-snug truncate">{{ c.name || '—' }}</h3>
                <svg v-if="isVerified(c)" viewBox="0 0 24 24" class="h-4 w-4 text-good shrink-0" fill="currentColor" title="Tasdiqlangan">
                  <path d="M12 2l2.4 1.8 3 .2.9 2.9 2.4 1.8-.9 2.9.9 2.9-2.4 1.8-.9 2.9-3 .2L12 22l-2.4-1.8-3-.2-.9-2.9L3.3 15.3l.9-2.9-.9-2.9 2.4-1.8.9-2.9 3-.2z" />
                  <path d="M9.5 12.5l1.8 1.8 3.5-3.8" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
              <div class="text-sm text-ink-3 truncate">{{ industryOf(c) }}</div>
            </div>
          </div>
          <div class="mt-3 flex items-center justify-between text-xs text-ink-3">
            <span class="truncate">{{ locationOf(c) || '—' }}</span>
            <span v-if="c.jobs_count != null" class="shrink-0">{{ fmtNum(c.jobs_count) }} vakansiya</span>
          </div>
        </button>
      </div>

      <div v-if="list.nextCursor.value" class="mt-4 flex justify-center">
        <button class="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-medium hover:bg-elev disabled:opacity-50"
          :disabled="list.loadingMore.value" @click="list.loadMore()">
          <UiKit v-if="list.loadingMore.value" class="!h-4 !w-4" /> Koʻproq yuklash
        </button>
      </div>
    </DataState>

    <ModalDialog :open="!!selected" :title="selected?.name" :subtitle="selected ? industryOf(selected) : ''" wide @close="close">
      <div v-if="selected" class="space-y-4">
        <div class="flex flex-wrap items-center gap-2">
          <StatusBadge :value="isVerified(selected) ? 'verified' : 'unverified'" />
          <a v-if="selected.website" :href="selected.website" target="_blank" rel="noopener"
            class="text-sm text-accent hover:underline break-all">{{ selected.website }}</a>
        </div>

        <div v-if="loadingDetail" class="py-6 flex justify-center"><UiKit /></div>
        <template v-else>
          <!-- CompanyAdminResource does not expose `description`; `tagline` is the
               only free-text field it returns. -->
          <p v-if="selected.tagline" class="text-sm text-ink-2 whitespace-pre-line">{{ selected.tagline }}</p>

          <dl class="grid grid-cols-2 gap-3 text-sm border-t border-line pt-3">
            <div v-for="[k, v] in detailRows" :key="k">
              <dt class="text-ink-3 text-xs">{{ k }}</dt>
              <dd class="text-ink font-medium break-words">{{ v }}</dd>
            </div>
          </dl>

          <div v-if="selected.owner" class="rounded-xl border border-line bg-elev/50 px-4 py-3 text-sm">
            <span class="text-ink-3">Egasi:</span>
            <span class="text-ink font-medium">{{ selected.owner.email || selected.owner.phone || '—' }}</span>
          </div>

          <label class="block">
            <span class="text-xs font-semibold uppercase tracking-wide text-ink-3">Izoh (ixtiyoriy)</span>
            <input v-model="note" type="text" maxlength="500" placeholder="Audit jurnaliga yoziladi"
              class="mt-1.5 w-full h-11 rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent" />
          </label>
        </template>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <button class="rounded-xl border border-line px-4 py-2.5 text-sm font-medium hover:bg-elev" :disabled="!!acting" @click="close">
            Yopish
          </button>
          <button
            class="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            :class="isVerified(selected) ? 'bg-warn hover:bg-warn/90' : 'bg-accent hover:bg-accent/90'"
            :disabled="!!acting" @click="toggleVerify">
            <UiKit v-if="acting === 'verify'" class="!h-4 !w-4 !border-white/40 !border-t-white" />
            {{ isVerified(selected) ? 'Tasdiqni bekor qilish' : 'Tasdiqlash' }}
          </button>
        </div>
      </template>
    </ModalDialog>
  </div>
</template>
