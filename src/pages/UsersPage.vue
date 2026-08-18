<script setup>
import { ref, watch, computed } from 'vue';
import { UsersApi, CommerceApi, toApiError } from '@/lib/api';
import { useCursorList } from '@/lib/useCursorList';
import { useAuthStore } from '@/stores/auth';
import { USER_ROLES, USER_STATUSES, label, fmtDate } from '@/lib/format';
import { toastOk, toastErr } from '@/lib/toast';
import DataState from '@/components/DataState.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import UiKit from '@/components/UiKit.vue';

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
watch([role, status], reload, { immediate: true });
watch(q, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(reload, 350);
});

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

// A plan belongs to an audience, so it only makes sense for the two account
// kinds that have one. Staff accounts are refused by the API too.
const canManagePlan = computed(() => auth.isAdmin && PLAN_AUDIENCES.includes(selected.value?.role));
const planOptions = computed(() => plans.value.filter((p) => p.audience === selected.value?.role));
const freeSelected = computed(() => editPlanCode.value === FREE_CODE[selected.value?.role]);

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
    list.patch(updated);
    toastOk('Foydalanuvchi yangilandi');
    selected.value = null;
  } catch (e) {
    toastErr(toApiError(e, 'Saqlashda xatolik').message);
  } finally {
    saving.value = false;
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
              <!-- Tarif outranks the signup date for space: on a page that now
                   manages plans, the date is the one worth dropping first. A
                   windowed browser sits around 950px, where lg: would have hidden
                   the plan entirely. -->
              <th class="text-left font-semibold px-4 py-3 hidden md:table-cell">Tarif</th>
              <th class="text-left font-semibold px-4 py-3 hidden lg:table-cell">Roʻyxatdan oʻtgan</th>
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
              <td class="px-4 py-3 hidden md:table-cell">
                <span :class="u.plan ? 'text-ink-2' : 'text-ink-4'">{{ planCell(u) }}</span>
                <!-- Marks a plan an admin attached by hand rather than one that
                     was bought — the same flag that keeps it out of MRR. -->
                <span v-if="u.plan?.granted_by_admin" class="ml-1 text-xs text-ink-4">· qoʻlda</span>
              </td>
              <td class="px-4 py-3 hidden lg:table-cell text-ink-3">{{ fmtDate(u.created_at) }}</td>
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

        <label v-if="canEditRole" class="block">
          <span class="text-xs font-semibold uppercase tracking-wide text-ink-3">Rol</span>
          <select v-model="editRole" class="mt-1.5 w-full h-11 rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent">
            <option v-for="r in USER_ROLES" :key="r" :value="r">{{ label(r) }}</option>
          </select>
        </label>
        <div v-else class="block">
          <span class="text-xs font-semibold uppercase tracking-wide text-ink-3">Rol</span>
          <div class="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-line bg-elev/50 px-3 text-sm text-ink-2">
            {{ label(selected.role) }}
            <span class="text-xs text-ink-4">— faqat administrator oʻzgartiradi</span>
          </div>
        </div>

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

        <!-- Tarif — o'z tugmasi bilan, chunki bu boshqa endpoint va eski
             obunani bekor qiladi. -->
        <div v-if="canManagePlan" class="rounded-xl border border-line bg-elev/30 p-4 space-y-3">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <span class="text-xs font-semibold uppercase tracking-wide text-ink-3">Tarif</span>
            <span class="text-xs text-ink-4">
              <template v-if="selected.plan">
                Hozir: {{ selected.plan.name }} · {{ label(selected.plan.billing_period) }} · {{ fmtDate(selected.plan.ends_at) }} gacha
              </template>
              <template v-else>Hozir: Bepul (obuna yoʻq)</template>
            </span>
          </div>

          <select v-model="editPlanCode" :disabled="!planOptions.length"
            class="w-full h-11 rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent disabled:opacity-50">
            <option v-if="!planOptions.length" value="">Tariflar yuklanmoqda…</option>
            <option v-for="p in planOptions" :key="p.code" :value="p.code">{{ p.name || p.name_uz }}</option>
          </select>

          <!-- The free plan is the absence of a subscription, so a term would
               mean nothing there. -->
          <div v-if="!freeSelected" class="flex gap-2">
            <button v-for="p in ['monthly', 'yearly']" :key="p" type="button"
              class="flex-1 h-10 rounded-xl border text-sm font-medium capitalize"
              :class="editPeriod === p ? 'border-accent bg-accent/10 text-ink' : 'border-line bg-surface text-ink-2 hover:bg-elev'"
              @click="editPeriod = p">
              {{ label(p) }}
            </button>
          </div>

          <input v-model="planNote" type="text" maxlength="500" placeholder="Sabab — audit jurnaliga yoziladi"
            class="w-full h-11 rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent" />

          <button
            class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium hover:bg-elev disabled:opacity-50"
            :disabled="savingPlan || !editPlanCode" @click="savePlan">
            <UiKit v-if="savingPlan" class="!h-4 !w-4" />
            Tarifni oʻzgartirish
          </button>

          <p class="text-xs text-ink-4">
            Qoʻlda berilgan tarif daromad hisobiga (MRR) qoʻshilmaydi va muddati tugaganda oʻzi yangilanmaydi.
            Bepul tarif tanlansa, amaldagi obuna bekor qilinadi.
          </p>
        </div>
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
