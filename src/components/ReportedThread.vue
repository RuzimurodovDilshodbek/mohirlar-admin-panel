<script setup>
import { ref, computed, watch } from 'vue';
import { ConversationsApi, toApiError } from '@/lib/api';
import { fmtDateTime, timeAgoShort } from '@/lib/format';
import Spinner from '@/components/Spinner.vue';
import Icon from '@/components/Icon.vue';

/**
 * The conversation behind a reported message.
 *
 * A report used to arrive as a reason code and one truncated line — and as an
 * empty line when what was reported was a photo or a voice note. Nobody can
 * fairly decide "harassment" from that: the same sentence reads differently
 * depending on what came before it. This renders the thread so the decision has
 * something to rest on.
 *
 * It loads on demand rather than with the report. Opening private
 * correspondence is a deliberate act, it is audit-logged against the moderator
 * who did it, and it should not happen merely because a queue row was clicked.
 */
const props = defineProps({
  uuid: { type: String, required: true },
  /** id of the reported message, so it can be picked out of the thread. */
  reportedId: { type: [Number, String], default: null },
});

const open = ref(false);
const loading = ref(false);
const loadingMore = ref(false);
const error = ref(null);
const messages = ref([]);
const nextCursor = ref(null);
const viewer = ref(null);

// The API returns newest-first (it is a cursor walking backwards); a reader
// wants oldest-first, the way the conversation actually happened.
const ordered = computed(() => [...messages.value].reverse());

function isReported(m) {
  return props.reportedId != null && String(m.id) === String(props.reportedId);
}

function kindOf(a) {
  const mime = a?.mime || '';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const res = await ConversationsApi.messages(props.uuid);
    messages.value = res?.data ?? [];
    nextCursor.value = res?.meta?.next_cursor ?? null;
  } catch (e) {
    error.value = toApiError(e);
  } finally {
    loading.value = false;
  }
}

async function loadOlder() {
  if (!nextCursor.value || loadingMore.value) return;
  loadingMore.value = true;
  try {
    const res = await ConversationsApi.messages(props.uuid, { cursor: nextCursor.value });
    messages.value = [...messages.value, ...(res?.data ?? [])];
    nextCursor.value = res?.meta?.next_cursor ?? null;
  } catch (e) {
    error.value = toApiError(e);
  } finally {
    loadingMore.value = false;
  }
}

function toggle() {
  open.value = !open.value;
  if (open.value && !messages.value.length && !loading.value) load();
}

// A new report in the same modal must not show the previous thread.
watch(() => props.uuid, () => {
  open.value = false;
  messages.value = [];
  nextCursor.value = null;
  error.value = null;
});
</script>

<template>
  <section>
    <div class="flex items-center justify-between gap-3">
      <h4 class="field-label">Suhbat</h4>
      <button class="btn btn-neutral btn-sm" @click="toggle">
        <Icon :name="open ? 'up' : 'eye'" :size="15" />
        {{ open ? 'Yopish' : 'Suhbatni koʻrish' }}
      </button>
    </div>

    <p v-if="!open" class="mt-1 text-xs text-ink-4">
      Ochilishi audit jurnaliga yoziladi.
    </p>

    <div v-else class="mt-2">
      <div v-if="loading" class="flex justify-center py-6"><Spinner /></div>

      <p v-else-if="error" class="rounded-xl border border-line bg-elev/60 px-3 py-2 text-sm text-ink-2">
        {{ error.message || 'Suhbatni yuklab boʻlmadi.' }}
      </p>

      <p v-else-if="!messages.length" class="rounded-xl border border-line bg-elev/60 px-3 py-2 text-sm text-ink-2">
        Bu suhbatda xabar yoʻq.
      </p>

      <template v-else>
        <div class="max-h-96 space-y-2 overflow-y-auto rounded-xl border border-line bg-elev/40 p-3">
          <button
            v-if="nextCursor"
            class="btn btn-neutral btn-sm mx-auto block"
            :disabled="loadingMore"
            @click="loadOlder"
          >
            <Spinner v-if="loadingMore" :size="14" />
            Oldingi xabarlar
          </button>

          <div
            v-for="m in ordered"
            :key="m.id"
            class="rounded-lg border px-3 py-2 text-sm"
            :class="isReported(m)
              ? 'border-danger/40 bg-danger-soft/50'
              : 'border-line-2 bg-surface'"
          >
            <div class="mb-1 flex items-center gap-2 text-xs text-ink-4">
              <span class="font-mono">{{ String(m.from_user_id || '').slice(0, 8) }}</span>
              <span>·</span>
              <span :title="fmtDateTime(m.created_at)">{{ timeAgoShort(m.created_at) }}</span>
              <span v-if="isReported(m)" class="ml-auto font-medium text-danger">Shikoyat qilingan</span>
            </div>

            <p v-if="m.body" class="whitespace-pre-line break-words text-ink">{{ m.body }}</p>

            <div v-if="m.attachments?.length" class="mt-1.5 space-y-1.5">
              <div v-for="(a, i) in m.attachments" :key="i">
                <!-- The link is signed and time-limited; it is minted for this
                     request and is not a permanent address for the file. -->
                <button
                  v-if="kindOf(a) === 'image'"
                  class="block overflow-hidden rounded-lg border border-line"
                  @click="viewer = a.url"
                >
                  <img :src="a.url" :alt="a.name || 'Rasm'" class="max-h-40 object-cover" />
                </button>

                <audio v-else-if="kindOf(a) === 'audio'" :src="a.url" controls preload="none" class="w-full max-w-xs" />

                <a v-else :href="a.url" target="_blank" rel="noopener" class="link inline-flex items-center gap-1.5 text-sm break-all">
                  <Icon name="file" :size="14" />
                  {{ a.name || 'Fayl' }}
                </a>
              </div>
            </div>

            <p v-if="!m.body && !m.attachments?.length" class="text-ink-4 italic">({{ m.type }})</p>
          </div>
        </div>

        <p class="mt-1.5 text-xs text-ink-4">
          Faqat oʻqish uchun. Bu yerdan javob yozib boʻlmaydi.
        </p>
      </template>
    </div>

    <!-- Full-size image, so a reported photo can actually be judged. -->
    <div
      v-if="viewer"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
      @click="viewer = null"
    >
      <img :src="viewer" alt="" class="max-h-full max-w-full rounded-lg object-contain" />
    </div>
  </section>
</template>
