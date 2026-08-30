<script setup>
import { computed } from 'vue';

// 60×20 trend line for a KPI card — no axes, no labels; the number above it
// carries the value and this only carries the shape.
const props = defineProps({
  data: { type: Array, default: () => [] },
  color: { type: String, default: 'currentColor' },
  filled: { type: Boolean, default: true },
});

const W = 64;
const H = 22;

const geom = computed(() => {
  const d = props.data.filter((v) => v != null && !isNaN(v));
  if (d.length < 2) return null;
  // An all-zero series drew a hairline across the card that read as data.
  // Nothing is the honest picture of nothing.
  if (!d.some((v) => v !== 0)) return null;
  const max = Math.max(...d);
  const min = Math.min(...d);
  const span = max - min || 1;
  const pts = d.map((v, i) => [
    (i / (d.length - 1)) * W,
    H - 2 - ((v - min) / span) * (H - 4),
  ]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return {
    line,
    area: `${line} L ${W} ${H} L 0 ${H} Z`,
    last: pts[pts.length - 1],
  };
});
</script>

<template>
  <svg v-if="geom" :viewBox="`0 0 ${W} ${H}`" class="h-[22px] w-16 overflow-visible" aria-hidden="true">
    <path v-if="filled" :d="geom.area" :fill="color" opacity="0.12" />
    <path :d="geom.line" fill="none" :stroke="color" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <circle :cx="geom.last[0]" :cy="geom.last[1]" r="2" :fill="color" />
  </svg>
</template>
