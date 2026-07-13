<script setup>
import { computed } from 'vue';
import { fmtNum } from '@/lib/format';

// Compact labelled proportion bars (each bar relative to the largest value).
// items: [{ label, value, color }]
const props = defineProps({
  items: { type: Array, default: () => [] },
});

const max = computed(() => Math.max(1, ...props.items.map((i) => i.value ?? 0)));
const rows = computed(() =>
  props.items.map((i) => ({ ...i, width: Math.max(2, Math.round(((i.value ?? 0) / max.value) * 100)) })),
);
</script>

<template>
  <ul class="space-y-2.5">
    <li v-for="r in rows" :key="r.label">
      <div class="flex items-center justify-between text-sm mb-1">
        <span class="text-ink-2">{{ r.label }}</span>
        <span class="text-ink-3 tabular-nums font-medium">{{ fmtNum(r.value ?? 0) }}</span>
      </div>
      <div class="h-2 rounded-full bg-elev overflow-hidden">
        <div class="h-full rounded-full transition-all duration-500"
          :style="{ width: r.width + '%', background: r.color }" />
      </div>
    </li>
  </ul>
</template>
