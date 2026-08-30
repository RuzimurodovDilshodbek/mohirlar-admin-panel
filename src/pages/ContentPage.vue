<script setup>
import { ref, reactive, watch, computed, onMounted, onUnmounted } from 'vue';
import { ReferenceApi, toApiError } from '@/lib/api';
import { useCursorList } from '@/lib/useCursorList';
import { useQuerySync } from '@/lib/useQuerySync';
import { refName, fmtNum } from '@/lib/format';
import { toastOk, toastErr } from '@/lib/toast';
import PageHeader from '@/components/PageHeader.vue';
import DataState from '@/components/DataState.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import SearchInput from '@/components/SearchInput.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import LoadMore from '@/components/LoadMore.vue';
import Spinner from '@/components/Spinner.vue';
import Icon from '@/components/Icon.vue';

// Config-driven reference CMS. Each kind maps to a public read endpoint and the
// admin write endpoints POST/PATCH/DELETE /admin/reference/{kind}.
// The field lists mirror AdminReferenceController's validation rules 1:1 —
// every `required` rule has an input here, or creation fails server-side.
//
// `ref` fields render a real picker instead of asking an admin to remember that
// Samarqand is region 18.
const KINDS = {
  categories: {
    label: 'Kategoriyalar',
    empty: 'Kategoriyalar topilmadi',
    hint: 'Vakansiya kategoriyalari — mobil ilovadagi filtrlar shu roʻyxatdan quriladi.',
    fields: [
      { key: 'slug', label: 'Slug', required: true, mono: true, hint: 'lotin harflari, chiziqcha bilan' },
      { key: 'name_uz', label: 'Nomi (UZ)', required: true },
      { key: 'name_ru', label: 'Nomi (RU)', required: true },
      { key: 'name_en', label: 'Nomi (EN)', required: true },
      { key: 'parent_id', label: 'Ota kategoriya', type: 'ref', source: 'categories' },
      { key: 'icon', label: 'Ikonka nomi' },
      { key: 'color', label: 'Rang', type: 'color' },
      { key: 'sort_order', label: 'Tartib raqami', type: 'number' },
      { key: 'is_active', label: 'Faol', type: 'bool' },
    ],
  },
  skills: {
    label: 'Koʻnikmalar',
    empty: 'Koʻnikmalar topilmadi',
    hint: 'Nomzod va vakansiya koʻnikmalari. «Tasdiqlangan roʻyxat» — taklif sifatida chiqadiganlari.',
    fields: [
      { key: 'slug', label: 'Slug', required: true, mono: true },
      // Skills have a single `name` column — no per-locale names.
      { key: 'name', label: 'Nomi', required: true },
      { key: 'category_id', label: 'Kategoriya', type: 'ref', source: 'categories' },
      { key: 'aliases', label: 'Sinonimlar', type: 'list', hint: 'vergul bilan ajrating' },
      { key: 'is_curated', label: 'Tasdiqlangan roʻyxatda', type: 'bool' },
      { key: 'is_active', label: 'Faol', type: 'bool' },
    ],
  },
  districts: {
    label: 'Tumanlar',
    empty: 'Tumanlar topilmadi',
    hint: 'Manzil maʼlumotnomasi. SOATO kodi davlat klassifikatoridan olinadi.',
    fields: [
      { key: 'region_id', label: 'Viloyat', type: 'ref', source: 'regions', required: true },
      { key: 'soato', label: 'SOATO kodi', required: true, mono: true },
      { key: 'name_uz', label: 'Nomi (UZ)', required: true },
      { key: 'name_ru', label: 'Nomi (RU)', required: true },
      { key: 'name_en', label: 'Nomi (EN)', required: true },
      { key: 'name_cyrl', label: 'Nomi (kirill)', required: true },
      { key: 'ns11_code', label: 'NS11 kodi', type: 'number' },
      { key: 'phone_kod', label: 'Telefon kodi' },
      { key: 'region_sector', label: 'Sektor', type: 'number' },
      { key: 'sort_order', label: 'Tartib raqami', type: 'number' },
    ],
  },
};

const kind = ref('categories');
const kindTabs = Object.entries(KINDS).map(([value, k]) => ({ value, label: k.label }));
const cfg = computed(() => KINDS[kind.value]);

const list = useCursorList((params) => ReferenceApi[kind.value](params));

const q = ref('');
let searchTimer = null;

function reload() {
  const params = {};
  if (q.value.trim()) params.q = q.value.trim();
  list.load(params);
}
useQuerySync({ kind, q }, { kind: 'categories', q: '' }, reload);
watch(kind, () => { q.value = ''; reload(); }, { immediate: true });
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

// ─── Reference option sources (loaded once, on demand) ───
const sources = reactive({ categories: null, regions: null });
async function loadSource(name) {
  if (sources[name]) return;
  try {
    const res = await ReferenceApi[name]({ per_page: 200 });
    sources[name] = (res?.data ?? []).map((r) => ({ id: r.id, name: refName(r) }));
  } catch {
    sources[name] = []; // fall back to a plain number input
  }
}
const sourceName = (name, id) => sources[name]?.find((o) => o.id === Number(id))?.name || null;

// ─── Create / edit modal ───
const modalOpen = ref(false);
const editing = ref(null);
const saving = ref(false);
const form = reactive({});
const missing = ref([]);

function resetForm(row) {
  Object.keys(form).forEach((k) => delete form[k]);
  for (const f of cfg.value.fields) {
    if (f.type === 'ref') loadSource(f.source);
    const v = row?.[f.key];
    if (v == null) { form[f.key] = f.type === 'bool' && !row ? 'true' : ''; continue; }
    if (f.type === 'bool') form[f.key] = v ? 'true' : 'false';
    else if (f.type === 'list') form[f.key] = Array.isArray(v) ? v.join(', ') : String(v);
    else form[f.key] = v;
  }
  missing.value = [];
}

function openCreate() {
  editing.value = null;
  resetForm(null);
  modalOpen.value = true;
}
function openEdit(row) {
  editing.value = row;
  resetForm(row);
  modalOpen.value = true;
}
function closeModal() {
  if (saving.value) return;
  modalOpen.value = false;
}

function buildBody() {
  const body = {};
  for (const f of cfg.value.fields) {
    let v = form[f.key];
    if (v === '' || v == null) continue; // omitted → server default / unchanged
    if (f.type === 'number' || f.type === 'ref') v = Number(v);
    else if (f.type === 'bool') v = v === 'true' || v === true;
    else if (f.type === 'list') {
      v = String(v).split(',').map((s) => s.trim()).filter(Boolean);
      if (!v.length) continue;
    }
    body[f.key] = v;
  }
  return body;
}

async function save() {
  if (saving.value) return;
  // Creation must carry every field the backend marks `required`; on edit the
  // rules are `sometimes`, so a partial body is fine.
  if (!editing.value) {
    missing.value = cfg.value.fields
      .filter((f) => f.required && String(form[f.key] ?? '').trim() === '')
      .map((f) => f.key);
    if (missing.value.length) {
      toastErr('Majburiy maydonlarni toʻldiring');
      return;
    }
  }
  saving.value = true;
  try {
    const body = buildBody();
    if (editing.value) {
      const updated = await ReferenceApi.update(kind.value, editing.value.id, body);
      if (updated?.id) list.patch(updated);
      else reload();
      toastOk('Yangilandi');
    } else {
      await ReferenceApi.create(kind.value, body);
      toastOk('Qoʻshildi');
      reload();
    }
    modalOpen.value = false;
  } catch (e) {
    toastErr(toApiError(e, 'Saqlashda xatolik').message);
  } finally {
    saving.value = false;
  }
}

// ─── Delete ───
const confirming = ref(null);
const deleting = ref(false);
async function remove() {
  if (deleting.value || !confirming.value) return;
  deleting.value = true;
  try {
    await ReferenceApi.remove(kind.value, confirming.value.id);
    list.remove(confirming.value.id);
    toastOk('Oʻchirildi');
    confirming.value = null;
  } catch (e) {
    toastErr(toApiError(e, 'Oʻchirishda xatolik').message);
  } finally {
    deleting.value = false;
  }
}

// Secondary line under a row's name: whichever identifier the kind actually has.
function rowMeta(row) {
  if (kind.value === 'districts') return sourceName('regions', row.region_id) || (row.soato ? `SOATO ${row.soato}` : '');
  if (kind.value === 'skills') return sourceName('categories', row.category_id) || '';
  return row.name_ru || '';
}
onMounted(() => {
  // The list needs the region/category names too, not just the form.
  loadSource('regions');
  loadSource('categories');
});
</script>

<template>
  <div class="space-y-5">
    <PageHeader :description="cfg.hint">
      <template #actions>
        <button class="btn btn-primary btn-sm" @click="openCreate">
          <Icon name="plus" :size="15" /> Qoʻshish
        </button>
      </template>
    </PageHeader>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <FilterTabs v-model="kind" :options="kindTabs" />
      <SearchInput ref="searchEl" v-model="q" placeholder="Nom boʻyicha qidirish" class="max-w-xs" />
    </div>

    <DataState
      :loading="list.loading.value" :error="list.error.value"
      :empty="!list.items.value.length" :empty-text="cfg.empty"
      empty-icon="list" @retry="reload"
    >
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="tbl min-w-[560px]">
            <thead>
              <tr>
                <th>Nomi</th>
                <th class="hidden sm:table-cell">Slug / kod</th>
                <th v-if="kind === 'skills'" class="hidden text-right md:table-cell">Ishlatilgan</th>
                <th class="hidden text-center lg:table-cell">Holat</th>
                <th class="w-24"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in list.items.value" :key="row.id" class="group">
                <td>
                  <div class="flex items-center gap-2.5">
                    <span
                      v-if="row.color"
                      class="h-3.5 w-3.5 shrink-0 rounded-full border border-line"
                      :style="{ background: row.color }"
                    />
                    <div class="min-w-0">
                      <div class="truncate font-medium text-ink">{{ refName(row) }}</div>
                      <div v-if="rowMeta(row)" class="truncate text-xs text-ink-3">{{ rowMeta(row) }}</div>
                    </div>
                  </div>
                </td>
                <td class="hidden font-mono text-xs text-ink-3 sm:table-cell">
                  {{ row.slug || row.soato || '—' }}
                </td>
                <td v-if="kind === 'skills'" class="hidden text-right text-ink-2 tabular-nums md:table-cell">
                  {{ fmtNum(row.usage_count ?? 0) }}
                </td>
                <td class="hidden lg:table-cell">
                  <div class="flex flex-wrap justify-center gap-1">
                    <span v-if="row.is_active === false" class="chip border-danger/25 bg-danger-soft py-0.5 text-[11px] text-danger-ink">Nofaol</span>
                    <span v-else-if="row.is_active === true" class="chip border-good/25 bg-good-soft py-0.5 text-[11px] text-good-ink">Faol</span>
                    <span v-if="row.is_curated" class="chip border-ai/25 bg-ai-soft py-0.5 text-[11px] text-ai-ink">Tavsiyada</span>
                    <span v-if="row.is_active == null && !row.is_curated" class="text-ink-4">—</span>
                  </div>
                </td>
                <td>
                  <div class="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                    <button class="icon-btn" title="Tahrirlash" @click="openEdit(row)">
                      <Icon name="edit" :size="16" />
                    </button>
                    <button class="icon-btn hover:bg-danger-soft hover:text-danger-ink" title="Oʻchirish" @click="confirming = row">
                      <Icon name="trash" :size="16" />
                    </button>
                  </div>
                </td>
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

    <!-- ─── Create / edit ─── -->
    <ModalDialog
      :open="modalOpen" :title="editing ? 'Tahrirlash' : 'Yangi yozuv'" :subtitle="cfg.label"
      :dismissible="!saving" @close="closeModal"
    >
      <div class="space-y-3.5">
        <label v-for="f in cfg.fields" :key="f.key" class="block">
          <span class="field-label">
            {{ f.label }}<span v-if="f.required" class="text-danger-ink"> *</span>
          </span>

          <!-- colour -->
          <div v-if="f.type === 'color'" class="mt-1.5 flex items-center gap-2">
            <input v-model="form[f.key]" type="color" class="h-11 w-14 cursor-pointer rounded-xl border border-line bg-surface p-1" />
            <input v-model="form[f.key]" type="text" placeholder="#3D6BFF" class="input flex-1 font-mono" />
          </div>

          <!-- boolean: a switch, not a three-state select -->
          <div v-else-if="f.type === 'bool'" class="mt-1.5 flex gap-1 rounded-xl bg-elev p-1">
            <button
              v-for="o in [{ v: 'true', t: 'Ha' }, { v: 'false', t: 'Yoʻq' }, { v: '', t: 'Oʻzgarishsiz' }]"
              :key="o.v" type="button"
              class="flex-1 rounded-lg py-2 text-sm font-medium transition-colors"
              :class="String(form[f.key]) === o.v ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink'"
              @click="form[f.key] = o.v"
            >{{ o.t }}</button>
          </div>

          <!-- reference picker -->
          <select v-else-if="f.type === 'ref'" v-model="form[f.key]" class="select mt-1.5" :class="missing.includes(f.key) ? 'border-danger' : ''">
            <option value="">— tanlanmagan —</option>
            <option v-for="o in sources[f.source] || []" :key="o.id" :value="o.id">{{ o.name }}</option>
          </select>

          <input
            v-else v-model="form[f.key]" :type="f.type === 'number' ? 'number' : 'text'"
            class="input mt-1.5"
            :class="[missing.includes(f.key) ? 'border-danger' : '', f.mono ? 'font-mono' : '']"
          />

          <span v-if="f.hint" class="mt-1 block text-xs text-ink-4">{{ f.hint }}</span>
        </label>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <button class="btn btn-neutral" :disabled="saving" @click="closeModal">Bekor qilish</button>
          <button class="btn btn-primary" :disabled="saving" @click="save">
            <Spinner v-if="saving" :size="16" on-fill />
            Saqlash
          </button>
        </div>
      </template>
    </ModalDialog>

    <ConfirmDialog
      :open="!!confirming"
      title="Oʻchirishni tasdiqlang"
      :message="confirming ? `«${refName(confirming)}» oʻchiriladi. Bu amalni ortga qaytarib boʻlmaydi va unga bogʻlangan yozuvlarga taʼsir qilishi mumkin.` : ''"
      confirm-label="Oʻchirish"
      :busy="deleting"
      @confirm="remove"
      @cancel="confirming = null"
    />
  </div>
</template>
