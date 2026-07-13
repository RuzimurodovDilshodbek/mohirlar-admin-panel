<script setup>
import { computed } from 'vue';
import { fmtNum } from '@/lib/format';

// Horizontal funnel — each stage bar is sized relative to the first (top) stage.
// stages: [{ label, value, color }]
const props = defineProps({
  stages: { type: Array, default: () => [] },
});

const top = computed(() => Math.max(1, props.stages[0]?.value ?? 0));
const rows = computed(() =>
  props.stages.map((s, i) => ({
    ...s,
    width: Math.max(2, Math.round(((s.value ?? 0) / top.value) * 100)),
    conv: i === 0 ? 100 : Math.round(((s.value ?? 0) / top.value) * 100),
    num: fmtNum(s.value ?? 0),
  })),
);
</script>

<template>
  <div class="space-y-3">
    <div v-for="(r, i) in rows" :key="r.label" class="group">
      <div class="flex items-center justify-between text-sm mb-1">
        <span class="text-ink-2 font-medium">{{ r.label }}</span>
        <span class="text-ink-3 tabular-nums">
          {{ r.num }}<span v-if="i > 0" class="text-ink-4"> · {{ r.conv }}%</span>
        </span>
      </div>
      <div class="h-8 rounded-lg bg-elev overflow-hidden">
        <div class="h-full rounded-lg transition-all duration-500 flex items-center"
          :style="{ width: r.width + '%', background: r.color }" />
      </div>
    </div>
  </div>
</template>
