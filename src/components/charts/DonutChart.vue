<script setup>
import { computed } from 'vue';
import { fmtNum } from '@/lib/format';

// Donut chart with a centred total and a legend.
// segments: [{ label, value, color }]
const props = defineProps({
  segments: { type: Array, default: () => [] },
  centerLabel: { type: String, default: '' },
});

const R = 44;
const C = 2 * Math.PI * R;

const total = computed(() => props.segments.reduce((a, s) => a + (s.value ?? 0), 0));

const arcs = computed(() => {
  const t = total.value;
  let acc = 0;
  return props.segments
    .filter((s) => (s.value ?? 0) > 0)
    .map((s) => {
      const frac = t ? (s.value ?? 0) / t : 0;
      const arc = {
        ...s,
        dash: `${(frac * C).toFixed(2)} ${(C - frac * C).toFixed(2)}`,
        offset: (-acc * C).toFixed(2),
        pctVal: t ? Math.round(frac * 100) : 0,
      };
      acc += frac;
      return arc;
    });
});
</script>

<template>
  <div class="flex items-center gap-5">
    <svg viewBox="0 0 120 120" class="h-32 w-32 shrink-0 -rotate-90">
      <circle cx="60" cy="60" :r="R" fill="none" stroke="var(--color-elev)" stroke-width="16" />
      <circle
        v-for="a in arcs" :key="a.label"
        cx="60" cy="60" :r="R" fill="none"
        :stroke="a.color" stroke-width="16"
        :stroke-dasharray="a.dash" :stroke-dashoffset="a.offset"
        stroke-linecap="butt"
      />
    </svg>
    <div class="min-w-0 flex-1">
      <div class="mb-2">
        <div class="font-serif-display text-2xl text-ink leading-none">{{ fmtNum(total) }}</div>
        <div class="text-xs text-ink-3">{{ centerLabel }}</div>
      </div>
      <ul class="space-y-1.5">
        <li v-for="s in segments" :key="s.label" class="flex items-center gap-2 text-sm">
          <span class="h-2.5 w-2.5 rounded-full shrink-0" :style="{ background: s.color }" />
          <span class="text-ink-2 flex-1 truncate">{{ s.label }}</span>
          <span class="text-ink-3 tabular-nums">{{ fmtNum(s.value ?? 0) }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
