<script setup>
import { ref, watch, computed } from 'vue';
import { ReportsApi } from '@/lib/api';
import { useCursorList } from '@/lib/useCursorList';
import { REPORT_ACTIONS, label, fmtDateTime, timeAgo } from '@/lib/format';
import { toastOk, toastErr } from '@/lib/toast';
import DataState from '@/components/DataState.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import UiKit from '@/components/UiKit.vue';

const list = useCursorList((params) => ReportsApi.list(params));
const status = ref('open');

const statusTabs = [
  { value: 'open', label: label('open') },
  { value: 'reviewing', label: label('reviewing') },
  { value: 'resolved', label: label('resolved') },
  { value: 'dismissed', label: label('dismissed') },
  { value: 'all', label: 'Barchasi' },
];

function reload() { list.load({ status: status.value }); }
watch(status, reload, { immediate: true });

const selected = ref(null);
const loadingDetail = ref(false);
const acting = ref('');
const mode = ref(''); // '' | 'resolve' | 'dismiss'
const actionTaken = ref('noted');
const note = ref('');

const isFinal = computed(() => ['resolved', 'dismissed'].includes(selected.value?.status));

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
  selected.value = updated;
  if (status.value !== 'all' && updated.status !== status.value) list.remove(updated.id);
  else list.patch(updated);
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
  } catch (e) { toastErr(e?.response?.data?.error?.message || 'Xatolik'); }
  finally { acting.value = ''; }
}
</script>

<template>
  <div class="space-y-5">
    <FilterTabs v-model="status" :options="statusTabs" />

    <DataState
      :loading="list.loading.value" :error="list.error.value"
      :empty="!list.items.value.length" empty-text="Shikoyatlar yoʻq" @retry="reload"
    >
      <div class="space-y-2.5">
        <button
          v-for="r in list.items.value" :key="r.id"
          class="w-full text-left rounded-2xl border border-line bg-surface p-4 hover:border-accent/40 transition-colors"
          @click="open(r)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium text-ink">{{ label(r.reason) }}</span>
                <span class="text-xs text-ink-3">· {{ label(r.target_type) }} #{{ r.target_id }}</span>
              </div>
              <p v-if="r.description" class="mt-0.5 text-sm text-ink-3 line-clamp-1">{{ r.description }}</p>
            </div>
            <div class="shrink-0 text-right">
              <StatusBadge :value="r.status" />
              <div class="mt-1 text-[11px] text-ink-4">{{ timeAgo(r.created_at) }}</div>
            </div>
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

    <ModalDialog :open="!!selected" :title="selected ? label(selected.reason) : ''"
      :subtitle="selected ? (label(selected.target_type) + ' #' + selected.target_id) : ''" @close="close">
      <div v-if="selected" class="space-y-4">
        <StatusBadge :value="selected.status" />

        <div v-if="loadingDetail" class="py-6 flex justify-center"><UiKit /></div>
        <template v-else>
          <section v-if="selected.description">
            <h4 class="text-xs font-semibold uppercase tracking-wide text-ink-3 mb-1">Shikoyat matni</h4>
            <p class="text-sm text-ink-2 whitespace-pre-line">{{ selected.description }}</p>
          </section>

          <section v-if="selected.evidence?.length">
            <h4 class="text-xs font-semibold uppercase tracking-wide text-ink-3 mb-1.5">Dalillar</h4>
            <ul class="space-y-1">
              <li v-for="(ev, i) in selected.evidence" :key="i">
                <a :href="ev.url || ev" target="_blank" rel="noopener" class="text-sm text-accent hover:underline break-all">{{ ev.name || ev.url || ev }}</a>
              </li>
            </ul>
          </section>

          <div v-if="selected.action_taken" class="rounded-xl border border-line bg-elev/50 px-4 py-3 text-sm">
            <span class="text-ink-3">Koʻrilgan chora:</span> <span class="text-ink font-medium">{{ label(selected.action_taken) }}</span>
            <p v-if="selected.reviewer_note" class="mt-1 text-ink-2">{{ selected.reviewer_note }}</p>
          </div>

          <div class="text-xs text-ink-4 border-t border-line pt-3">Kelib tushgan: {{ fmtDateTime(selected.created_at) }}</div>

          <template v-if="mode === 'resolve'">
            <label class="block">
              <span class="text-xs font-semibold uppercase tracking-wide text-ink-3">Koʻrilgan chora</span>
              <select v-model="actionTaken" class="mt-1.5 w-full h-11 rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent">
                <option v-for="a in REPORT_ACTIONS" :key="a" :value="a">{{ label(a) }}</option>
              </select>
            </label>
          </template>
          <label v-if="mode" class="block">
            <span class="text-xs font-semibold uppercase tracking-wide text-ink-3">Izoh (ixtiyoriy)</span>
            <textarea v-model="note" rows="3" maxlength="1500"
              class="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent resize-none" />
          </label>
        </template>
      </div>

      <template #footer>
        <div v-if="!isFinal" class="flex justify-end gap-2">
          <template v-if="!mode">
            <button class="rounded-xl border border-line px-4 py-2.5 text-sm font-medium hover:bg-elev" @click="mode='dismiss'">Rad etish</button>
            <button class="rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-ink/90" @click="mode='resolve'">Hal qilish</button>
          </template>
          <template v-else>
            <button class="rounded-xl border border-line px-4 py-2.5 text-sm font-medium hover:bg-elev" :disabled="!!acting" @click="mode=''">Orqaga</button>
            <button class="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              :class="mode === 'resolve' ? 'bg-ink hover:bg-ink/90' : 'bg-warn hover:bg-warn/90'"
              :disabled="!!acting" @click="confirm">
              <UiKit v-if="acting" class="!h-4 !w-4 !border-white/40 !border-t-white" />
              {{ mode === 'resolve' ? 'Tasdiqlash' : 'Rad etish' }}
            </button>
          </template>
        </div>
        <div v-else class="text-sm text-ink-3 text-center">Bu shikoyat allaqachon yopilgan.</div>
      </template>
    </ModalDialog>
  </div>
</template>
