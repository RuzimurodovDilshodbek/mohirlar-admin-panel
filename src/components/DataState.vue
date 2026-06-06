<script setup>
import UiKit from '@/components/UiKit.vue';

defineProps({
  loading: { type: Boolean, default: false },
  error: { type: [String, Object], default: null },
  empty: { type: Boolean, default: false },
  emptyText: { type: String, default: 'Hozircha hech narsa yoʻq' },
});
const emit = defineEmits(['retry']);
</script>

<template>
  <div v-if="loading" class="flex flex-col items-center justify-center gap-3 py-16 text-ink-3">
    <UiKit />
    <span class="text-sm">Yuklanmoqda…</span>
  </div>

  <div v-else-if="error" class="flex flex-col items-center justify-center gap-3 py-16 text-center">
    <div class="h-12 w-12 rounded-2xl bg-warn-soft flex items-center justify-center text-warn text-xl">!</div>
    <p class="text-sm text-ink-2 max-w-sm">{{ typeof error === 'string' ? error : error.message }}</p>
    <button class="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-elev" @click="emit('retry')">
      Qayta urinish
    </button>
  </div>

  <div v-else-if="empty" class="flex flex-col items-center justify-center gap-3 py-16 text-center">
    <div class="h-12 w-12 rounded-2xl bg-elev flex items-center justify-center text-ink-3 text-xl">∅</div>
    <p class="text-sm text-ink-3">{{ emptyText }}</p>
  </div>

  <slot v-else />
</template>
