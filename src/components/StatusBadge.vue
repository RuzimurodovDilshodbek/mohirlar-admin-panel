<script setup>
import { computed } from 'vue';
import { label as fmtLabel, tone as fmtTone } from '@/lib/format';

const props = defineProps({
  value: { type: String, default: null },
  // override the auto label/tone if needed
  text: { type: String, default: null },
  tone: { type: String, default: null },
  dot: { type: Boolean, default: true },
});

const t = computed(() => props.tone || fmtTone(props.value));
const text = computed(() => props.text || fmtLabel(props.value));

const TONE_CLASS = {
  good: 'bg-good-soft text-good border-good/20',
  warn: 'bg-warn-soft text-warn border-warn/20',
  danger: 'bg-warn-soft text-warn border-warn/25',
  info: 'bg-info-soft text-info border-info/20',
  ai: 'bg-ai-soft text-ai border-ai/20',
  accent: 'bg-accent-soft text-accent-ink border-accent/20',
  neutral: 'bg-elev text-ink-2 border-line',
};
const DOT_CLASS = {
  good: 'bg-good', warn: 'bg-warn', danger: 'bg-warn', info: 'bg-info',
  ai: 'bg-ai', accent: 'bg-accent', neutral: 'bg-ink-4',
};
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap"
    :class="TONE_CLASS[t]"
  >
    <span v-if="dot" class="h-1.5 w-1.5 rounded-full" :class="DOT_CLASS[t]" />
    {{ text }}
  </span>
</template>
