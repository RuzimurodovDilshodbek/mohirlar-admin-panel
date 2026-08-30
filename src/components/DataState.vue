<script setup>
import Skeleton from '@/components/Skeleton.vue';
import EmptyState from '@/components/EmptyState.vue';

defineProps({
  loading: { type: Boolean, default: false },
  error: { type: [String, Object], default: null },
  empty: { type: Boolean, default: false },
  emptyText: { type: String, default: 'Hozircha hech narsa yoʻq' },
  emptyHint: { type: String, default: '' },
  emptyIcon: { type: String, default: 'search' },
  // Shape of the loading placeholder — matches what the slot will render.
  skeleton: { type: String, default: 'table' },
  skeletonRows: { type: Number, default: 6 },
});
const emit = defineEmits(['retry']);
</script>

<template>
  <Skeleton v-if="loading" :variant="skeleton" :rows="skeletonRows" />

  <div v-else-if="error" class="card">
    <EmptyState
      icon="alert"
      tone="danger"
      title="Maʼlumotni yuklab boʻlmadi"
      :hint="typeof error === 'string' ? error : error.message"
      action-label="Qayta urinish"
      @action="emit('retry')"
    />
  </div>

  <div v-else-if="empty" class="card">
    <EmptyState :icon="emptyIcon" :title="emptyText" :hint="emptyHint" />
  </div>

  <slot v-else />
</template>
