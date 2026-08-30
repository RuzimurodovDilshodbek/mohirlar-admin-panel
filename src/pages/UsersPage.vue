<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { UsersApi, CommerceApi, toApiError } from '@/lib/api';
import { useCursorList } from '@/lib/useCursorList';
import { useQuerySync } from '@/lib/useQuerySync';
import { useAuthStore } from '@/stores/auth';
import { USER_ROLES, USER_STATUSES, label, fmtDate, fmtDateTime, timeAgoShort } from '@/lib/format';
import { toastOk, toastErr } from '@/lib/toast';
import { exportCsv } from '@/lib/csv';
import PageHeader from '@/components/PageHeader.vue';
import DataState from '@/components/DataState.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import SearchInput from '@/components/SearchInput.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import LoadMore from '@/components/LoadMore.vue';
import Avatar from '@/components/Avatar.vue';
import Spinner from '@/components/Spinner.vue';
import Icon from '@/components/Icon.vue';

const list = useCursorList((params) => UsersApi.list(params));
const auth = useAuthStore();
// Only a super-admin may change a role — the backend rejects it for moderators
// (UserController::update), so don't offer the control at all.
const canEditRole = computed(() => auth.isAdmin);

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
useQuerySync({ role, status, q }, { role: 'all', status: 'all', q: '' }, reload);
watch([role, status], reload, { immediate: true });
watch(q, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(reload, 350);
});

// "/" from anywhere on the page lands in the search box.
const searchEl = ref(null);
const focusSearch = () => searchEl.value?.focus();
onMounted(() => window.addEventListener('admin:focus-search', focusSearch));
onUnmounted(() => {
  window.removeEventListener('admin:focus-search', focusSearch);
  clearTimeout(searchTimer);
});

const displayName = (u) => u.full_name || u.phone || u.email || '—';
// An email-only account has nothing left to say on the second line: printing
// the email again under itself just looked like a rendering bug.
const secondary = (u) => {
  const sub = u.full_name ? [u.phone, u.email].filter(Boolean).join(' · ') : u.email || 'email yoʻq';
  return sub === displayName(u) ? '' : sub;
};
// Same rule for the detail header, which titles itself with displayName too.
const subtitleOf = (u) => [u.phone, u.email].filter((v) => v && v !== displayName(u)).join(' · ');

// ─── Plans ───
// Mirrors App\Models\Plan::FREE_CODE_* — the plan a user falls back to when no
// subscription is active. Picking it means "cancel the subscription", not
// "write a free one", which is exactly what the endpoint does.
const FREE_CODE = { candidate: 'cand_free', employer: 'emp_free' };
const PLAN_AUDIENCES = ['candidate', 'employer'];

const plans = ref([]);
let plansRequested = false;

async function loadPlans() {
  if (plansRequested) return;
  plansRequested = true;
  try {
    const res = await CommerceApi.plans();
    plans.value = Array.isArray(res) ? res : res?.data ?? [];
  } catch (e) {
    plansRequested = false; // let the next open retry
    toastErr(toApiError(e, 'Tariflar yuklanmadi').message);
  }
}

// ─── Detail / edit modal ───
const selected = ref(null);
const saving = ref(false);
const editRole = ref('');
const editStatus = ref('');
const reason = ref('');

const savingPlan = ref(false);
const editPlanCode = ref('');
const editPeriod = ref('monthly');
const planNote = ref('');

const canManagePlan = computed(() => auth.isAdmin && PLAN_AUDIENCES.includes(selected.value?.role));
const planOptions = computed(() => plans.value.filter((p) => p.audience === selected.value?.role));
const freeSelected = computed(() => editPlanCode.value === FREE_CODE[selected.value?.role]);
const dirty = computed(
  () =>
    !!selected.value &&
    (editRole.value !== selected.value.role || editStatus.value !== selected.value.status),
);

function open(user) {
  selected.value = user;
  editRole.value = user.role;
  editStatus.value = user.status;
  reason.value = '';

  editPlanCode.value = user.plan?.code || FREE_CODE[user.role] || '';
  editPeriod.value = user.plan?.billing_period || 'monthly';
  planNote.value = '';
  if (PLAN_AUDIENCES.includes(user.role) && auth.isAdmin) loadPlans();
}
function close() {
  if (saving.value || savingPlan.value) return;
  selected.value = null;
}

async function save() {
  if (saving.value || !selected.value) return;
  const body = {};
  if (canEditRole.value && editRole.value !== selected.value.role) body.role = editRole.value;
  if (editStatus.value !== selected.value.status) body.status = editStatus.value;
  if (!Object.keys(body).length) { close(); return; }
  if (reason.value.trim()) body.reason = reason.value.trim();
  saving.value = true;
  try {
    const updated = await UsersApi.update(selected.value.id, body);
    syncRow(updated);
    toastOk('Foydalanuvchi yangilandi');
    selected.value = null;
  } catch (e) {
    toastErr(toApiError(e, 'Saqlashda xatolik').message);
  } finally {
    saving.value = false;
  }
}

// A row whose new status no longer matches the active filter has to leave the
// list, or the table shows a "Faol" badge under a "Bloklangan" filter.
function syncRow(updated) {
  if (status.value !== 'all' && updated.status !== status.value) list.remove(updated.id);
  else if (role.value !== 'all' && updated.role !== role.value) list.remove(updated.id);
  else list.patch(updated);
}

// ─── Inline block / unblock ───
// The most frequent moderation action on this page was four clicks deep in a
// modal. It is one click here, with a confirm for the destructive direction.
const pendingBlock = ref(null);
const blocking = ref(false);

async function applyStatus(user, next, why) {
  const body = { status: next };
  if (why) body.reason = why;
  const updated = await UsersApi.update(user.id, body);
  syncRow(updated);
  if (selected.value?.id === updated.id) selected.value = { ...selected.value, ...updated };
  return updated;
}

async function confirmBlock() {
  if (blocking.value || !pendingBlock.value) return;
  blocking.value = true;
  try {
    await applyStatus(pendingBlock.value, 'suspended', 'Roʻyxatdan tez bloklash');
    toastOk('Foydalanuvchi bloklandi');
    pendingBlock.value = null;
  } catch (e) {
    toastErr(toApiError(e, 'Bloklab boʻlmadi').message);
  } finally {
    blocking.value = false;
  }
}

const unblocking = ref(null);
async function unblock(user) {
  if (unblocking.value) return;
  unblocking.value = user.id;
  try {
    await applyStatus(user, 'active');
    toastOk('Blok olib tashlandi');
  } catch (e) {
    toastErr(toApiError(e, 'Xatolik').message);
  } finally {
    unblocking.value = null;
  }
}

// Deliberately separate from save(): it hits a different endpoint and cancels
// the user's current subscription, so folding it into the same button would
// leave the admin guessing which half of a partial failure went through.
async function savePlan() {
  if (savingPlan.value || !selected.value || !editPlanCode.value) return;
  savingPlan.value = true;
  try {
    const updated = await UsersApi.setPlan(selected.value.id, {
      plan_code: editPlanCode.value,
      billing_period: editPeriod.value,
      note: planNote.value.trim() || undefined,
    });
    list.patch(updated);
    selected.value = { ...selected.value, ...updated };
    planNote.value = '';
    toastOk(updated.plan ? `Tarif oʻzgartirildi: ${updated.plan.name}` : 'Foydalanuvchi bepul tarifga oʻtkazildi');
  } catch (e) {
    toastErr(toApiError(e, 'Tarifni oʻzgartirib boʻlmadi').message);
  } finally {
    savingPlan.value = false;
  }
}

const planCell = (u) => (PLAN_AUDIENCES.includes(u.role) ? (u.plan?.name || 'Bepul') : '—');

function download() {
  exportCsv(
    'mohirlar-foydalanuvchilar',
    [
      { label: 'Ism', get: (u) => u.full_name || '' },
      { label: 'Telefon', key: 'phone' },
      { label: 'Email', key: 'email' },
      { label: 'Rol', get: (u) => label(u.role) },
      { label: 'Holat', get: (u) => label(u.status) },
      { label: 'Kompaniya', get: (u) => u.company?.name || '' },
      { label: 'Tarif', get: (u) => planCell(u) },
      { label: 'Roʻyxatdan oʻtgan', get: (u) => fmtDate(u.created_at) },
    ],
    list.items.value,
  );
  toastOk(`${list.items.value.length} ta yozuv yuklab olindi`);
}
</script>

<template>
  <div class="space-y-5">
    <PageHeader
      description="Hisoblarni qidiring, rol va holatni oʻzgartiring, tarif biriktiring. Har bir oʻzgarish audit jurnaliga tushadi."
    >
      <template #actions>
        <button class="btn btn-neutral btn-sm" :disabled="!list.items.value.length" @click="download">
          <Icon name="download" :size="15" /> CSV
        </button>
      </template>
    </PageHeader>

    <!-- Filters -->
    <div class="space-y-3">
      <SearchInput ref="searchEl" v-model="q" placeholder="Ism, telefon yoki email boʻyicha qidirish" />
      <div class="flex flex-wrap gap-x-6 gap-y-2">
        <FilterTabs v-model="role" :options="roleTabs" />
        <FilterTabs v-model="status" :options="statusTabs" />
      </div>
    </div>

    <DataState
      :loading="list.loading.value"
      :error="list.error.value"
      :empty="!list.items.value.length"
      empty-text="Foydalanuvchilar topilmadi"
      empty-hint="Qidiruv soʻzini yoki filtrlarni oʻzgartirib koʻring."
      empty-icon="users"
      skeleton="table"
      @retry="reload"
    >
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="tbl min-w-[720px]">
            <thead>
              <tr>
                <th>Foydalanuvchi</th>
                <th class="hidden sm:table-cell">Rol</th>
                <th>Holat</th>
                <th class="hidden md:table-cell">Tarif</th>
                <th class="hidden xl:table-cell">Faollik</th>
                <th class="hidden lg:table-cell">Roʻyxatdan</th>
                <th class="w-24"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in list.items.value" :key="u.id" class="group cursor-pointer" @click="open(u)">
                <td>
                  <div class="flex items-center gap-3">
                    <Avatar :name="displayName(u)" :src="u.avatar_url" :seed="u.id" :size="36" />
                    <div class="min-w-0">
                      <div class="truncate font-medium text-ink">{{ displayName(u) }}</div>
                      <div v-if="secondary(u)" class="truncate text-xs text-ink-3">{{ secondary(u) }}</div>
                    </div>
                  </div>
                </td>
                <td class="hidden sm:table-cell">
                  <StatusBadge :value="u.role" :dot="false" size="sm" />
                  <div v-if="u.company?.name" class="mt-1 max-w-[160px] truncate text-xs text-ink-4">{{ u.company.name }}</div>
                </td>
                <td><StatusBadge :value="u.status" size="sm" /></td>
                <td class="hidden md:table-cell">
                  <span :class="u.plan ? 'text-ink-2' : 'text-ink-4'">{{ planCell(u) }}</span>
                  <!-- Marks a plan an admin attached by hand rather than one that
                       was bought — the same flag that keeps it out of MRR. -->
                  <span v-if="u.plan?.granted_by_admin" class="ml-1 text-xs text-ink-4">· qoʻlda</span>
                </td>
                <td class="hidden text-ink-3 xl:table-cell">{{ u.last_active_at ? timeAgoShort(u.last_active_at) : '—' }}</td>
                <td class="hidden text-ink-3 lg:table-cell">{{ fmtDate(u.created_at) }}</td>
                <td>
                  <div class="flex items-center justify-end gap-1" @click.stop>
                    <button
                      v-if="u.status === 'active'"
                      class="icon-btn opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-danger-soft hover:text-danger-ink"
                      title="Bloklash"
                      @click="pendingBlock = u"
                    >
                      <Icon name="ban" :size="16" />
                    </button>
                    <button
                      v-else-if="u.status === 'suspended'"
                      class="icon-btn hover:bg-good-soft hover:text-good-ink"
                      title="Blokni olib tashlash"
                      :disabled="unblocking === u.id"
                      @click="unblock(u)"
                    >
                      <Spinner v-if="unblocking === u.id" :size="14" />
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

    <!-- ─── Detail / edit ─── -->
    <ModalDialog
      :open="!!selected"
      :title="selected ? displayName(selected) : ''"
      :subtitle="selected ? subtitleOf(selected) : ''"
      :dismissible="!saving && !savingPlan"
      @close="close"
    >
      <div v-if="selected" class="space-y-5">
        <div class="flex items-center gap-3">
          <Avatar :name="displayName(selected)" :src="selected.avatar_url" :seed="selected.id" :size="48" />
          <div class="flex flex-wrap gap-2">
            <StatusBadge :value="selected.role" :dot="false" />
            <StatusBadge :value="selected.status" />
            <span v-if="selected.company?.name" class="chip">
              <Icon name="building" :size="12" /> {{ selected.company.name }}
            </span>
          </div>
        </div>

        <dl class="panel grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 text-sm">
          <div class="min-w-0">
            <dt class="text-xs text-ink-3">Telefon</dt>
            <dd class="truncate font-medium text-ink">{{ selected.phone || '—' }}</dd>
          </div>
          <div class="min-w-0">
            <dt class="text-xs text-ink-3">Email</dt>
            <dd class="truncate font-medium text-ink">{{ selected.email || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-3">Til</dt>
            <dd class="text-ink">{{ (selected.preferred_locale || '—').toUpperCase() }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-3">Telefon tasdiqi</dt>
            <dd class="text-ink">{{ selected.phone_verified_at ? fmtDate(selected.phone_verified_at) : 'Yoʻq' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-3">Roʻyxatdan oʻtgan</dt>
            <dd class="text-ink">{{ fmtDate(selected.created_at) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-3">Oxirgi faollik</dt>
            <dd class="text-ink">{{ selected.last_active_at ? fmtDateTime(selected.last_active_at) : '—' }}</dd>
          </div>
        </dl>

        <div class="grid gap-3 sm:grid-cols-2">
          <label v-if="canEditRole" class="block">
            <span class="field-label">Rol</span>
            <select v-model="editRole" class="select mt-1.5">
              <option v-for="r in USER_ROLES" :key="r" :value="r">{{ label(r) }}</option>
            </select>
          </label>
          <div v-else class="block">
            <span class="field-label">Rol</span>
            <div class="panel mt-1.5 flex h-11 items-center gap-2 px-3 text-sm text-ink-2">
              {{ label(selected.role) }}
              <span class="text-xs text-ink-4">— faqat administrator</span>
            </div>
          </div>

          <label class="block">
            <span class="field-label">Holat</span>
            <select v-model="editStatus" class="select mt-1.5">
              <option v-for="s in USER_STATUSES" :key="s" :value="s">{{ label(s) }}</option>
            </select>
          </label>
        </div>

        <label class="block">
          <span class="field-label">Sabab (ixtiyoriy)</span>
          <input v-model="reason" type="text" maxlength="500" placeholder="Audit jurnaliga yoziladi" class="input mt-1.5" />
        </label>

        <!-- Tarif — o'z tugmasi bilan, chunki bu boshqa endpoint va eski
             obunani bekor qiladi. -->
        <div v-if="canManagePlan" class="panel space-y-3 p-4">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <span class="field-label">Tarif</span>
            <span class="text-xs text-ink-4">
              <template v-if="selected.plan">
                Hozir: {{ selected.plan.name }} · {{ label(selected.plan.billing_period) }} · {{ fmtDate(selected.plan.ends_at) }} gacha
              </template>
              <template v-else>Hozir: Bepul (obuna yoʻq)</template>
            </span>
          </div>

          <select v-model="editPlanCode" :disabled="!planOptions.length" class="select">
            <option v-if="!planOptions.length" value="">Tariflar yuklanmoqda…</option>
            <option v-for="p in planOptions" :key="p.code" :value="p.code">{{ p.name || p.name_uz }}</option>
          </select>

          <!-- The free plan is the absence of a subscription, so a term would
               mean nothing there. -->
          <div v-if="!freeSelected" class="flex gap-2">
            <button
              v-for="p in ['monthly', 'yearly']" :key="p" type="button"
              class="h-10 flex-1 rounded-xl border text-sm font-medium transition-colors"
              :class="editPeriod === p ? 'border-accent bg-accent-soft text-ink' : 'border-line bg-surface text-ink-2 hover:bg-elev'"
              @click="editPeriod = p"
            >{{ label(p) }}</button>
          </div>

          <input v-model="planNote" type="text" maxlength="500" placeholder="Sabab — audit jurnaliga yoziladi" class="input" />

          <button class="btn btn-neutral w-full" :disabled="savingPlan || !editPlanCode" @click="savePlan">
            <Spinner v-if="savingPlan" :size="16" />
            Tarifni oʻzgartirish
          </button>

          <p class="text-xs leading-relaxed text-ink-4">
            Qoʻlda berilgan tarif daromad hisobiga (MRR) qoʻshilmaydi va muddati tugaganda oʻzi yangilanmaydi.
            Bepul tarif tanlansa, amaldagi obuna bekor qilinadi.
          </p>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <span v-if="dirty" class="mr-auto text-xs text-warn-ink">Saqlanmagan oʻzgarishlar bor</span>
          <button class="btn btn-neutral" :disabled="saving" @click="close">Bekor qilish</button>
          <button class="btn btn-primary" :disabled="saving || !dirty" @click="save">
            <Spinner v-if="saving" :size="16" on-fill />
            Saqlash
          </button>
        </div>
      </template>
    </ModalDialog>

    <ConfirmDialog
      :open="!!pendingBlock"
      title="Foydalanuvchini bloklash"
      :message="pendingBlock ? `${displayName(pendingBlock)} hisobi bloklanadi — u tizimga kira olmaydi. Keyinroq blokni olib tashlash mumkin.` : ''"
      confirm-label="Bloklash"
      :busy="blocking"
      @confirm="confirmBlock"
      @cancel="pendingBlock = null"
    />
  </div>
</template>
