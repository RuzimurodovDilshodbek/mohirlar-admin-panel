<script setup>
import { ref, watch, computed } from 'vue';
import { ReportsApi, toApiError } from '@/lib/api';
import { useCursorList } from '@/lib/useCursorList';
import { useQuerySync } from '@/lib/useQuerySync';
import { useModerationStore } from '@/stores/moderation';
import { REPORT_ACTIONS, label, fmtDateTime, timeAgo, timeAgoShort } from '@/lib/format';
import { toastOk, toastErr } from '@/lib/toast';
import PageHeader from '@/components/PageHeader.vue';
import DataState from '@/components/DataState.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import LoadMore from '@/components/LoadMore.vue';
import Spinner from '@/components/Spinner.vue';
import Icon from '@/components/Icon.vue';

const list = useCursorList((params) => ReportsApi.list(params));
const moderation = useModerationStore();
const status = ref('open');

const statusTabs = computed(() => [
  { value: 'open', label: label('open'), count: moderation.counts.open_reports || undefined, tone: 'danger' },
  { value: 'reviewing', label: label('reviewing') },
  { value: 'resolved', label: label('resolved') },
  { value: 'dismissed', label: label('dismissed') },
  { value: 'all', label: 'Barchasi' },
]);

function reload() { list.load({ status: status.value }); }
useQuerySync({ status }, { status: 'open' }, reload);
watch(status, reload, { immediate: true });

const selected = ref(null);
const loadingDetail = ref(false);
const acting = ref('');
const mode = ref(''); // '' | 'resolve' | 'dismiss'
const actionTaken = ref('noted');
const note = ref('');

const isFinal = computed(() => ['resolved', 'dismissed'].includes(selected.value?.status));

// The icon carries the reason at a glance, so a queue of thirty is scannable
// without reading every line.
const REASON_ICON = {
  spam: 'ban', fake: 'alert', inappropriate: 'flag', harassment: 'alert',
  discrimination: 'alert', scam: 'alert', duplicate: 'copy', other: 'info',
};
const SEVERE = ['scam', 'harassment', 'discrimination'];

// ─── Who reported what ───
// ReportResource carries `reporter: { uuid, full_name, role }` and
// `target: { type, id, label, status }`; older payloads only had the flat
// `reporter_id` / `target_type` / `target_id`, so degrade to those.
const shortId = (v) => (v ? `#${String(v).slice(0, 8)}` : null);

function targetKind(r) {
  return label(r?.target?.type || r?.target_type);
}
function targetText(r) {
  const t = r?.target;
  const id = t?.id ?? r?.target_id;
  if (t?.label) return `${targetKind(r)}: ${t.label}`;
  return id != null ? `${targetKind(r)} ${shortId(id)}` : targetKind(r);
}
function reporterText(r) {
  const rep = r?.reporter;
  const name = rep?.full_name || shortId(rep?.uuid || rep?.id || r?.reporter_id);
  if (!name) return 'Nomaʼlum';
  return rep?.role ? `${name} · ${label(rep.role)}` : name;
}

async function open(r) {
  selected.value = r;
  mode.value = '';
  note.value = '';
  actionTaken.value = 'noted';
  loadingDetail.value = true;
  try {
    selected.value = await ReportsApi.show(r.id);
    list.patch(selected.value);
  } catch {/* keep row */} finally { loadingDetail.value = false; }
}
function close() { if (!acting.value) selected.value = null; }

function sync(updated) {
  if (status.value !== 'all' && updated.status !== status.value) list.remove(updated.id);
  else list.patch(updated);
  moderation.refresh({ force: true });
}

async function confirm() {
  if (acting.value) return;
  acting.value = mode.value;
  try {
    const updated = mode.value === 'resolve'
      ? await ReportsApi.resolve(selected.value.id, { action_taken: actionTaken.value, reviewer_note: note.value.trim() || undefined })
      : await ReportsApi.dismiss(selected.value.id, { reviewer_note: note.value.trim() || undefined });
    sync(updated);
    toastOk(mode.value === 'resolve' ? 'Hal qilindi' : 'Rad etildi');
    selected.value = null;
  } catch (e) { toastErr(toApiError(e, 'Xatolik').message); }
  finally { acting.value = ''; }
}
</script>

<template>
  <div class="space-y-5">
    <PageHeader
      description="Foydalanuvchilardan kelgan murojaatlar. Har bir shikoyatga koʻrilgan chora bilan yopiladi va audit jurnaliga yoziladi."
    />

    <FilterTabs v-model="status" :options="statusTabs" />

    <DataState
      :loading="list.loading.value" :error="list.error.value"
      :empty="!list.items.value.length"
      :empty-text="status === 'open' ? 'Ochiq shikoyat yoʻq' : 'Shikoyatlar topilmadi'"
      empty-icon="flag" skeleton="list" @retry="reload"
    >
      <div class="space-y-2.5">
        <button
          v-for="r in list.items.value" :key="r.id"
          class="card card-hover w-full p-4 text-left"
          @click="open(r)"
        >
          <div class="flex items-start gap-3">
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              :class="SEVERE.includes(r.reason) ? 'bg-danger-soft text-danger-ink' : 'bg-warn-soft text-warn-ink'"
            >
              <Icon :name="REASON_ICON[r.reason] || 'flag'" :size="17" />
            </span>

            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span class="font-medium text-ink">{{ label(r.reason) }}</span>
                <span class="truncate text-xs text-ink-3">· {{ targetText(r) }}</span>
                <StatusBadge v-if="r.target?.status" :value="r.target.status" :dot="false" size="sm" />
              </div>
              <p v-if="r.description" class="mt-1 line-clamp-1 text-sm text-ink-2">{{ r.description }}</p>
              <div class="mt-1 truncate text-xs text-ink-4">Shikoyatchi: {{ reporterText(r) }}</div>
            </div>

            <div class="shrink-0 text-right">
              <StatusBadge :value="r.status" size="sm" />
              <div class="mt-1.5 text-[11px] text-ink-4">{{ timeAgoShort(r.created_at) }}</div>
            </div>
          </div>
        </button>
      </div>

      <LoadMore
        :has-more="!!list.nextCursor.value" :loading="list.loadingMore.value"
        :count="list.items.value.length" @more="list.loadMore()"
      />
    </DataState>

    <ModalDialog
      :open="!!selected" :title="selected ? label(selected.reason) : ''"
      :subtitle="selected ? targetText(selected) : ''"
      size="lg" :dismissible="!acting" @close="close"
    >
      <div v-if="selected" class="space-y-5">
        <div class="flex flex-wrap items-center gap-2">
          <StatusBadge :value="selected.status" />
          <span class="ml-auto text-xs text-ink-4">{{ timeAgo(selected.created_at) }}</span>
        </div>

        <div v-if="loadingDetail" class="flex justify-center py-8"><Spinner /></div>
        <template v-else>
          <dl class="panel grid gap-3 px-4 py-3 text-sm sm:grid-cols-2">
            <div class="min-w-0">
              <dt class="text-xs text-ink-3">Shikoyatchi</dt>
              <dd class="font-medium break-words text-ink">{{ reporterText(selected) }}</dd>
            </div>
            <div class="min-w-0">
              <dt class="text-xs text-ink-3">Shikoyat obyekti</dt>
              <dd class="font-medium break-words text-ink">
                {{ targetText(selected) }}
                <StatusBadge v-if="selected.target?.status" :value="selected.target.status" :dot="false" size="sm" class="ml-1 align-middle" />
              </dd>
            </div>
          </dl>

          <section v-if="selected.description">
            <h4 class="field-label mb-1.5">Shikoyat matni</h4>
            <p class="text-sm leading-relaxed whitespace-pre-line text-ink-2">{{ selected.description }}</p>
          </section>

          <section v-if="selected.evidence?.length">
            <h4 class="field-label mb-1.5">Dalillar</h4>
            <ul class="space-y-1">
              <li v-for="(ev, i) in selected.evidence" :key="i">
                <a :href="ev.url || ev" target="_blank" rel="noopener" class="link text-sm break-all">
                  {{ ev.name || ev.url || ev }}
                </a>
              </li>
            </ul>
          </section>

          <div v-if="selected.action_taken" class="panel px-4 py-3 text-sm">
            <span class="text-ink-3">Koʻrilgan chora:</span>
            <span class="font-medium text-ink">{{ label(selected.action_taken) }}</span>
            <p v-if="selected.reviewer_note" class="mt-1 text-ink-2">{{ selected.reviewer_note }}</p>
          </div>

          <div class="border-t border-line pt-3 text-xs text-ink-4">
            Kelib tushgan: {{ fmtDateTime(selected.created_at) }}
          </div>

          <div v-if="mode" class="space-y-3 rounded-xl p-4" :class="mode === 'resolve' ? 'border border-accent/25 bg-accent-soft/40' : 'border border-line bg-elev/60'">
            <label v-if="mode === 'resolve'" class="block">
              <span class="field-label">Koʻrilgan chora</span>
              <select v-model="actionTaken" class="select mt-1.5">
                <option v-for="a in REPORT_ACTIONS" :key="a" :value="a">{{ label(a) }}</option>
              </select>
            </label>
            <label class="block">
              <span class="field-label">Izoh (ixtiyoriy)</span>
              <textarea v-model="note" rows="3" maxlength="1500" class="textarea mt-1.5" placeholder="Ichki qayd — audit jurnaliga yoziladi" />
            </label>
          </div>
        </template>
      </div>

      <template #footer>
        <div v-if="!isFinal" class="flex justify-end gap-2">
          <template v-if="!mode">
            <button class="btn btn-danger-soft" @click="mode = 'dismiss'">Rad etish</button>
            <button class="btn btn-good" @click="mode = 'resolve'">Hal qilish</button>
          </template>
          <template v-else>
            <button class="btn btn-neutral" :disabled="!!acting" @click="mode = ''">Orqaga</button>
            <button class="btn" :class="mode === 'resolve' ? 'btn-good' : 'btn-danger-soft'" :disabled="!!acting" @click="confirm">
              <Spinner v-if="acting" :size="16" :on-fill="mode === 'resolve'" />
              {{ mode === 'resolve' ? 'Tasdiqlash' : 'Rad etish' }}
            </button>
          </template>
        </div>
        <p v-else class="text-center text-sm text-ink-3">Bu shikoyat allaqachon yopilgan.</p>
      </template>
    </ModalDialog>
  </div>
</template>
