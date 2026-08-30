<script setup>
import { computed } from 'vue';
import { fmtNum } from '@/lib/format';

// Horizontal funnel. Two conversions matter and they answer different
// questions: share of the TOP stage (how much of the traffic survived) and
// share of the PREVIOUS one (which step is actually leaking).
const props = defineProps({
  stages: { type: Array, default: () => [] },
});

const top = computed(() => Math.max(1, props.stages[0]?.value ?? 0));
const rows = computed(() =>
  props.stages.map((s, i) => {
    const prev = i === 0 ? null : props.stages[i - 1]?.value ?? 0;
    const value = s.value ?? 0;
    return {
      ...s,
      width: Math.max(1.5, ((value / top.value) * 100)),
      ofTop: Math.round((value / top.value) * 100),
      ofPrev: prev ? Math.round((value / prev) * 100) : null,
      num: fmtNum(value),
      // A step that keeps under a third of the previous one is where the
      // funnel is actually failing — say so instead of leaving it to arithmetic.
      weak: prev != null && prev > 0 && value / prev < 0.33,
    };
  }),
);
</script>

<template>
  <div class="space-y-3.5">
    <div v-for="(r, i) in rows" :key="r.label">
      <div class="mb-1.5 flex items-center justify-between gap-3 text-sm">
        <span class="truncate font-medium text-ink-2">{{ r.label }}</span>
        <span class="shrink-0 tabular-nums">
          <span class="font-semibold text-ink">{{ r.num }}</span>
          <span v-if="i > 0" class="ml-2 text-xs text-ink-4">{{ r.ofTop }}% jami</span>
          <span
            v-if="r.ofPrev != null"
            class="ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium"
            :class="r.weak ? 'bg-danger-soft text-danger-ink' : 'bg-elev text-ink-3'"
          >↓ {{ r.ofPrev }}%</span>
        </span>
      </div>
      <div class="h-7 overflow-hidden rounded-lg bg-elev">
        <div
          class="h-full rounded-lg transition-[width] duration-700"
          :style="{ width: r.width + '%', background: r.color, transitionTimingFunction: 'var(--ease-out)' }"
        />
      </div>
    </div>
  </div>
</template>
