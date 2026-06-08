<script setup>
import { ref, watch, computed } from 'vue';
import { VerificationsApi } from '@/lib/api';
import { useCursorList } from '@/lib/useCursorList';
import { VERIFICATION_TYPES, label, fmtDateTime, timeAgo } from '@/lib/format';
import { toastOk, toastErr } from '@/lib/toast';
import DataState from '@/components/DataState.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import UiKit from '@/components/UiKit.vue';

const list = useCursorList((params) => VerificationsApi.list(params));
const status = ref('pending');
const type = ref('all');

const statusTabs = [
  { value: 'pending', label: label('pending') },
  { value: 'reviewing', label: label('reviewing') },
  { value: 'approved', label: label('approved') },
  { value: 'rejected', label: label('rejected') },
  { value: 'all', label: 'Barchasi' },
];
const typeTabs = [{ value: 'all', label: 'Barcha turlar' }, ...VERIFICATION_TYPES.map((v) => ({ value: v, label: label(v) }))];

function reload() {
  const params = { status: status.value };
  if (type.value !== 'all') params.type = type.value;
  list.load(params);
}
watch([status, type], reload, { immediate: true });

const selected = ref(null);
const loadingDetail = ref(false);
const acting = ref('');
const mode = ref(''); // '' | 'approve' | 'reject'
const note = ref('');

const isFinal = computed(() => ['approved', 'rejected'].includes(selected.value?.status));
const payloadRows = computed(() => Object.entries(selected.value?.payload || {}));

async function open(v) {
  selected.value = v;
  mode.value = '';
  note.value = '';
  loadingDetail.value = true;
  try {
    selected.value = await VerificationsApi.show(v.id);
    // show() flips pending → reviewing on the server; reflect in the list
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
  if (mode.value === 'reject' && note.value.trim().length < 3) { toastErr('Sabab kamida 3 belgi'); return; }
  acting.value = mode.value;
  try {
    const updated = mode.value === 'approve'
      ? await VerificationsApi.approve(selected.value.id, note.value.trim() || undefined)
      : await VerificationsApi.reject(selected.value.id, note.value.trim());
    sync(updated);
    toastOk(mode.value === 'approve' ? 'Tasdiqlandi' : 'Rad etildi');
    selected.value = null;
  } catch (e) { toastErr(e?.response?.data?.error?.message || 'Xatolik'); }
  finally { acting.value = ''; }
}
</script>

<template>
  <div class="space-y-5">
    <div class="space-y-3">
      <FilterTabs v-model="status" :options="statusTabs" />
      <FilterTabs v-model="type" :options="typeTabs" />
    </div>

    <DataState
      :loading="list.loading.value" :error="list.error.value"
      :empty="!list.items.value.length" empty-text="Tasdiqlash soʻrovlari yoʻq" @retry="reload"
    >
      <div class="overflow-hidden rounded-2xl border border-line bg-surface">
        <table class="w-full text-sm">
          <thead class="bg-elev/60 text-ink-3 text-xs uppercase tracking-wide">
            <tr>
              <th class="text-left font-semibold px-4 py-3">Tur</th>
              <th class="text-left font-semibold px-4 py-3">Holat</th>
              <th class="text-left font-semibold px-4 py-3 hidden sm:table-cell">Yuborilgan</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr v-for="v in list.items.value" :key="v.id" class="hover:bg-elev/40 cursor-pointer" @click="open(v)">
              <td class="px-4 py-3 font-medium text-ink">{{ label(v.type) }}</td>
              <td class="px-4 py-3"><StatusBadge :value="v.status" /></td>
              <td class="px-4 py-3 hidden sm:table-cell text-ink-3">{{ timeAgo(v.submitted_at) }}</td>
              <td class="px-4 py-3 text-right">
                <svg viewBox="0 0 24 24" class="inline h-4 w-4 text-ink-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="list.nextCursor.value" class="mt-4 flex justify-center">
        <button class="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-medium hover:bg-elev disabled:opacity-50"
          :disabled="list.loadingMore.value" @click="list.loadMore()">
          <UiKit v-if="list.loadingMore.value" class="!h-4 !w-4" /> Koʻproq yuklash
        </button>
      </div>
    </DataState>

    <ModalDialog :open="!!selected" :title="selected ? label(selected.type) : ''" subtitle="Tasdiqlash soʻrovi" @close="close">
      <div v-if="selected" class="space-y-4">
        <StatusBadge :value="selected.status" />

        <div v-if="loadingDetail" class="py-6 flex justify-center"><UiKit /></div>
        <template v-else>
          <div v-if="selected.rejection_reason" class="rounded-xl border border-warn/25 bg-warn-soft px-4 py-3 text-sm text-warn">
            <span class="font-semibold">Rad etish sababi:</span> {{ selected.rejection_reason }}
          </div>

          <section v-if="payloadRows.length">
            <h4 class="text-xs font-semibold uppercase tracking-wide text-ink-3 mb-1.5">Maʼlumotlar</h4>
            <dl class="space-y-1.5">
              <div v-for="[k, val] in payloadRows" :key="k" class="flex justify-between gap-3 text-sm">
                <dt class="text-ink-3">{{ k }}</dt>
                <dd class="text-ink font-medium text-right break-all">{{ val }}</dd>
              </div>
            </dl>
          </section>

          <section v-if="selected.documents?.length">
            <h4 class="text-xs font-semibold uppercase tracking-wide text-ink-3 mb-1.5">Hujjatlar</h4>
            <ul class="space-y-1.5">
              <li v-for="(doc, i) in selected.documents" :key="i">
                <a :href="doc.url || doc" target="_blank" rel="noopener"
                  class="inline-flex items-center gap-2 text-sm text-accent hover:underline break-all">
                  <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9zM14 3v6h6" /></svg>
                  {{ doc.name || doc.url || ('Hujjat ' + (i + 1)) }}
                </a>
              </li>
            </ul>
          </section>

          <dl class="grid grid-cols-2 gap-3 text-sm border-t border-line pt-3">
            <div><dt class="text-ink-3 text-xs">Yuborilgan</dt><dd class="text-ink">{{ fmtDateTime(selected.submitted_at) }}</dd></div>
            <div v-if="selected.reviewed_at"><dt class="text-ink-3 text-xs">Koʻrib chiqilgan</dt><dd class="text-ink">{{ fmtDateTime(selected.reviewed_at) }}</dd></div>
          </dl>

          <label v-if="mode" class="block">
            <span class="text-xs font-semibold uppercase tracking-wide text-ink-3">
              {{ mode === 'approve' ? 'Izoh (ixtiyoriy)' : 'Rad etish sababi' }}
            </span>
            <textarea v-model="note" rows="3" maxlength="1000"
              class="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent resize-none" />
          </label>
        </template>
      </div>

      <template #footer>
        <div v-if="!isFinal" class="flex justify-end gap-2">
          <template v-if="!mode">
            <button class="rounded-xl border border-warn/30 text-warn px-4 py-2.5 text-sm font-medium hover:bg-warn-soft" @click="mode='reject'">Rad etish</button>
            <button class="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90" @click="mode='approve'">Tasdiqlash</button>
          </template>
          <template v-else>
            <button class="rounded-xl border border-line px-4 py-2.5 text-sm font-medium hover:bg-elev" :disabled="!!acting" @click="mode=''">Orqaga</button>
            <button class="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              :class="mode === 'approve' ? 'bg-accent hover:bg-accent/90' : 'bg-warn hover:bg-warn/90'"
              :disabled="!!acting" @click="confirm">
              <UiKit v-if="acting" class="!h-4 !w-4 !border-white/40 !border-t-white" />
              {{ mode === 'approve' ? 'Tasdiqlash' : 'Rad etish' }}
            </button>
          </template>
        </div>
        <div v-else class="text-sm text-ink-3 text-center">Bu soʻrov allaqachon koʻrib chiqilgan.</div>
      </template>
    </ModalDialog>
  </div>
</template>
