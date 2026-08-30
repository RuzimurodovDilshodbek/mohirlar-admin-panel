<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import Spinner from '@/components/Spinner.vue';

const props = defineProps({
  hasMore: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  // Rows already on screen — shown so "load more" is not the only feedback
  // that a cursor page arrived.
  count: { type: Number, default: null },
});
const emit = defineEmits(['more']);

// Scrolling to the end of a moderation queue and having to aim at a button is
// the kind of friction that gets a queue left half-read. The sentinel loads the
// next page on approach; the button stays for keyboard and reduced-motion use.
const sentinel = ref(null);
let io = null;

function connect() {
  disconnect();
  if (!sentinel.value || !props.hasMore) return;
  io = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && props.hasMore && !props.loading) emit('more');
    },
    { rootMargin: '320px 0px' },
  );
  io.observe(sentinel.value);
}
function disconnect() {
  io?.disconnect();
  io = null;
}

onMounted(connect);
onUnmounted(disconnect);
watch(() => props.hasMore, connect);
</script>

<template>
  <div class="mt-5 flex flex-col items-center gap-2">
    <div ref="sentinel" class="h-px w-full" />
    <button v-if="hasMore" class="btn btn-neutral" :disabled="loading" @click="emit('more')">
      <Spinner v-if="loading" :size="16" />
      {{ loading ? 'Yuklanmoqda…' : 'Koʻproq yuklash' }}
    </button>
    <p v-if="count != null" class="text-xs text-ink-4">
      {{ count }} ta yozuv{{ hasMore ? '' : ' · roʻyxat toʻliq' }}
    </p>
  </div>
</template>
