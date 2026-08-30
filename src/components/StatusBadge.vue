<script setup>
import { computed } from 'vue';
import { label as fmtLabel, tone as fmtTone } from '@/lib/format';

const props = defineProps({
  value: { type: String, default: null },
  // override the auto label/tone if needed
  text: { type: String, default: null },
  tone: { type: String, default: null },
  dot: { type: Boolean, default: true },
  size: { type: String, default: 'md' }, // md | sm
});

const t = computed(() => props.tone || fmtTone(props.value));
const text = computed(() => props.text || fmtLabel(props.value));

const TONE_CLASS = {
  good: 'bg-good-soft text-good-ink border-good/25',
  warn: 'bg-warn-soft text-warn-ink border-warn/25',
  danger: 'bg-danger-soft text-danger-ink border-danger/25',
  info: 'bg-info-soft text-info-ink border-info/25',
  ai: 'bg-ai-soft text-ai-ink border-ai/25',
  accent: 'bg-accent-soft text-accent-ink border-accent/25',
  neutral: 'bg-elev text-ink-2 border-line',
};
const DOT_CLASS = {
  good: 'bg-good', warn: 'bg-warn', danger: 'bg-danger', info: 'bg-info',
  ai: 'bg-ai', accent: 'bg-accent', neutral: 'bg-ink-4',
};
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap"
    :class="[TONE_CLASS[t], size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs']"
  >
    <span v-if="dot" class="h-1.5 w-1.5 rounded-full" :class="DOT_CLASS[t]" />
    {{ text }}
  </span>
</template>
