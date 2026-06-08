<script setup>
import { ref, watch } from 'vue';
import { UsersApi } from '@/lib/api';
import { useCursorList } from '@/lib/useCursorList';
import { USER_ROLES, USER_STATUSES, label, fmtDate } from '@/lib/format';
import { toastOk, toastErr } from '@/lib/toast';
import DataState from '@/components/DataState.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import UiKit from '@/components/UiKit.vue';

const list = useCursorList((params) => UsersApi.list(params));

const role = ref('all');
const status = ref('all');
const q = ref('');
let searchTimer = null;

const roleTabs = [{ value: 'all', label: 'Barchasi' }, ...USER_ROLES.map((v) => ({ value: v, label: label(v) }))];
const statusTabs = [{ value: 'all', label: 'Barcha holatlar' }, ...USER_STATUSES.map((v) => ({ value: v, label: label(v) }))];

function reload() {
  const params = {};
  if (role.value !== 'all') params.role = role.value;
  if (status.value !== 'all') params.status = status.value;
  if (q.value.trim()) params.q = q.value.trim();
  list.load(params);
}
watch([role, status], reload, { immediate: true });
watch(q, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(reload, 350);
});

// ─── Detail / edit modal ───
const selected = ref(null);
const saving = ref(false);
const editRole = ref('');
const editStatus = ref('');
const reason = ref('');

function open(user) {
  selected.value = user;
  editRole.value = user.role;
  editStatus.value = user.status;
  reason.value = '';
}
function close() {
  if (saving.value) return;
  selected.value = null;
}

async function save() {
  if (saving.value || !selected.value) return;
  const body = {};
  if (editRole.value !== selected.value.role) body.role = editRole.value;
  if (editStatus.value !== selected.value.status) body.status = editStatus.value;
  if (!Object.keys(body).length) { close(); return; }
  if (reason.value.trim()) body.reason = reason.value.trim();
  saving.value = true;
  try {
    const updated = await UsersApi.update(selected.value.id, body);
    list.patch(updated);
    toastOk('Foydalanuvchi yangilandi');
    selected.value = null;
  } catch (e) {
    toastErr(e?.response?.data?.error?.message || 'Saqlashda xatolik');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Filters -->
    <div class="space-y-3">
      <div class="relative max-w-sm">
        <svg viewBox="0 0 24 24" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-4"
          fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
        </svg>
        <input
          v-model="q" type="search" placeholder="Telefon yoki email boʻyicha qidirish"
          class="w-full h-10 rounded-xl border border-line bg-surface pl-9 pr-3 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
        />
      </div>
      <FilterTabs v-model="role" :options="roleTabs" />
      <FilterTabs v-model="status" :options="statusTabs" />
    </div>

    <DataState
      :loading="list.loading.value"
      :error="list.error.value"
      :empty="!list.items.value.length"
      empty-text="Foydalanuvchilar topilmadi"
      @retry="reload"
    >
      <div class="overflow-hidden rounded-2xl border border-line bg-surface">
        <table class="w-full text-sm">
          <thead class="bg-elev/60 text-ink-3 text-xs uppercase tracking-wide">
            <tr>
              <th class="text-left font-semibold px-4 py-3">Foydalanuvchi</th>
              <th class="text-left font-semibold px-4 py-3 hidden sm:table-cell">Rol</th>
              <th class="text-left font-semibold px-4 py-3">Holat</th>
              <th class="text-left font-semibold px-4 py-3 hidden md:table-cell">Roʻyxatdan oʻtgan</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr v-for="u in list.items.value" :key="u.id" class="hover:bg-elev/40 cursor-pointer" @click="open(u)">
              <td class="px-4 py-3">
                <div class="font-medium text-ink">{{ u.phone || '—' }}</div>
                <div class="text-ink-3 text-xs">{{ u.email || 'email yoʻq' }}</div>
              </td>
              <td class="px-4 py-3 hidden sm:table-cell">
                <StatusBadge :value="u.role" :dot="false" />
              </td>
              <td class="px-4 py-3"><StatusBadge :value="u.status" /></td>
              <td class="px-4 py-3 hidden md:table-cell text-ink-3">{{ fmtDate(u.created_at) }}</td>
              <td class="px-4 py-3 text-right">
                <svg viewBox="0 0 24 24" class="inline h-4 w-4 text-ink-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="list.nextCursor.value" class="mt-4 flex justify-center">
        <button
          class="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-medium hover:bg-elev disabled:opacity-50"
          :disabled="list.loadingMore.value"
          @click="list.loadMore()"
        >
          <UiKit v-if="list.loadingMore.value" class="!h-4 !w-4" />
          Koʻproq yuklash
        </button>
      </div>
    </DataState>

    <!-- Detail / edit -->
    <ModalDialog :open="!!selected" title="Foydalanuvchi" :subtitle="selected?.phone" @close="close">
      <div v-if="selected" class="space-y-4">
        <dl class="grid grid-cols-2 gap-3 text-sm">
          <div><dt class="text-ink-3 text-xs">Telefon</dt><dd class="text-ink font-medium">{{ selected.phone || '—' }}</dd></div>
          <div><dt class="text-ink-3 text-xs">Email</dt><dd class="text-ink font-medium">{{ selected.email || '—' }}</dd></div>
          <div><dt class="text-ink-3 text-xs">Til</dt><dd class="text-ink">{{ (selected.preferred_locale || '—').toUpperCase() }}</dd></div>
          <div><dt class="text-ink-3 text-xs">Telefon tasdiqi</dt><dd class="text-ink">{{ selected.phone_verified_at ? fmtDate(selected.phone_verified_at) : 'Yoʻq' }}</dd></div>
        </dl>

        <label class="block">
          <span class="text-xs font-semibold uppercase tracking-wide text-ink-3">Rol</span>
          <select v-model="editRole" class="mt-1.5 w-full h-11 rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent">
            <option v-for="r in USER_ROLES" :key="r" :value="r">{{ label(r) }}</option>
          </select>
        </label>

        <label class="block">
          <span class="text-xs font-semibold uppercase tracking-wide text-ink-3">Holat</span>
          <select v-model="editStatus" class="mt-1.5 w-full h-11 rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent">
            <option v-for="s in USER_STATUSES" :key="s" :value="s">{{ label(s) }}</option>
          </select>
        </label>

        <label class="block">
          <span class="text-xs font-semibold uppercase tracking-wide text-ink-3">Sabab (ixtiyoriy)</span>
          <input v-model="reason" type="text" maxlength="500" placeholder="Audit jurnaliga yoziladi"
            class="mt-1.5 w-full h-11 rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent" />
        </label>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <button class="rounded-xl border border-line px-4 py-2.5 text-sm font-medium hover:bg-elev" :disabled="saving" @click="close">Bekor qilish</button>
          <button class="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-ink/90 disabled:opacity-50" :disabled="saving" @click="save">
            <UiKit v-if="saving" class="!h-4 !w-4 !border-white/40 !border-t-white" />
            Saqlash
          </button>
        </div>
      </template>
    </ModalDialog>
  </div>
</template>
