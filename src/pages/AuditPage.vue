<script setup>
import { ref, watch, computed } from 'vue';
import { AuditApi } from '@/lib/api';
import { useCursorList } from '@/lib/useCursorList';
import { useQuerySync } from '@/lib/useQuerySync';
import { auditLabel, auditTone, targetLabel, label, fmtDateTime, timeAgoShort } from '@/lib/format';
import { exportCsv } from '@/lib/csv';
import { toastOk } from '@/lib/toast';
import PageHeader from '@/components/PageHeader.vue';
import DataState from '@/components/DataState.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import LoadMore from '@/components/LoadMore.vue';
import Icon from '@/components/Icon.vue';

const list = useCursorList(
  (params) => AuditApi.list(params),
  (res) => ({ items: res?.data ?? [], nextCursor: res?.next_cursor ?? null }),
);

const action = ref('');
const targetType = ref('');

// Grouped, because a flat list of twenty actions is a wall. The values are the
// exact strings AuditLogger writes.
const ACTION_GROUPS = [
  {
    title: 'Foydalanuvchilar',
    items: ['user.updated', 'user.plan_changed'],
  },
  {
    title: 'Vakansiyalar',
    items: ['job.moderate.approved', 'job.moderate.rejected', 'job.moderate.featured', 'job.moderate.unfeatured'],
  },
  {
    title: 'Tasdiqlash va shikoyat',
    items: ['verification.approved', 'verification.rejected', 'report.resolved', 'report.dismissed'],
  },
  {
    title: 'Kompaniyalar',
    items: ['company.verified', 'company.unverified'],
  },
  {
    title: 'Maʼlumotnomalar',
    items: [
      'reference.category.created', 'reference.category.updated', 'reference.category.deleted',
      'reference.skill.created', 'reference.skill.updated', 'reference.skill.deleted',
      'reference.district.created', 'reference.district.updated', 'reference.district.deleted',
    ],
  },
];

// `target_type` is stored as the model FQCN.
const TARGETS = [
  { value: '', label: 'Barcha obyektlar' },
  { value: 'App\\Models\\User', label: 'Foydalanuvchi' },
  { value: 'App\\Models\\Job', label: 'Vakansiya' },
  { value: 'App\\Models\\Company', label: 'Kompaniya' },
  { value: 'App\\Models\\Verification', label: 'Tasdiqlash' },
  { value: 'App\\Models\\Report', label: 'Shikoyat' },
];

function reload() {
  const params = {};
  if (action.value) params.action = action.value;
  if (targetType.value) params.target_type = targetType.value;
  list.load(params);
}
useQuerySync({ action, targetType }, { action: '', targetType: '' }, reload);
watch([action, targetType], reload, { immediate: true });

const hasFilter = computed(() => !!action.value || !!targetType.value);
function clearFilters() {
  action.value = '';
  targetType.value = '';
}

const selected = ref(null);
const showRaw = ref(false);

const LOG_TONE = {
  good: 'bg-good-soft text-good-ink',
  danger: 'bg-danger-soft text-danger-ink',
  ai: 'bg-ai-soft text-ai-ink',
  info: 'bg-info-soft text-info-ink',
};
const LOG_ICON = { good: 'check', danger: 'close', ai: 'star', info: 'edit' };

// ─── Change rendering ───
// `changes` is usually { before: {...}, after: {...}, reason }. A raw JSON dump
// made the reader diff two objects by eye; this shows what actually moved.
const diffRows = computed(() => {
  const c = selected.value?.changes;
  if (!c || typeof c !== 'object') return [];
  const before = c.before && typeof c.before === 'object' ? c.before : null;
  const after = c.after && typeof c.after === 'object' ? c.after : null;
  if (!before && !after) return [];
  const keys = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])];
  return keys
    .map((k) => ({ key: k, from: before?.[k], to: after?.[k] }))
    .filter((r) => String(r.from ?? '') !== String(r.to ?? ''));
});

const extraRows = computed(() => {
  const c = selected.value?.changes;
  if (!c || typeof c !== 'object') return [];
  return Object.entries(c)
    .filter(([k, v]) => !['before', 'after'].includes(k) && v != null && typeof v !== 'object')
    .map(([k, v]) => ({ key: k, value: v }));
});

const rawJson = computed(() =>
  selected.value ? JSON.stringify({ changes: selected.value.changes, context: selected.value.context }, null, 2) : '',
);

const val = (v) => (v === null || v === undefined || v === '' ? '—' : label(String(v)));

function download() {
  exportCsv(
    'mohirlar-audit',
    [
      { label: 'Vaqt', get: (l) => fmtDateTime(l.created_at) },
      { label: 'Amal', get: (l) => auditLabel(l.action) },
      { label: 'Bajaruvchi', get: (l) => (l.actor ? label(l.actor.role) : 'Tizim') },
      { label: 'Obyekt', get: (l) => `${targetLabel(l.target_type)}${l.target_id ? ' #' + l.target_id : ''}` },
      { label: 'IP', key: 'ip' },
    ],
    list.items.value,
  );
  toastOk(`${list.items.value.length} ta yozuv yuklab olindi`);
}
</script>

<template>
  <div class="space-y-5">
    <PageHeader
      description="Moderatorlar va administratorlar bajargan har bir amal. Yozuvlar oʻzgartirilmaydi va oʻchirilmaydi."
    >
      <template #actions>
        <button class="btn btn-neutral btn-sm" :disabled="!list.items.value.length" @click="download">
          <Icon name="download" :size="15" /> CSV
        </button>
      </template>
    </PageHeader>

    <div class="flex flex-wrap items-center gap-2">
      <select v-model="action" class="select h-10 w-auto min-w-[210px] text-sm">
        <option value="">Barcha amallar</option>
        <optgroup v-for="g in ACTION_GROUPS" :key="g.title" :label="g.title">
          <option v-for="a in g.items" :key="a" :value="a">{{ auditLabel(a) }}</option>
        </optgroup>
      </select>

      <select v-model="targetType" class="select h-10 w-auto min-w-[180px] text-sm">
        <option v-for="t in TARGETS" :key="t.value" :value="t.value">{{ t.label }}</option>
      </select>

      <button v-if="hasFilter" class="btn btn-ghost btn-sm" @click="clearFilters">
        <Icon name="close" :size="14" /> Filtrni tozalash
      </button>
    </div>

    <DataState
      :loading="list.loading.value" :error="list.error.value"
      :empty="!list.items.value.length" empty-text="Audit yozuvlari yoʻq"
      empty-icon="file" @retry="reload"
    >
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="tbl min-w-[640px]">
            <thead>
              <tr>
                <th>Amal</th>
                <th class="hidden sm:table-cell">Bajaruvchi</th>
                <th class="hidden md:table-cell">Obyekt</th>
                <th>Vaqt</th>
                <th class="w-10"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in list.items.value" :key="log.id" class="cursor-pointer" @click="selected = log; showRaw = false">
                <td>
                  <div class="flex items-center gap-2.5">
                    <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" :class="LOG_TONE[auditTone(log.action)]">
                      <Icon :name="LOG_ICON[auditTone(log.action)]" :size="13" :stroke="2.2" />
                    </span>
                    <span class="font-medium text-ink">{{ auditLabel(log.action) }}</span>
                  </div>
                </td>
                <td class="hidden text-ink-2 sm:table-cell">{{ log.actor ? label(log.actor.role) : 'Tizim' }}</td>
                <td class="hidden text-ink-3 md:table-cell">
                  {{ targetLabel(log.target_type) }}<span v-if="log.target_id" class="text-ink-4"> #{{ log.target_id }}</span>
                </td>
                <!-- An audit trail is read for "when exactly", so the column
                     carries the clock time the detail view shows; the relative
                     age moves to the tooltip. -->
                <td class="whitespace-nowrap text-ink-3" :title="timeAgoShort(log.created_at)">
                  {{ fmtDateTime(log.created_at) }}
                </td>
                <td class="text-right"><Icon name="right" :size="16" class="inline text-ink-4" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <LoadMore
        :has-more="!!list.nextCursor.value" :loading="list.loadingMore.value"
        :count="list.items.value.length" @more="list.loadMore()"
      />
    </DataState>

    <ModalDialog
      :open="!!selected" :title="selected ? auditLabel(selected.action) : ''"
      subtitle="Audit yozuvi" size="lg" @close="selected = null"
    >
      <div v-if="selected" class="space-y-5">
        <dl class="panel grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 text-sm">
          <div>
            <dt class="text-xs text-ink-3">Bajaruvchi</dt>
            <dd class="font-medium text-ink">{{ selected.actor ? label(selected.actor.role) : 'Tizim' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-3">Vaqt</dt>
            <dd class="text-ink">{{ fmtDateTime(selected.created_at) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-3">Obyekt</dt>
            <dd class="text-ink">
              {{ targetLabel(selected.target_type) }}<span v-if="selected.target_id"> #{{ selected.target_id }}</span>
            </dd>
          </div>
          <div>
            <dt class="text-xs text-ink-3">IP manzil</dt>
            <dd class="font-mono text-xs text-ink">{{ selected.ip || '—' }}</dd>
          </div>
        </dl>

        <section v-if="diffRows.length">
          <h4 class="field-label mb-2">Oʻzgarishlar</h4>
          <div class="overflow-hidden rounded-xl border border-line">
            <table class="w-full text-sm">
              <tbody>
                <tr v-for="r in diffRows" :key="r.key" class="border-b border-line-2 last:border-0">
                  <td class="w-1/3 bg-elev/60 px-3 py-2 font-medium text-ink-2">{{ r.key }}</td>
                  <td class="px-3 py-2">
                    <span class="text-ink-3 line-through">{{ val(r.from) }}</span>
                    <Icon name="arrowRight" :size="12" class="mx-2 inline text-ink-4" />
                    <span class="font-medium text-ink">{{ val(r.to) }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="extraRows.length">
          <h4 class="field-label mb-2">Qoʻshimcha</h4>
          <dl class="panel divide-y divide-line-2">
            <div v-for="r in extraRows" :key="r.key" class="flex justify-between gap-3 px-4 py-2 text-sm">
              <dt class="text-ink-3">{{ r.key }}</dt>
              <dd class="text-right break-words text-ink">{{ r.value }}</dd>
            </div>
          </dl>
        </section>

        <div>
          <button class="btn btn-ghost btn-sm -ml-3" @click="showRaw = !showRaw">
            <Icon :name="showRaw ? 'up' : 'down'" :size="14" />
            Xom JSON
          </button>
          <pre
            v-if="showRaw"
            class="mt-2 overflow-x-auto rounded-xl border border-line bg-elev/60 p-3 font-mono text-xs leading-relaxed text-ink-2"
          >{{ rawJson }}</pre>
        </div>
      </div>
    </ModalDialog>
  </div>
</template>
