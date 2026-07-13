<script setup>
import { ref, reactive, watch, computed } from 'vue';
import { ReferenceApi } from '@/lib/api';
import { useCursorList } from '@/lib/useCursorList';
import { refName, fmtNum } from '@/lib/format';
import { toastOk, toastErr } from '@/lib/toast';
import DataState from '@/components/DataState.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import UiKit from '@/components/UiKit.vue';

// Config-driven reference CMS. Each kind maps to a public read endpoint and the
// admin write endpoints POST/PATCH/DELETE /admin/reference/{kind}.
const KINDS = {
  categories: {
    label: 'Kategoriyalar',
    empty: 'Kategoriyalar topilmadi',
    searchable: true,
    fields: [
      { key: 'name_uz', label: 'Nomi (UZ)', required: true },
      { key: 'name_ru', label: 'Nomi (RU)' },
      { key: 'name_en', label: 'Nomi (EN)' },
      { key: 'slug', label: 'Slug' },
      { key: 'icon', label: 'Ikonka nomi' },
      { key: 'color', label: 'Rang', type: 'color' },
    ],
  },
  skills: {
    label: 'Koʻnikmalar',
    empty: 'Koʻnikmalar topilmadi',
    searchable: true,
    fields: [
      { key: 'name_uz', label: 'Nomi (UZ)', required: true },
      { key: 'name_ru', label: 'Nomi (RU)' },
      { key: 'slug', label: 'Slug' },
      { key: 'category_id', label: 'Kategoriya ID', type: 'number' },
    ],
  },
  districts: {
    label: 'Tumanlar',
    empty: 'Tumanlar topilmadi',
    searchable: true,
    fields: [
      { key: 'name_uz', label: 'Nomi (UZ)', required: true },
      { key: 'name_ru', label: 'Nomi (RU)' },
      { key: 'name_en', label: 'Nomi (EN)' },
      { key: 'region_id', label: 'Viloyat ID', type: 'number' },
      { key: 'soato', label: 'SOATO' },
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
watch(kind, () => { q.value = ''; reload(); }, { immediate: true });
watch(q, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(reload, 350);
});

// ─── Create / edit modal ───
const modalOpen = ref(false);
const editing = ref(null);
const saving = ref(false);
const form = reactive({});

function openCreate() {
  editing.value = null;
  Object.keys(form).forEach((k) => delete form[k]);
  cfg.value.fields.forEach((f) => { form[f.key] = ''; });
  modalOpen.value = true;
}
function openEdit(row) {
  editing.value = row;
  Object.keys(form).forEach((k) => delete form[k]);
  cfg.value.fields.forEach((f) => { form[f.key] = row[f.key] ?? ''; });
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
    if (v === '' || v == null) continue;
    if (f.type === 'number') v = Number(v);
    body[f.key] = v;
  }
  // convenience: mirror UZ name into the generic `name` if backend expects it
  if (body.name_uz && body.name == null) body.name = body.name_uz;
  return body;
}

async function save() {
  if (saving.value) return;
  const nameUz = (form.name_uz || '').trim();
  if (!nameUz) { toastErr('Nomi (UZ) majburiy'); return; }
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
    toastErr(e?.response?.data?.error?.message || 'Saqlashda xatolik');
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
    toastErr(e?.response?.data?.error?.message || 'Oʻchirishda xatolik');
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <FilterTabs v-model="kind" :options="kindTabs" />
      <button class="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-ink/90"
        @click="openCreate">
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
        Qoʻshish
      </button>
    </div>

    <div v-if="cfg.searchable" class="relative max-w-sm">
      <svg viewBox="0 0 24 24" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-4"
        fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
      </svg>
      <input v-model="q" type="search" placeholder="Nom boʻyicha qidirish"
        class="w-full h-10 rounded-xl border border-line bg-surface pl-9 pr-3 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15" />
    </div>

    <DataState :loading="list.loading.value" :error="list.error.value"
      :empty="!list.items.value.length" :empty-text="cfg.empty" @retry="reload">
      <div class="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table class="w-full text-sm">
          <thead class="bg-elev/60 text-ink-3 text-xs uppercase tracking-wide">
            <tr>
              <th class="text-left font-semibold px-4 py-3">Nomi</th>
              <th class="text-left font-semibold px-4 py-3 hidden sm:table-cell">Slug / kod</th>
              <th v-if="kind === 'skills'" class="text-right font-semibold px-4 py-3 hidden md:table-cell">Ishlatilgan</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr v-for="row in list.items.value" :key="row.id" class="hover:bg-elev/40">
              <td class="px-4 py-3">
                <div class="flex items-center gap-2.5">
                  <span v-if="row.color" class="h-3.5 w-3.5 rounded-full shrink-0 border border-line" :style="{ background: row.color }" />
                  <div>
                    <div class="font-medium text-ink">{{ refName(row) }}</div>
                    <div v-if="row.name_ru" class="text-xs text-ink-3">{{ row.name_ru }}</div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 hidden sm:table-cell text-ink-3 font-mono text-xs">
                {{ row.slug || row.soato || (row.category_id != null ? 'cat #' + row.category_id : '') || '—' }}
              </td>
              <td v-if="kind === 'skills'" class="px-4 py-3 hidden md:table-cell text-right text-ink-2 tabular-nums">
                {{ fmtNum(row.usage_count ?? 0) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  <button class="p-1.5 rounded-lg text-ink-3 hover:bg-elev hover:text-ink" title="Tahrirlash" @click="openEdit(row)">
                    <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
                  </button>
                  <button class="p-1.5 rounded-lg text-ink-3 hover:bg-warn-soft hover:text-warn" title="Oʻchirish" @click="confirming = row">
                    <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
                  </button>
                </div>
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

    <!-- Create / edit -->
    <ModalDialog :open="modalOpen" :title="editing ? 'Tahrirlash' : 'Yangi yozuv'" :subtitle="cfg.label" @close="closeModal">
      <div class="space-y-3">
        <label v-for="f in cfg.fields" :key="f.key" class="block">
          <span class="text-xs font-semibold uppercase tracking-wide text-ink-3">{{ f.label }}<span v-if="f.required" class="text-warn"> *</span></span>
          <div v-if="f.type === 'color'" class="mt-1.5 flex items-center gap-2">
            <input v-model="form[f.key]" type="color" class="h-11 w-14 rounded-xl border border-line bg-surface p-1 cursor-pointer" />
            <input v-model="form[f.key]" type="text" placeholder="#0B6E5F"
              class="flex-1 h-11 rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent font-mono" />
          </div>
          <input v-else v-model="form[f.key]" :type="f.type === 'number' ? 'number' : 'text'"
            class="mt-1.5 w-full h-11 rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent" />
        </label>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button class="rounded-xl border border-line px-4 py-2.5 text-sm font-medium hover:bg-elev" :disabled="saving" @click="closeModal">Bekor qilish</button>
          <button class="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-ink/90 disabled:opacity-50" :disabled="saving" @click="save">
            <UiKit v-if="saving" class="!h-4 !w-4 !border-white/40 !border-t-white" />
            Saqlash
          </button>
        </div>
      </template>
    </ModalDialog>

    <!-- Delete confirm -->
    <ModalDialog :open="!!confirming" title="Oʻchirishni tasdiqlang" :subtitle="confirming ? refName(confirming) : ''" @close="confirming = null">
      <p class="text-sm text-ink-2">Ushbu yozuvni oʻchirmoqchimisiz? Bu amalni ortga qaytarib boʻlmaydi.</p>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button class="rounded-xl border border-line px-4 py-2.5 text-sm font-medium hover:bg-elev" :disabled="deleting" @click="confirming = null">Bekor qilish</button>
          <button class="inline-flex items-center gap-2 rounded-xl bg-warn px-4 py-2.5 text-sm font-medium text-white hover:bg-warn/90 disabled:opacity-50" :disabled="deleting" @click="remove">
            <UiKit v-if="deleting" class="!h-4 !w-4 !border-white/40 !border-t-white" />
            Oʻchirish
          </button>
        </div>
      </template>
    </ModalDialog>
  </div>
</template>
