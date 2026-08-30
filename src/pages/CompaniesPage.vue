<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { CompaniesApi, toApiError } from '@/lib/api';
import { useCursorList } from '@/lib/useCursorList';
import { useQuerySync } from '@/lib/useQuerySync';
import { fmtDate, fmtNum } from '@/lib/format';
import { toastOk, toastErr } from '@/lib/toast';
import { exportCsv } from '@/lib/csv';
import PageHeader from '@/components/PageHeader.vue';
import DataState from '@/components/DataState.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import SearchInput from '@/components/SearchInput.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import LoadMore from '@/components/LoadMore.vue';
import Avatar from '@/components/Avatar.vue';
import Spinner from '@/components/Spinner.vue';
import Icon from '@/components/Icon.vue';

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
useQuerySync({ verified, q }, { verified: 'all', q: '' }, reload);
watch(verified, reload, { immediate: true });
watch(q, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(reload, 350);
});

const searchEl = ref(null);
const focusSearch = () => searchEl.value?.focus();
onMounted(() => window.addEventListener('admin:focus-search', focusSearch));
onUnmounted(() => {
  window.removeEventListener('admin:focus-search', focusSearch);
  clearTimeout(searchTimer);
});

// tolerate different field names for the verified flag
function isVerified(c) {
  if (!c) return false;
  return c.verified ?? c.is_verified ?? !!c.verified_at;
}
const industryOf = (c) => c?.industry?.name || c?.industry_name || c?.industry || '—';
const locationOf = (c) => c?.city || c?.region?.name || c?.district?.name || c?.location || '';

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
    ['Xodimlar', c.size_bucket ? `${c.size_bucket} xodim` : '—'],
    ['Vakansiyalar', c.jobs_count != null ? fmtNum(c.jobs_count) : '—'],
    ['Obunachilar', c.followers_count != null ? fmtNum(c.followers_count) : '—'],
    ['Roʻyxatdan oʻtgan', fmtDate(c.created_at)],
  ];
});

function download() {
  exportCsv(
    'mohirlar-kompaniyalar',
    [
      { label: 'Nomi', key: 'name' },
      { label: 'Sanoat', get: (c) => industryOf(c) },
      { label: 'Manzil', get: (c) => locationOf(c) },
      { label: 'Tasdiqlangan', get: (c) => (isVerified(c) ? 'ha' : 'yoʻq') },
      { label: 'Vakansiyalar', key: 'jobs_count' },
      { label: 'Veb-sayt', key: 'website' },
    ],
    list.items.value,
  );
  toastOk(`${list.items.value.length} ta yozuv yuklab olindi`);
}
</script>

<template>
  <div class="space-y-5">
    <PageHeader
      description="Tasdiqlangan kompaniya nomzodlarga ishonchli koʻrinadi va vakansiyalari tezroq moderatsiyadan oʻtadi."
    >
      <template #actions>
        <button class="btn btn-neutral btn-sm" :disabled="!list.items.value.length" @click="download">
          <Icon name="download" :size="15" /> CSV
        </button>
      </template>
    </PageHeader>

    <div class="space-y-3">
      <SearchInput ref="searchEl" v-model="q" placeholder="Kompaniya nomi boʻyicha qidirish" />
      <FilterTabs v-model="verified" :options="verifiedTabs" />
    </div>

    <DataState
      :loading="list.loading.value" :error="list.error.value"
      :empty="!list.items.value.length" empty-text="Kompaniyalar topilmadi"
      empty-icon="building" skeleton="cards" @retry="reload"
    >
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <button
          v-for="c in list.items.value" :key="c.id"
          class="card card-hover flex flex-col p-4 text-left"
          @click="open(c)"
        >
          <div class="flex items-start gap-3">
            <Avatar :name="c.name || 'K'" :src="c.logo_url" :seed="c.id" :size="44" square />
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <h3 class="truncate leading-snug font-medium text-ink">{{ c.name || '—' }}</h3>
                <span v-if="isVerified(c)" class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-good text-white" title="Tasdiqlangan">
                  <Icon name="check" :size="10" :stroke="3" />
                </span>
              </div>
              <div class="truncate text-sm text-ink-3">{{ industryOf(c) }}</div>
            </div>
          </div>

          <div class="mt-4 flex items-center justify-between gap-2 text-xs text-ink-3">
            <span class="truncate">{{ locationOf(c) || '—' }}</span>
            <span v-if="c.jobs_count != null" class="chip shrink-0 py-0.5 text-[11px]">
              {{ fmtNum(c.jobs_count) }} vakansiya
            </span>
          </div>
        </button>
      </div>

      <LoadMore
        :has-more="!!list.nextCursor.value" :loading="list.loadingMore.value"
        :count="list.items.value.length" @more="list.loadMore()"
      />
    </DataState>

    <ModalDialog
      :open="!!selected" :title="selected?.name" :subtitle="selected ? industryOf(selected) : ''"
      size="lg" :dismissible="!acting" @close="close"
    >
      <div v-if="selected" class="space-y-5">
        <div class="flex items-center gap-3">
          <Avatar :name="selected.name || 'K'" :src="selected.logo_url" :seed="selected.id" :size="52" square />
          <div class="min-w-0">
            <StatusBadge :value="isVerified(selected) ? 'verified' : 'unverified'" />
            <a
              v-if="selected.website" :href="selected.website" target="_blank" rel="noopener"
              class="link mt-1.5 flex items-center gap-1 text-sm break-all"
            >
              <Icon name="globe" :size="13" /> {{ selected.website }}
            </a>
          </div>
        </div>

        <div v-if="loadingDetail" class="flex justify-center py-8"><Spinner /></div>
        <template v-else>
          <!-- CompanyAdminResource does not expose `description`; `tagline` is the
               only free-text field it returns. -->
          <p v-if="selected.tagline" class="text-sm leading-relaxed whitespace-pre-line text-ink-2">{{ selected.tagline }}</p>

          <dl class="panel grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 text-sm sm:grid-cols-3">
            <div v-for="[k, v] in detailRows" :key="k" class="min-w-0">
              <dt class="text-xs text-ink-3">{{ k }}</dt>
              <dd class="font-medium break-words text-ink">{{ v }}</dd>
            </div>
          </dl>

          <div v-if="selected.owner" class="panel flex items-center gap-3 px-4 py-3">
            <Avatar :name="selected.owner.name || selected.owner.email || '?'" :seed="selected.owner.id" :size="36" />
            <div class="min-w-0">
              <div class="text-xs text-ink-3">Egasi</div>
              <div class="truncate text-sm font-medium text-ink">{{ selected.owner.name || '—' }}</div>
              <div class="truncate text-xs text-ink-3">
                {{ [selected.owner.position, selected.owner.email || selected.owner.phone].filter(Boolean).join(' · ') }}
              </div>
            </div>
          </div>

          <label class="block">
            <span class="field-label">Izoh (ixtiyoriy)</span>
            <input v-model="note" type="text" maxlength="500" placeholder="Audit jurnaliga yoziladi" class="input mt-1.5" />
          </label>
        </template>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <button class="btn btn-neutral" :disabled="!!acting" @click="close">Yopish</button>
          <button
            class="btn" :class="isVerified(selected) ? 'btn-danger-soft' : 'btn-good'"
            :disabled="!!acting" @click="toggleVerify"
          >
            <Spinner v-if="acting === 'verify'" :size="16" :on-fill="!isVerified(selected)" />
            {{ isVerified(selected) ? 'Tasdiqni bekor qilish' : 'Tasdiqlash' }}
          </button>
        </div>
      </template>
    </ModalDialog>
  </div>
</template>
