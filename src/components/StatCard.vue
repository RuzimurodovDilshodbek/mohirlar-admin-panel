<script setup>
// KPI stat card — icon chip, big value, label, optional sub/trend line.
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '—' },
  sub: { type: String, default: '' },
  icon: { type: String, default: '' }, // SVG path `d`
  tone: { type: String, default: 'accent' }, // accent | info | ai | warn | good | neutral
  trend: { type: String, default: '' }, // e.g. "+12" — shown as a soft pill
  trendTone: { type: String, default: 'good' },
});

const TONE = {
  accent: 'bg-accent-soft text-accent-ink',
  info: 'bg-info-soft text-info',
  ai: 'bg-ai-soft text-ai',
  warn: 'bg-warn-soft text-warn',
  good: 'bg-good-soft text-good',
  neutral: 'bg-elev text-ink-2',
};
const TREND = {
  good: 'bg-good-soft text-good',
  warn: 'bg-warn-soft text-warn',
  info: 'bg-info-soft text-info',
  neutral: 'bg-elev text-ink-3',
};
</script>

<template>
  <div class="rounded-2xl border border-line bg-surface p-5 hover:shadow-sm transition-shadow">
    <div class="flex items-center justify-between">
      <span class="h-10 w-10 rounded-xl flex items-center justify-center" :class="TONE[tone]">
        <svg v-if="icon" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor"
          stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path :d="icon" /></svg>
      </span>
      <span v-if="trend" class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="TREND[trendTone]">
        {{ trend }}
      </span>
    </div>
    <div class="mt-3 font-serif-display text-3xl text-ink leading-none">{{ value }}</div>
    <div class="mt-1.5 text-sm text-ink-2 font-medium">{{ label }}</div>
    <div v-if="sub" class="text-xs text-ink-3 mt-0.5">{{ sub }}</div>
  </div>
</template>
