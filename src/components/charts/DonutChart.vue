<script setup>
import { computed, ref } from 'vue';
import { fmtNum } from '@/lib/format';

// Donut with a live centre: hovering a legend row or an arc pulls that slice's
// share into the middle, so the chart answers "how many employers?" without a
// second glance at the legend.
const props = defineProps({
  segments: { type: Array, default: () => [] },
  centerLabel: { type: String, default: '' },
});

const R = 44;
const C = 2 * Math.PI * R;
const hover = ref(null);

const total = computed(() => props.segments.reduce((a, s) => a + (s.value ?? 0), 0));

const arcs = computed(() => {
  const t = total.value;
  let acc = 0;
  return props.segments
    .map((s, i) => ({ ...s, i }))
    .filter((s) => (s.value ?? 0) > 0)
    .map((s) => {
      const frac = t ? (s.value ?? 0) / t : 0;
      // A 1.5px gap between slices reads as separation without a stroke that
      // would sit on the page colour and break in dark mode.
      const len = Math.max(0, frac * C - 1.5);
      const arc = {
        ...s,
        dash: `${len.toFixed(2)} ${(C - len).toFixed(2)}`,
        offset: (-acc * C).toFixed(2),
      };
      acc += frac;
      return arc;
    });
});

const rows = computed(() =>
  props.segments.map((s, i) => ({
    ...s,
    i,
    pct: total.value ? Math.round(((s.value ?? 0) / total.value) * 100) : 0,
  })),
);

const centre = computed(() => {
  const h = hover.value;
  const row = h == null ? null : rows.value[h];
  return row
    ? { value: fmtNum(row.value ?? 0), label: `${row.label} · ${row.pct}%` }
    : { value: fmtNum(total.value), label: props.centerLabel };
});
</script>

<template>
  <!-- The legend carries a `min-w`, so in a narrow card it wraps under the ring
       and gets the full width instead of clipping its labels to two letters. -->
  <div class="flex flex-wrap items-center gap-x-5 gap-y-4">
    <div class="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 120 120" class="h-full w-full -rotate-90">
        <circle cx="60" cy="60" :r="R" fill="none" stroke="var(--color-elev)" stroke-width="15" />
        <circle
          v-for="a in arcs" :key="a.label"
          cx="60" cy="60" :r="R" fill="none"
          :stroke="a.color" :stroke-width="hover === a.i ? 18 : 15"
          :stroke-dasharray="a.dash" :stroke-dashoffset="a.offset"
          stroke-linecap="butt"
          class="cursor-pointer transition-all duration-200"
          :style="{ opacity: hover == null || hover === a.i ? 1 : 0.35 }"
          @mouseenter="hover = a.i"
          @mouseleave="hover = null"
        />
      </svg>
      <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <div class="font-serif-display text-xl leading-none text-ink">{{ centre.value }}</div>
        <div class="mt-1 max-w-[68px] text-[10px] leading-tight text-ink-3">{{ centre.label }}</div>
      </div>
    </div>

    <ul class="min-w-[9rem] flex-1 space-y-1">
      <li
        v-for="s in rows" :key="s.label"
        class="flex cursor-default items-center gap-2 rounded-lg px-1.5 py-1 text-sm transition-colors"
        :class="hover === s.i ? 'bg-elev' : ''"
        @mouseenter="hover = s.i"
        @mouseleave="hover = null"
      >
        <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: s.color }" />
        <span class="min-w-0 flex-1 leading-tight text-ink-2">{{ s.label }}</span>
        <span class="shrink-0 text-ink-3 tabular-nums">{{ fmtNum(s.value ?? 0) }}</span>
        <span class="w-9 shrink-0 text-right text-xs text-ink-4 tabular-nums">{{ s.pct }}%</span>
      </li>
    </ul>
  </div>
</template>
