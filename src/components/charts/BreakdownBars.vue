<script setup>
import { computed } from 'vue';
import { fmtNum } from '@/lib/format';

// Compact labelled proportion bars. The bar length and the printed percentage
// are the SAME number — share of the TOTAL, which is what a reader wants ("a
// third of the jobs are paused"). Sizing the bar against the largest value
// instead used to draw a half-width bar next to the label "14%".
const props = defineProps({
  items: { type: Array, default: () => [] },
  showPct: { type: Boolean, default: true },
});

const total = computed(() => props.items.reduce((a, i) => a + (i.value ?? 0), 0));
const rows = computed(() =>
  props.items.map((i) => {
    const pct = total.value ? Math.round(((i.value ?? 0) / total.value) * 100) : 0;
    // A non-zero value keeps a sliver of bar so the row never reads as empty.
    return { ...i, pct, width: (i.value ?? 0) > 0 ? Math.max(2, pct) : 0 };
  }),
);
</script>

<template>
  <ul class="space-y-3">
    <li v-for="r in rows" :key="r.label">
      <div class="mb-1.5 flex items-center justify-between gap-3 text-sm">
        <span class="truncate text-ink-2">{{ r.label }}</span>
        <span class="shrink-0 font-medium text-ink tabular-nums">
          {{ fmtNum(r.value ?? 0) }}
          <span v-if="showPct" class="ml-1 text-xs font-normal text-ink-4">{{ r.pct }}%</span>
        </span>
      </div>
      <div class="h-1.5 overflow-hidden rounded-full bg-elev">
        <div
          class="h-full rounded-full transition-[width] duration-700"
          :style="{ width: r.width + '%', background: r.color, transitionTimingFunction: 'var(--ease-out)' }"
        />
      </div>
    </li>
  </ul>
</template>
