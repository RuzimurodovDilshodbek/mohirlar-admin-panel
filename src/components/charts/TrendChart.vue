<script setup>
import { computed } from 'vue';

// Self-contained multi-series area+line chart (inline SVG, no deps).
// series: [{ label, color, data: number[] }]  ·  labels: string[] (ISO dates)
const props = defineProps({
  series: { type: Array, default: () => [] },
  labels: { type: Array, default: () => [] },
});

const W = 720;
const H = 260;
const padL = 14;
const padR = 14;
const padT = 20;
const padB = 26;
const plotW = W - padL - padR;
const plotH = H - padT - padB;

const uid = Math.random().toString(36).slice(2, 8);

const n = computed(() => props.labels.length);

const maxY = computed(() => {
  let m = 0;
  for (const s of props.series) for (const v of s.data || []) if (v > m) m = v;
  return Math.max(1, Math.ceil((m * 1.12) / 5) * 5 || m * 1.12);
});

function xAt(i) {
  if (n.value <= 1) return padL + plotW / 2;
  return padL + (i / (n.value - 1)) * plotW;
}
function yAt(v) {
  return padT + plotH - (v / maxY.value) * plotH;
}

const geom = computed(() =>
  props.series.map((s) => {
    const data = s.data || [];
    const pts = data.map((v, i) => [xAt(i), yAt(v)]);
    let line = '';
    let area = '';
    if (pts.length === 1) {
      // flat line across the plot for a single sample
      line = `M ${padL} ${pts[0][1]} L ${padL + plotW} ${pts[0][1]}`;
      area = `${line} L ${padL + plotW} ${padT + plotH} L ${padL} ${padT + plotH} Z`;
    } else if (pts.length > 1) {
      line = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
      area = `${line} L ${pts[pts.length - 1][0].toFixed(1)} ${padT + plotH} L ${pts[0][0].toFixed(1)} ${padT + plotH} Z`;
    }
    return { ...s, pts, line, area, last: pts[pts.length - 1] };
  }),
);

// horizontal gridlines at 0 / 0.5 / 1 of maxY
const grid = computed(() => [0, 0.5, 1].map((f) => ({ y: yAt(maxY.value * f), v: Math.round(maxY.value * f) })));

const xTicks = computed(() => {
  if (!n.value) return [];
  const idx = n.value <= 2 ? [0, n.value - 1] : [0, Math.floor((n.value - 1) / 2), n.value - 1];
  return [...new Set(idx)].map((i) => ({ x: xAt(i), label: fmt(props.labels[i]) }));
});

function fmt(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso ?? '';
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' });
}
</script>

<template>
  <div>
    <div v-if="series.length" class="mb-2 flex flex-wrap items-center gap-4">
      <span v-for="s in series" :key="s.label" class="inline-flex items-center gap-1.5 text-xs text-ink-2">
        <span class="h-2.5 w-2.5 rounded-full" :style="{ background: s.color }" />
        {{ s.label }}
      </span>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" class="w-full h-auto" preserveAspectRatio="xMidYMid meet" role="img">
      <defs>
        <linearGradient v-for="s in geom" :key="'g' + s.label" :id="`grad-${uid}-${s.label}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="s.color" stop-opacity="0.20" />
          <stop offset="100%" :stop-color="s.color" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- gridlines + y labels -->
      <g>
        <line v-for="(g, i) in grid" :key="'gl' + i" :x1="padL" :x2="W - padR" :y1="g.y" :y2="g.y"
          stroke="rgba(20,18,14,0.08)" stroke-width="1" />
        <text v-for="(g, i) in grid" :key="'gt' + i" :x="W - padR" :y="g.y - 4" text-anchor="end"
          class="fill-ink-4" font-size="10">{{ g.v }}</text>
      </g>

      <!-- areas + lines -->
      <g v-for="s in geom" :key="s.label">
        <path v-if="s.area" :d="s.area" :fill="`url(#grad-${uid}-${s.label})`" />
        <path v-if="s.line" :d="s.line" fill="none" :stroke="s.color" stroke-width="2.4"
          stroke-linecap="round" stroke-linejoin="round" />
        <circle v-if="s.last" :cx="s.last[0]" :cy="s.last[1]" r="3.5" :fill="s.color" stroke="#fff" stroke-width="1.5" />
      </g>

      <!-- x labels -->
      <text v-for="(t, i) in xTicks" :key="'xt' + i" :x="t.x" :y="H - 6"
        :text-anchor="i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'"
        class="fill-ink-4" font-size="10">{{ t.label }}</text>
    </svg>
  </div>
</template>
