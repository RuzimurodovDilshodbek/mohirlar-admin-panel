<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { JobsApi, toApiError } from '@/lib/api';
import { useCursorList } from '@/lib/useCursorList';
import { useQuerySync } from '@/lib/useQuerySync';
import { useModerationStore } from '@/stores/moderation';
import { label, salaryRange, fmtDate, fmtNum, timeAgo, timeAgoShort } from '@/lib/format';
import { toastOk, toastErr } from '@/lib/toast';
import { readPref, writePref } from '@/lib/prefs';
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

const list = useCursorList((params) => JobsApi.list(params));
const moderation = useModerationStore();

const status = ref('pending_review');
const q = ref('');
const sort = ref('oldest');
const view = ref(readPref('jobs.view', 'grid'));
let searchTimer = null;

watch(view, (v) => writePref('jobs.view', v));

const statusTabs = computed(() => [
  { value: 'pending_review', label: label('pending_review'), count: moderation.counts.pending_jobs || undefined, tone: 'warn' },
  { value: 'active', label: label('active') },
  { value: 'rejected', label: label('rejected') },
  { value: 'paused', label: label('paused') },
  { value: 'closed', label: label('closed') },
  { value: 'draft', label: label('draft') },
  { value: 'all', label: 'Barchasi' },
]);

function reload() {
  const params = { status: status.value, sort: sort.value };
  if (q.value.trim()) params.q = q.value.trim();
  list.load(params);
}
useQuerySync({ status, q, sort }, { status: 'pending_review', q: '', sort: 'oldest' }, reload);
watch([status, sort], reload, { immediate: true });
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

// ─── Detail modal ───
const selected = ref(null);
const loadingDetail = ref(false);
const acting = ref('');
const rejectMode = ref(false);
const rejectReason = ref('');

// Rejecting is the action that needs an explanation, and a blank box is a slow
// way to ask for one. These are the four reasons the queue actually produces.
const REJECT_PRESETS = [
  'Tavsif yetarli emas — vazifa va talablar aniq emas',
  'Maosh yoki shartlar notoʻgʻri koʻrsatilgan',
  'Kompaniya maʼlumotlari tasdiqlanmagan',
  'Qoidalarga zid: spam yoki takroriy eʼlon',
];

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
  // status may have moved out of the current filter → drop, else patch
  if (status.value !== 'all' && updated.status !== status.value) list.remove(updated.id);
  else list.patch(updated);
  moderation.refresh({ force: true });
}

async function approve(job, fromCard = false) {
  const target = job || selected.value;
  if (!target || acting.value) return;
  acting.value = `approve:${target.id}`;
  try {
    const updated = await JobsApi.approve(target.id);
    applyAndSync(updated);
    toastOk('Vakansiya tasdiqlandi');
    if (!fromCard) selected.value = null;
    else if (selected.value?.id === updated.id) selected.value = updated;
  } catch (e) { toastErr(toApiError(e, 'Xatolik').message); }
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
  } catch (e) { toastErr(toApiError(e, 'Xatolik').message); }
  finally { acting.value = ''; }
}

async function toggleFeature() {
  if (acting.value) return;
  acting.value = 'feature';
  try {
    const updated = await JobsApi.feature(selected.value.id, !selected.value.featured);
    selected.value = updated;
    list.patch(updated);
    toastOk(updated.featured ? 'Tavsiyaga qoʻshildi' : 'Tavsiyadan olib tashlandi');
  } catch (e) { toastErr(toApiError(e, 'Xatolik').message); }
  finally { acting.value = ''; }
}

const isPending = (job) => job?.status === 'pending_review';
const stats = computed(() => {
  const j = selected.value;
  if (!j) return [];
  return [
    ['Koʻrishlar', fmtNum(j.views_count ?? 0)],
    ['Arizalar', fmtNum(j.applications_count ?? 0)],
    ['Yaratilgan', fmtDate(j.created_at)],
  ];
});
</script>

<template>
  <div class="space-y-5">
    <PageHeader
      description="Yangi eʼlonlarni koʻrib chiqing. Navbat eng eskisidan boshlanadi — tasdiqlangani darhol nomzodlarga koʻrinadi."
    >
      <template #actions>
        <div class="flex rounded-xl border border-line bg-surface p-0.5">
          <button
            v-for="v in [{ k: 'grid', i: 'grid', t: 'Kartalar' }, { k: 'list', i: 'rows', t: 'Roʻyxat' }]"
            :key="v.k"
            class="rounded-lg p-1.5 transition-colors"
            :class="view === v.k ? 'bg-elev text-ink' : 'text-ink-4 hover:text-ink'"
            :title="v.t"
            @click="view = v.k"
          >
            <Icon :name="v.i" :size="16" />
          </button>
        </div>
        <button
          class="btn btn-neutral btn-sm"
          :title="sort === 'oldest' ? 'Eng eskisidan' : 'Eng yangisidan'"
          @click="sort = sort === 'oldest' ? 'newest' : 'oldest'"
        >
          <Icon :name="sort === 'oldest' ? 'arrowUp' : 'arrowDown'" :size="14" />
          {{ sort === 'oldest' ? 'Eskilari' : 'Yangilari' }}
        </button>
      </template>
    </PageHeader>

    <div class="space-y-3">
      <SearchInput ref="searchEl" v-model="q" placeholder="Vakansiya yoki kompaniya nomi" />
      <FilterTabs v-model="status" :options="statusTabs" />
    </div>

    <DataState
      :loading="list.loading.value"
      :error="list.error.value"
      :empty="!list.items.value.length"
      :empty-text="status === 'pending_review' ? 'Navbat boʻsh — hammasi koʻrib chiqilgan' : 'Vakansiyalar topilmadi'"
      :empty-hint="status === 'pending_review' ? 'Yangi eʼlon kelganda bu yerda paydo boʻladi.' : 'Filtr yoki qidiruvni oʻzgartirib koʻring.'"
      empty-icon="briefcase"
      :skeleton="view === 'grid' ? 'cards' : 'list'"
      @retry="reload"
    >
      <!-- ─── Grid ─── -->
      <div v-if="view === 'grid'" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="job in list.items.value" :key="job.id"
          class="card card-hover group flex cursor-pointer flex-col p-4"
          @click="open(job)"
        >
          <div class="flex items-start gap-3">
            <Avatar :name="job.company?.name || '—'" :src="job.company?.logo_url" :seed="job.company?.id" :size="40" square />
            <div class="min-w-0 flex-1">
              <h3 class="line-clamp-2 leading-snug font-medium text-ink">{{ job.title }}</h3>
              <div class="mt-0.5 flex items-center gap-1 text-sm text-ink-3">
                <span class="truncate">{{ job.company?.name || '—' }}</span>
                <Icon v-if="job.company?.verified" name="check" :size="12" class="shrink-0 text-good" />
              </div>
            </div>
            <Icon v-if="job.featured" name="star" :size="15" class="shrink-0 text-ai" title="Tavsiya etilgan" />
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-1.5">
            <StatusBadge :value="job.status" size="sm" />
            <span v-if="job.urgent" class="rounded-full border border-warn/25 bg-warn-soft px-2 py-0.5 text-[11px] font-medium text-warn-ink">Shoshilinch</span>
            <StatusBadge v-if="job.work_mode" :value="job.work_mode" :dot="false" tone="neutral" size="sm" />
          </div>

          <div class="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-ink-3">
            <span class="truncate font-medium text-ink-2">{{ salaryRange(job.salary_min, job.salary_max) }}</span>
            <span class="shrink-0">{{ timeAgoShort(job.created_at) }}</span>
          </div>

          <!-- One-click approve straight from the queue; rejecting still needs
               the detail view, because it needs a reason. -->
          <div v-if="isPending(job)" class="mt-3 flex gap-2 border-t border-line-2 pt-3" @click.stop>
            <button class="btn btn-good btn-sm flex-1" :disabled="!!acting" @click="approve(job, true)">
              <Spinner v-if="acting === `approve:${job.id}`" :size="14" on-fill />
              <Icon v-else name="check" :size="14" />
              Tasdiqlash
            </button>
            <button class="btn btn-neutral btn-sm flex-1" @click="open(job)">Koʻrib chiqish</button>
          </div>
        </article>
      </div>

      <!-- ─── List ─── -->
      <div v-else class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="tbl min-w-[720px]">
            <thead>
              <tr>
                <th>Vakansiya</th>
                <th class="hidden md:table-cell">Kompaniya</th>
                <th>Holat</th>
                <th class="hidden lg:table-cell">Maosh</th>
                <th class="hidden sm:table-cell">Yuborilgan</th>
                <th class="w-28"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="job in list.items.value" :key="job.id" class="group cursor-pointer" @click="open(job)">
                <td>
                  <div class="flex items-center gap-2">
                    <Icon v-if="job.featured" name="star" :size="13" class="shrink-0 text-ai" />
                    <span class="max-w-[320px] truncate font-medium text-ink">{{ job.title }}</span>
                  </div>
                </td>
                <td class="hidden text-ink-2 md:table-cell">{{ job.company?.name || '—' }}</td>
                <td><StatusBadge :value="job.status" size="sm" /></td>
                <td class="hidden text-ink-2 lg:table-cell">{{ salaryRange(job.salary_min, job.salary_max) }}</td>
                <td class="hidden text-ink-3 sm:table-cell">{{ timeAgoShort(job.created_at) }}</td>
                <td>
                  <div class="flex items-center justify-end gap-1" @click.stop>
                    <button
                      v-if="isPending(job)"
                      class="icon-btn opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-good-soft hover:text-good-ink"
                      title="Tasdiqlash"
                      :disabled="!!acting"
                      @click="approve(job, true)"
                    >
                      <Spinner v-if="acting === `approve:${job.id}`" :size="14" />
                      <Icon v-else name="check" :size="16" />
                    </button>
                    <Icon name="right" :size="16" class="text-ink-4" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <LoadMore
        :has-more="!!list.nextCursor.value"
        :loading="list.loadingMore.value"
        :count="list.items.value.length"
        @more="list.loadMore()"
      />
    </DataState>

    <!-- ─── Detail ─── -->
    <ModalDialog
      :open="!!selected" :title="selected?.title" :subtitle="selected?.company?.name"
      size="lg" :dismissible="!acting" @close="close"
    >
      <div v-if="selected" class="space-y-5">
        <div class="flex flex-wrap items-center gap-2">
          <StatusBadge :value="selected.status" />
          <StatusBadge v-if="selected.job_type" :value="selected.job_type" :dot="false" tone="neutral" />
          <StatusBadge v-if="selected.work_mode" :value="selected.work_mode" :dot="false" tone="info" />
          <span v-if="selected.featured" class="chip border-ai/25 bg-ai-soft text-ai-ink">
            <Icon name="star" :size="12" /> Tavsiya etilgan
          </span>
          <span class="ml-auto text-sm font-medium text-ink">{{ salaryRange(selected.salary_min, selected.salary_max) }}</span>
        </div>

        <div v-if="loadingDetail" class="flex justify-center py-8"><Spinner /></div>

        <template v-else>
          <div v-if="selected.rejection_reason" class="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger-ink">
            <span class="font-semibold">Rad etish sababi:</span> {{ selected.rejection_reason }}
          </div>

          <dl class="panel grid grid-cols-3 gap-3 px-4 py-3 text-sm">
            <div v-for="[k, v] in stats" :key="k">
              <dt class="text-xs text-ink-3">{{ k }}</dt>
              <dd class="font-medium text-ink">{{ v }}</dd>
            </div>
          </dl>

          <section v-if="selected.description">
            <h4 class="field-label mb-1.5">Tavsif</h4>
            <p class="text-sm leading-relaxed whitespace-pre-line text-ink-2">{{ selected.description }}</p>
          </section>
          <section v-if="selected.requirements">
            <h4 class="field-label mb-1.5">Talablar</h4>
            <p class="text-sm leading-relaxed whitespace-pre-line text-ink-2">{{ selected.requirements }}</p>
          </section>

          <section v-if="selected.skills?.length">
            <h4 class="field-label mb-1.5">Koʻnikmalar</h4>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="s in selected.skills" :key="s.id" class="chip">
                {{ s.name }}<span v-if="s.required" class="text-danger-ink">*</span>
              </span>
            </div>
          </section>

          <div v-if="rejectMode" class="space-y-2 rounded-xl border border-danger/25 bg-danger-soft/40 p-4">
            <span class="field-label">Rad etish sababi</span>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="p in REJECT_PRESETS" :key="p"
                class="chip hover:border-danger/40 hover:text-danger-ink"
                @click="rejectReason = p"
              >{{ p.split('—')[0].trim() }}</button>
            </div>
            <textarea
              v-model="rejectReason" rows="3" maxlength="1000"
              placeholder="Nima uchun rad etilmoqda? Bu matn ish beruvchiga koʻrinadi."
              class="textarea"
            />
          </div>
        </template>
      </div>

      <template #footer>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <span v-if="selected" class="mr-auto hidden text-xs text-ink-4 sm:block">{{ timeAgo(selected.created_at) }} yuborilgan</span>
          <button class="btn btn-neutral" :disabled="!!acting" @click="toggleFeature">
            <Spinner v-if="acting === 'feature'" :size="16" />
            <Icon v-else name="star" :size="16" />
            {{ selected?.featured ? 'Tavsiyadan olish' : 'Tavsiya etish' }}
          </button>
          <button class="btn btn-danger-soft" :disabled="!!acting" @click="reject">
            <Spinner v-if="acting === 'reject'" :size="16" />
            {{ rejectMode ? 'Rad etishni tasdiqlash' : 'Rad etish' }}
          </button>
          <button class="btn btn-good" :disabled="!!acting" @click="approve(null)">
            <Spinner v-if="acting.startsWith('approve')" :size="16" on-fill />
            Tasdiqlash
          </button>
        </div>
      </template>
    </ModalDialog>
  </div>
</template>
