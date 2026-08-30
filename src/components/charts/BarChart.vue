<script setup>
import { computed, ref } from 'vue';

// Vertical bars for a bucketed series (revenue per month, payments per day).
// bars: [{ label, value, hint? }]
const props = defineProps({
  bars: { type: Array, default: () => [] },
  color: { type: String, default: 'var(--color-accent)' },
  height: { type: Number, default: 180 },
  formatter: { type: Function, default: (v) => String(v) },
});

const hover = ref(null);
const max = computed(() => Math.max(1, ...props.bars.map((b) => b.value ?? 0)));
const rows = computed(() =>
  props.bars.map((b, i) => ({ ...b, i, h: Math.max(2, Math.round(((b.value ?? 0) / max.value) * 100)) })),
);
</script>

<template>
  <div>
    <div class="flex items-end gap-1.5" :style="{ height: `${height}px` }">
      <div
        v-for="b in rows" :key="b.i"
        class="group relative flex h-full flex-1 cursor-default flex-col justify-end"
        @mouseenter="hover = b.i"
        @mouseleave="hover = null"
      >
        <div
          class="w-full rounded-t-md transition-all duration-500"
          :style="{
            height: `${b.h}%`,
            background: color,
            opacity: hover == null || hover === b.i ? 1 : 0.4,
            transitionTimingFunction: 'var(--ease-out)',
          }"
        />
        <div
          v-if="hover === b.i"
          class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs whitespace-nowrap"
          :style="{ boxShadow: 'var(--shadow-raised)' }"
        >
          <div class="font-semibold text-ink tabular-nums">{{ formatter(b.value ?? 0) }}</div>
          <div class="text-[11px] text-ink-3">{{ b.hint || b.label }}</div>
        </div>
      </div>
    </div>
    <div class="mt-2 flex gap-1.5">
      <div v-for="b in rows" :key="'l' + b.i" class="flex-1 truncate text-center text-[10px] text-ink-4">
        {{ b.label }}
      </div>
    </div>
  </div>
</template>
