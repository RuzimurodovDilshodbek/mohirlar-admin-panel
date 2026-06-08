<script setup>
import { ref, watch, computed } from 'vue';
import { AuditApi } from '@/lib/api';
import { useCursorList } from '@/lib/useCursorList';
import { AUDIT_ACTIONS, auditLabel, shortClass, label, fmtDateTime } from '@/lib/format';
import DataState from '@/components/DataState.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import UiKit from '@/components/UiKit.vue';

const list = useCursorList(
  (params) => AuditApi.list(params),
  (res) => ({ items: res?.data ?? [], nextCursor: res?.next_cursor ?? null }),
);

const action = ref('');

function reload() {
  const params = {};
  if (action.value) params.action = action.value;
  list.load(params);
}
watch(action, reload, { immediate: true });

const selected = ref(null);
const changesJson = computed(() =>
  selected.value ? JSON.stringify({ changes: selected.value.changes, context: selected.value.context }, null, 2) : '',
);
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center gap-3">
      <label class="text-sm text-ink-3">Amal:</label>
      <select v-model="action" class="h-10 rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent">
        <option value="">Barchasi</option>
        <option v-for="a in AUDIT_ACTIONS" :key="a" :value="a">{{ auditLabel(a) }}</option>
      </select>
    </div>

    <DataState
      :loading="list.loading.value" :error="list.error.value"
      :empty="!list.items.value.length" empty-text="Audit yozuvlari yoʻq" @retry="reload"
    >
      <div class="overflow-hidden rounded-2xl border border-line bg-surface">
        <table class="w-full text-sm">
          <thead class="bg-elev/60 text-ink-3 text-xs uppercase tracking-wide">
            <tr>
              <th class="text-left font-semibold px-4 py-3">Amal</th>
              <th class="text-left font-semibold px-4 py-3 hidden sm:table-cell">Bajaruvchi</th>
              <th class="text-left font-semibold px-4 py-3 hidden md:table-cell">Obyekt</th>
              <th class="text-left font-semibold px-4 py-3">Vaqt</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr v-for="log in list.items.value" :key="log.id" class="hover:bg-elev/40 cursor-pointer" @click="selected = log">
              <td class="px-4 py-3 font-medium text-ink">{{ auditLabel(log.action) }}</td>
              <td class="px-4 py-3 hidden sm:table-cell text-ink-2">
                {{ log.actor ? label(log.actor.role) : 'Tizim' }}
              </td>
              <td class="px-4 py-3 hidden md:table-cell text-ink-3">
                {{ shortClass(log.target_type) }}<span v-if="log.target_id"> #{{ log.target_id }}</span>
              </td>
              <td class="px-4 py-3 text-ink-3 whitespace-nowrap">{{ fmtDateTime(log.created_at) }}</td>
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

    <ModalDialog :open="!!selected" :title="selected ? auditLabel(selected.action) : ''" subtitle="Audit yozuvi" wide @close="selected = null">
      <div v-if="selected" class="space-y-4">
        <dl class="grid grid-cols-2 gap-3 text-sm">
          <div><dt class="text-ink-3 text-xs">Bajaruvchi</dt><dd class="text-ink font-medium">{{ selected.actor ? label(selected.actor.role) : 'Tizim' }}</dd></div>
          <div><dt class="text-ink-3 text-xs">Vaqt</dt><dd class="text-ink">{{ fmtDateTime(selected.created_at) }}</dd></div>
          <div><dt class="text-ink-3 text-xs">Obyekt</dt><dd class="text-ink">{{ shortClass(selected.target_type) }}<span v-if="selected.target_id"> #{{ selected.target_id }}</span></dd></div>
          <div><dt class="text-ink-3 text-xs">IP</dt><dd class="text-ink font-mono text-xs">{{ selected.ip || '—' }}</dd></div>
        </dl>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-ink-3 mb-1.5">Oʻzgarishlar</h4>
          <pre class="rounded-xl border border-line bg-elev/50 p-3 text-xs text-ink-2 overflow-x-auto font-mono leading-relaxed">{{ changesJson }}</pre>
        </div>
      </div>
    </ModalDialog>
  </div>
</template>
