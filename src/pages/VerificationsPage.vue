<script setup>
import { ref, watch, computed } from 'vue';
import { VerificationsApi, toApiError } from '@/lib/api';
import { useCursorList } from '@/lib/useCursorList';
import { useQuerySync } from '@/lib/useQuerySync';
import { useModerationStore } from '@/stores/moderation';
import { VERIFICATION_TYPES, label, fmtDateTime, timeAgoShort } from '@/lib/format';
import { toastOk, toastErr } from '@/lib/toast';
import PageHeader from '@/components/PageHeader.vue';
import DataState from '@/components/DataState.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import LoadMore from '@/components/LoadMore.vue';
import Avatar from '@/components/Avatar.vue';
import Spinner from '@/components/Spinner.vue';
import Icon from '@/components/Icon.vue';

const list = useCursorList((params) => VerificationsApi.list(params));
const moderation = useModerationStore();

const status = ref('pending');
const type = ref('all');

const statusTabs = computed(() => [
  { value: 'pending', label: label('pending'), count: moderation.counts.pending_verifications || undefined, tone: 'warn' },
  { value: 'reviewing', label: label('reviewing') },
  { value: 'approved', label: label('approved') },
  { value: 'rejected', label: label('rejected') },
  { value: 'all', label: 'Barchasi' },
]);
const typeTabs = [{ value: 'all', label: 'Barcha turlar' }, ...VERIFICATION_TYPES.map((v) => ({ value: v, label: label(v) }))];

function reload() {
  const params = { status: status.value };
  if (type.value !== 'all') params.type = type.value;
  list.load(params);
}
useQuerySync({ status, type }, { status: 'pending', type: 'all' }, reload);
watch([status, type], reload, { immediate: true });

const selected = ref(null);
const loadingDetail = ref(false);
const acting = ref('');
const mode = ref(''); // '' | 'approve' | 'reject'
const note = ref('');

const REJECT_PRESETS = [
  'Hujjat oʻqilmaydi — sifatli surat yuboring',
  'Maʼlumotlar hisobdagi maʼlumotlarga mos kelmadi',
  'Hujjat muddati oʻtgan',
  'Notoʻgʻri hujjat turi yuborilgan',
];

const isFinal = computed(() => ['approved', 'rejected'].includes(selected.value?.status));
const payloadRows = computed(() => Object.entries(selected.value?.payload || {}));

// ─── Whose documents are these ───
// VerificationResource carries `user: { uuid, full_name, phone }` and an
// optional `company: { uuid, name }`. Degrade gracefully when absent.
const shortId = (v) => (v ? `#${String(v).slice(0, 8)}` : null);
function subjectName(v) {
  const u = v?.user;
  return u?.full_name || u?.phone || shortId(u?.uuid || u?.id) || 'Nomaʼlum';
}
function subjectPhone(v) {
  const u = v?.user;
  return u?.full_name && u?.phone ? u.phone : '';
}
const companyName = (v) => v?.company?.name || '';

// An identity document is usually a photo. Showing it inline is the whole job;
// a list of links means opening five tabs to review one request.
const IMAGE_RE = /\.(png|jpe?g|webp|gif|avif)(\?|$)/i;
const docs = computed(() =>
  (selected.value?.documents || []).map((doc, i) => {
    const url = typeof doc === 'string' ? doc : doc.url;
    return {
      url,
      name: (typeof doc === 'object' && doc.name) || url || `Hujjat ${i + 1}`,
      isImage: !!url && IMAGE_RE.test(url),
    };
  }),
);
const lightbox = ref(null);

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
  if (status.value !== 'all' && updated.status !== status.value) list.remove(updated.id);
  else list.patch(updated);
  moderation.refresh({ force: true });
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
  } catch (e) { toastErr(toApiError(e, 'Xatolik').message); }
  finally { acting.value = ''; }
}
</script>

<template>
  <div class="space-y-5">
    <PageHeader
      description="Shaxsni va kompaniyani tasdiqlash soʻrovlari. Hujjatlarni koʻrib chiqib qaror qabul qiling — soʻrovni ochish uni «tekshirilmoqda» holatiga oʻtkazadi."
    />

    <div class="space-y-3">
      <FilterTabs v-model="status" :options="statusTabs" />
      <FilterTabs v-model="type" :options="typeTabs" size="sm" />
    </div>

    <DataState
      :loading="list.loading.value" :error="list.error.value"
      :empty="!list.items.value.length"
      :empty-text="status === 'pending' ? 'Yangi soʻrov yoʻq' : 'Tasdiqlash soʻrovlari topilmadi'"
      empty-icon="shield" @retry="reload"
    >
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="tbl min-w-[640px]">
            <thead>
              <tr>
                <th>Kim</th>
                <th>Tur</th>
                <th>Holat</th>
                <th class="hidden sm:table-cell">Yuborilgan</th>
                <th class="w-10"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in list.items.value" :key="v.id" class="cursor-pointer" @click="open(v)">
                <td>
                  <div class="flex items-center gap-3">
                    <Avatar :name="subjectName(v)" :seed="v.user?.uuid || v.id" :size="34" />
                    <div class="min-w-0">
                      <div class="truncate font-medium text-ink">{{ subjectName(v) }}</div>
                      <div v-if="companyName(v) || subjectPhone(v)" class="truncate text-xs text-ink-3">
                        {{ companyName(v) || subjectPhone(v) }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="text-ink-2">{{ label(v.type) }}</td>
                <td><StatusBadge :value="v.status" size="sm" /></td>
                <td class="hidden text-ink-3 sm:table-cell">{{ timeAgoShort(v.submitted_at) }}</td>
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
      :open="!!selected" :title="selected ? label(selected.type) : ''"
      :subtitle="selected ? subjectName(selected) : 'Tasdiqlash soʻrovi'"
      size="lg" :dismissible="!acting" @close="close"
    >
      <div v-if="selected" class="space-y-5">
        <div class="flex flex-wrap items-center gap-2">
          <StatusBadge :value="selected.status" />
          <span class="ml-auto text-xs text-ink-4">{{ fmtDateTime(selected.submitted_at) }}</span>
        </div>

        <div v-if="loadingDetail" class="flex justify-center py-8"><Spinner /></div>
        <template v-else>
          <div class="panel flex items-center gap-3 px-4 py-3">
            <Avatar :name="subjectName(selected)" :seed="selected.user?.uuid || selected.id" :size="42" />
            <div class="min-w-0 flex-1">
              <div class="truncate font-medium text-ink">{{ subjectName(selected) }}</div>
              <div class="truncate text-sm text-ink-3">
                {{ [selected.user?.phone, companyName(selected)].filter(Boolean).join(' · ') || '—' }}
              </div>
            </div>
          </div>

          <div v-if="selected.rejection_reason" class="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger-ink">
            <span class="font-semibold">Rad etish sababi:</span> {{ selected.rejection_reason }}
          </div>

          <section v-if="payloadRows.length">
            <h4 class="field-label mb-1.5">Yuborilgan maʼlumotlar</h4>
            <dl class="panel divide-y divide-line-2">
              <div v-for="[k, val] in payloadRows" :key="k" class="flex justify-between gap-3 px-4 py-2 text-sm">
                <dt class="text-ink-3">{{ k }}</dt>
                <dd class="text-right font-medium break-all text-ink">{{ val }}</dd>
              </div>
            </dl>
          </section>

          <section v-if="docs.length">
            <h4 class="field-label mb-1.5">Hujjatlar ({{ docs.length }})</h4>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <template v-for="(doc, i) in docs" :key="i">
                <button
                  v-if="doc.isImage"
                  class="group relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-elev"
                  @click="lightbox = doc.url"
                >
                  <img :src="doc.url" :alt="doc.name" class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                  <span class="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1 text-left text-[11px] text-white">
                    {{ doc.name }}
                  </span>
                </button>
                <a
                  v-else :href="doc.url" target="_blank" rel="noopener"
                  class="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border border-line bg-elev p-3 text-center transition-colors hover:border-accent/40"
                >
                  <Icon name="file" :size="22" class="text-ink-3" />
                  <span class="line-clamp-2 text-xs break-all text-ink-2">{{ doc.name }}</span>
                </a>
              </template>
            </div>
          </section>

          <dl v-if="selected.reviewed_at" class="grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm">
            <div>
              <dt class="text-xs text-ink-3">Koʻrib chiqilgan</dt>
              <dd class="text-ink">{{ fmtDateTime(selected.reviewed_at) }}</dd>
            </div>
          </dl>

          <div v-if="mode" class="space-y-2 rounded-xl p-4" :class="mode === 'approve' ? 'border border-good/25 bg-good-soft/40' : 'border border-danger/25 bg-danger-soft/40'">
            <span class="field-label">{{ mode === 'approve' ? 'Izoh (ixtiyoriy)' : 'Rad etish sababi' }}</span>
            <div v-if="mode === 'reject'" class="flex flex-wrap gap-1.5">
              <button v-for="p in REJECT_PRESETS" :key="p" class="chip hover:border-danger/40 hover:text-danger-ink" @click="note = p">
                {{ p.split('—')[0].trim() }}
              </button>
            </div>
            <textarea v-model="note" rows="3" maxlength="1000" class="textarea" :placeholder="mode === 'approve' ? 'Ichki izoh' : 'Foydalanuvchiga koʻrinadigan sabab'" />
          </div>
        </template>
      </div>

      <template #footer>
        <div v-if="!isFinal" class="flex justify-end gap-2">
          <template v-if="!mode">
            <button class="btn btn-danger-soft" @click="mode = 'reject'">Rad etish</button>
            <button class="btn btn-good" @click="mode = 'approve'">Tasdiqlash</button>
          </template>
          <template v-else>
            <button class="btn btn-neutral" :disabled="!!acting" @click="mode = ''">Orqaga</button>
            <button
              class="btn" :class="mode === 'approve' ? 'btn-good' : 'btn-danger'"
              :disabled="!!acting" @click="confirm"
            >
              <Spinner v-if="acting" :size="16" on-fill />
              {{ mode === 'approve' ? 'Tasdiqlash' : 'Rad etish' }}
            </button>
          </template>
        </div>
        <p v-else class="text-center text-sm text-ink-3">Bu soʻrov allaqachon koʻrib chiqilgan.</p>
      </template>
    </ModalDialog>

    <!-- Document lightbox -->
    <ModalDialog :open="!!lightbox" size="xl" @close="lightbox = null">
      <img v-if="lightbox" :src="lightbox" alt="Hujjat" class="mx-auto max-h-[74vh] w-auto rounded-xl" />
      <template #footer>
        <div class="flex justify-end gap-2">
          <a v-if="lightbox" :href="lightbox" target="_blank" rel="noopener" class="btn btn-neutral">
            <Icon name="external" :size="15" /> Yangi oynada
          </a>
          <button class="btn btn-primary" @click="lightbox = null">Yopish</button>
        </div>
      </template>
    </ModalDialog>
  </div>
</template>
