<script setup>
import { computed } from 'vue';
import { initials, avatarTone } from '@/lib/format';

const props = defineProps({
  name: { type: String, default: '' },
  src: { type: String, default: '' },
  seed: { type: String, default: '' },
  size: { type: Number, default: 36 },
  square: { type: Boolean, default: false },
});

const TONE = {
  accent: 'bg-accent-soft text-accent-ink',
  info: 'bg-info-soft text-info-ink',
  ai: 'bg-ai-soft text-ai-ink',
  good: 'bg-good-soft text-good-ink',
  warn: 'bg-warn-soft text-warn-ink',
};
const cls = computed(() => TONE[avatarTone(props.seed || props.name)]);
const text = computed(() => initials(props.name));
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center overflow-hidden font-semibold"
    :class="[cls, square ? 'rounded-xl' : 'rounded-full']"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.36)}px` }"
    :title="name || undefined"
  >
    <img v-if="src" :src="src" :alt="name" class="h-full w-full object-cover" />
    <template v-else>{{ text }}</template>
  </span>
</template>
