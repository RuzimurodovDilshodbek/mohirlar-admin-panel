<script setup>
import { ref, watch } from 'vue';
import { JobsApi } from '@/lib/api';
import { useCursorList } from '@/lib/useCursorList';
import { JOB_STATUSES, label, salaryRange, fmtDate, timeAgo } from '@/lib/format';
import { toastOk, toastErr } from '@/lib/toast';
import DataState from '@/components/DataState.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import UiKit from '@/components/UiKit.vue';

const list = useCursorList((params) => JobsApi.list(params));
const status = ref('pending_review');

const statusTabs = [
  { value: 'pending_review', label: label('pending_review') },
  { value: 'active', label: label('active') },
  { value: 'rejected', label: label('rejected') },
  { value: 'paused', label: label('paused') },
  { value: 'closed', label: label('closed') },
  { value: 'all', label: 'Barchasi' },
];

function reload() {
  list.load({ status: status.value });
}
watch(status, reload, { immediate: true });

// ─── Detail modal ───
const selected = ref(null);
const loadingDetail = ref(false);
const acting = ref('');
const rejectMode = ref(false);
const rejectReason = ref('');

async function open(job) {
  selected.value = job;
  rejectMode.value = false;
  rejectReason.value = '';
  loadingDetail.value = true;
  try {
    selected.value = await JobsApi.show(job.id);
  } catch {
    /* keep list row data */
  } finally {
    loadingDetail.value = false;
  }
}
function close() {
  if (acting.value) return;
  selected.value = null;
}

function applyAndSync(updated) {
  selected.value = updated;
  // status may have moved out of the current filter → drop, else patch
  if (status.value !== 'all' && updated.status !== status.value) list.remove(updated.id);
  else list.patch(updated);
}

async function approve() {
  if (acting.value) return;
  acting.value = 'approve';
  try {
    const updated = await JobsApi.approve(selected.value.id);
    applyAndSync(updated);
    toastOk('Vakansiya tasdiqlandi');
    selected.value = null;
  } catch (e) { toastErr(e?.response?.data?.error?.message || 'Xatolik'); }
  finally { acting.value = ''; }
}

async function reject() {
  if (!rejectMode.value) { rejectMode.value = true; return; }
  if (rejectReason.value.trim().length < 3) { toastErr('Sabab kamida 3 belgi'); return; }
  if (acting.value) return;
  acting.value = 'reject';
  try {
    const updated = await JobsApi.reject(selected.value.id, rejectReason.value.trim());
    applyAndSync(updated);
    toastOk('Vakansiya rad etildi');
    selected.value = null;
  } catch (e) { toastErr(e?.response?.data?.error?.message || 'Xatolik'); }
  finally { acting.value = ''; }
}

async function toggleFeature() {
  if (acting.value) return;
  acting.value = 'feature';
  try {
    const updated = await JobsApi.feature(selected.value.id, !selected.value.featured);
    applyAndSync(updated);
    toastOk(updated.featured ? 'Tavsiyaga qoʻshildi' : 'Tavsiyadan olib tashlandi');
  } catch (e) { toastErr(e?.response?.data?.error?.message || 'Xatolik'); }
  finally { acting.value = ''; }
}
</script>

<template>
  <div class="space-y-5">
    <FilterTabs v-model="status" :options="statusTabs" />

    <DataState
      :loading="list.loading.value"
      :error="list.error.value"
      :empty="!list.items.value.length"
      empty-text="Vakansiyalar topilmadi"
      @retry="reload"
    >
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <button
          v-for="job in list.items.value" :key="job.id"
          class="text-left rounded-2xl border border-line bg-surface p-4 hover:border-accent/40 hover:shadow-sm transition-all"
          @click="open(job)"
        >
          <div class="flex items-start justify-between gap-2">
            <h3 class="font-medium text-ink leading-snug line-clamp-2">{{ job.title }}</h3>
            <span v-if="job.featured" class="shrink-0 text-ai" title="Tavsiya etilgan">★</span>
          </div>
          <div class="mt-1 text-sm text-ink-3">{{ job.company?.name || '—' }}</div>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge :value="job.status" />
            <span v-if="job.urgent" class="rounded-full bg-warn-soft text-warn border border-warn/20 px-2 py-0.5 text-[11px] font-medium">Shoshilinch</span>
          </div>
          <div class="mt-3 flex items-center justify-between text-xs text-ink-3">
            <span>{{ salaryRange(job.salary_min, job.salary_max) }}</span>
            <span>{{ timeAgo(job.created_at) }}</span>
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

    <ModalDialog :open="!!selected" :title="selected?.title" :subtitle="selected?.company?.name" wide @close="close">
      <div v-if="selected" class="space-y-4">
        <div class="flex flex-wrap items-center gap-2">
          <StatusBadge :value="selected.status" />
          <StatusBadge v-if="selected.job_type" :value="selected.job_type" :dot="false" tone="neutral" />
          <StatusBadge v-if="selected.work_mode" :value="selected.work_mode" :dot="false" tone="info" />
          <span class="text-sm text-ink-3">{{ salaryRange(selected.salary_min, selected.salary_max) }}</span>
        </div>

        <div v-if="loadingDetail" class="py-6 flex justify-center"><UiKit /></div>

        <template v-else>
          <div v-if="selected.rejection_reason" class="rounded-xl border border-warn/25 bg-warn-soft px-4 py-3 text-sm text-warn">
            <span class="font-semibold">Rad etish sababi:</span> {{ selected.rejection_reason }}
          </div>

          <section v-if="selected.description">
            <h4 class="text-xs font-semibold uppercase tracking-wide text-ink-3 mb-1">Tavsif</h4>
            <p class="text-sm text-ink-2 whitespace-pre-line">{{ selected.description }}</p>
          </section>
          <section v-if="selected.requirements">
            <h4 class="text-xs font-semibold uppercase tracking-wide text-ink-3 mb-1">Talablar</h4>
            <p class="text-sm text-ink-2 whitespace-pre-line">{{ selected.requirements }}</p>
          </section>

          <div v-if="selected.skills?.length" class="flex flex-wrap gap-1.5">
            <span v-for="s in selected.skills" :key="s.id"
              class="rounded-full bg-elev px-2.5 py-1 text-xs text-ink-2 border border-line">
              {{ s.name }}<span v-if="s.required" class="text-warn"> *</span>
            </span>
          </div>

          <dl class="grid grid-cols-3 gap-3 text-sm border-t border-line pt-3">
            <div><dt class="text-ink-3 text-xs">Koʻrishlar</dt><dd class="text-ink font-medium">{{ selected.views_count ?? 0 }}</dd></div>
            <div><dt class="text-ink-3 text-xs">Arizalar</dt><dd class="text-ink font-medium">{{ selected.applications_count ?? 0 }}</dd></div>
            <div><dt class="text-ink-3 text-xs">Yaratilgan</dt><dd class="text-ink">{{ fmtDate(selected.created_at) }}</dd></div>
          </dl>

          <div v-if="rejectMode">
            <label class="block">
              <span class="text-xs font-semibold uppercase tracking-wide text-ink-3">Rad etish sababi</span>
              <textarea v-model="rejectReason" rows="3" maxlength="1000" placeholder="Nima uchun rad etilmoqda?"
                class="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent resize-none" />
            </label>
          </div>
        </template>
      </div>

      <template #footer>
        <div class="flex flex-wrap justify-end gap-2">
          <button class="rounded-xl border border-line px-3.5 py-2.5 text-sm font-medium hover:bg-elev disabled:opacity-50"
            :disabled="!!acting" @click="toggleFeature">
            {{ selected?.featured ? 'Tavsiyadan olish' : 'Tavsiya etish' }}
          </button>
          <button class="inline-flex items-center gap-2 rounded-xl border border-warn/30 text-warn px-3.5 py-2.5 text-sm font-medium hover:bg-warn-soft disabled:opacity-50"
            :disabled="!!acting" @click="reject">
            <UiKit v-if="acting==='reject'" class="!h-4 !w-4" />
            {{ rejectMode ? 'Rad etishni tasdiqlash' : 'Rad etish' }}
          </button>
          <button class="inline-flex items-center gap-2 rounded-xl bg-accent px-3.5 py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
            :disabled="!!acting" @click="approve">
            <UiKit v-if="acting==='approve'" class="!h-4 !w-4 !border-white/40 !border-t-white" />
            Tasdiqlash
          </button>
        </div>
      </template>
    </ModalDialog>
  </div>
</template>
