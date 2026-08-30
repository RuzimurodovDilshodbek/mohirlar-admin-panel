<script setup>
import Icon from '@/components/Icon.vue';

defineProps({
  icon: { type: String, default: 'search' },
  title: { type: String, default: 'Hozircha hech narsa yoʻq' },
  hint: { type: String, default: '' },
  actionLabel: { type: String, default: '' },
  tone: { type: String, default: 'neutral' }, // neutral | danger
});
const emit = defineEmits(['action']);
</script>

<template>
  <div class="flex flex-col items-center justify-center px-6 py-16 text-center">
    <span
      class="flex h-14 w-14 items-center justify-center rounded-2xl"
      :class="tone === 'danger' ? 'bg-danger-soft text-danger-ink' : 'bg-elev text-ink-3'"
    >
      <Icon :name="icon" :size="24" />
    </span>
    <p class="mt-4 text-[15px] font-medium text-ink">{{ title }}</p>
    <p v-if="hint" class="mt-1 max-w-sm text-sm text-ink-3">{{ hint }}</p>
    <button v-if="actionLabel" class="btn btn-neutral mt-5" @click="emit('action')">
      {{ actionLabel }}
    </button>
  </div>
</template>
