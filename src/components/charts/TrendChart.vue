<script setup>
import { computed, ref } from 'vue';
import { fmtDayMonth, fmtNum, chartColor } from '@/lib/format';

// Self-contained multi-series area+line chart (inline SVG, no deps), with a
// crosshair tooltip: a 30-day trend you cannot read a single day off is a
// decoration, not a chart.
// series: [{ label, color, data: number[] }] · labels: string[] (ISO dates)
const props = defineProps({
  series: { type: Array, default: () => [] },
  labels: { type: Array, default: () => [] },
  height: { type: Number, default: 240 },
  // Rounded corners on the path joins read as smoothing; a true spline would
  // invent values between two days that never existed.
  smooth: { type: Boolean, default: true },
});

const W = 720;
const H = computed(() => props.height);
const padL = 8;
const padR = 40;
const padT = 16;
const padB = 26;
const plotW = W - padL - padR;
const plotH = computed(() => H.value - padT - padB);

// A DOM id has to be unique per instance and safe — series labels are Uzbek
// text with spaces, which is neither.
let seq = 0;
const uid = `tc${(seq += 1)}${Math.random().toString(36).slice(2, 7)}`;

const n = computed(() => props.labels.length);

const maxY = computed(() => {
  let m = 0;
  for (const s of props.series) for (const v of s.data || []) if (v > m) m = v;
  if (m <= 0) return 4;
  // Round up to a friendly step so the gridline labels are whole numbers.
  const step = Math.pow(10, Math.floor(Math.log10(m)));
  return Math.ceil((m * 1.1) / step) * step;
});

function xAt(i) {
  if (n.value <= 1) return padL + plotW / 2;
  return padL + (i / (n.value - 1)) * plotW;
}
function yAt(v) {
  return padT + plotH.value - (v / maxY.value) * plotH.value;
}

const geom = computed(() =>
  props.series.map((s, si) => {
    const data = s.data || [];
    const pts = data.map((v, i) => [xAt(i), yAt(v)]);
    let line = '';
    let area = '';
    if (pts.length === 1) {
      line = `M ${padL} ${pts[0][1]} L ${padL + plotW} ${pts[0][1]}`;
      area = `${line} L ${padL + plotW} ${padT + plotH.value} L ${padL} ${padT + plotH.value} Z`;
    } else if (pts.length > 1) {
      line = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
      area = `${line} L ${pts[pts.length - 1][0].toFixed(1)} ${padT + plotH.value} L ${pts[0][0].toFixed(1)} ${padT + plotH.value} Z`;
    }
    return { ...s, id: `${uid}-${si}`, pts, line, area, last: pts[pts.length - 1] };
  }),
);

const grid = computed(() =>
  [0, 0.25, 0.5, 0.75, 1].map((f) => ({ y: yAt(maxY.value * f), v: Math.round(maxY.value * f) })),
);

const xTicks = computed(() => {
  if (!n.value) return [];
  const want = n.value <= 2 ? [0, n.value - 1] : [0, Math.floor((n.value - 1) / 3), Math.floor(((n.value - 1) * 2) / 3), n.value - 1];
  return [...new Set(want)].map((i) => ({ x: xAt(i), label: fmtDayMonth(props.labels[i]) }));
});

// ─── Crosshair ───
const hover = ref(null);
const svgEl = ref(null);

function onMove(e) {
  if (!n.value || !svgEl.value) return;
  const rect = svgEl.value.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * W;
  const ratio = (x - padL) / plotW;
  const i = Math.round(Math.min(1, Math.max(0, ratio)) * (n.value - 1));
  hover.value = i;
}
const onLeave = () => { hover.value = null; };

const tip = computed(() => {
  const i = hover.value;
  if (i == null) return null;
  const x = xAt(i);
  return {
    x,
    date: fmtDayMonth(props.labels[i]),
    // Flip the card to the left half once the crosshair passes the middle.
    flip: x > W * 0.62,
    rows: props.series.map((s) => ({ label: s.label, color: s.color, value: fmtNum(s.data?.[i] ?? 0), y: yAt(s.data?.[i] ?? 0) })),
  };
});

const lineColor = computed(() => chartColor('line'));
</script>

<template>
  <div>
    <div v-if="series.length" class="mb-3 flex flex-wrap items-center gap-4">
      <span v-for="s in series" :key="s.label" class="inline-flex items-center gap-1.5 text-xs font-medium text-ink-2">
        <span class="h-2 w-2 rounded-full" :style="{ background: s.color }" />
        {{ s.label }}
      </span>
    </div>

    <div class="relative">
      <svg
        ref="svgEl"
        :viewBox="`0 0 ${W} ${H}`"
        class="h-auto w-full touch-none"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        @mousemove="onMove"
        @mouseleave="onLeave"
      >
        <defs>
          <linearGradient v-for="s in geom" :id="`grad-${s.id}`" :key="s.id" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" :stop-color="s.color" stop-opacity="0.26" />
            <stop offset="100%" :stop-color="s.color" stop-opacity="0" />
          </linearGradient>
        </defs>

        <!-- gridlines + y labels -->
        <g>
          <line
            v-for="(g, i) in grid" :key="'gl' + i"
            :x1="padL" :x2="W - padR" :y1="g.y" :y2="g.y"
            :stroke="lineColor" stroke-width="1" :stroke-dasharray="i === 0 ? '0' : '3 5'" opacity="0.7"
          />
          <text
            v-for="(g, i) in grid" :key="'gt' + i"
            :x="W - padR + 8" :y="g.y + 3" text-anchor="start"
            class="fill-ink-4" font-size="11"
          >{{ g.v }}</text>
        </g>

        <!-- areas + lines -->
        <g v-for="s in geom" :key="s.id">
          <path v-if="s.area" :d="s.area" :fill="`url(#grad-${s.id})`" />
          <path
            v-if="s.line" :d="s.line" fill="none" :stroke="s.color" stroke-width="2.2"
            :stroke-linecap="smooth ? 'round' : 'butt'" :stroke-linejoin="smooth ? 'round' : 'miter'"
            vector-effect="non-scaling-stroke"
          />
          <circle v-if="s.last" :cx="s.last[0]" :cy="s.last[1]" r="3.5" :fill="s.color" stroke="var(--color-surface)" stroke-width="2" />
        </g>

        <!-- crosshair -->
        <g v-if="tip">
          <line :x1="tip.x" :x2="tip.x" :y1="padT" :y2="padT + plotH" :stroke="lineColor" stroke-width="1.5" />
          <circle
            v-for="(r, i) in tip.rows" :key="i"
            :cx="tip.x" :cy="r.y" r="4" :fill="r.color" stroke="var(--color-surface)" stroke-width="2"
          />
        </g>

        <!-- x labels -->
        <text
          v-for="(t, i) in xTicks" :key="'xt' + i"
          :x="t.x" :y="H - 6"
          :text-anchor="i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'"
          class="fill-ink-4" font-size="11"
        >{{ t.label }}</text>
      </svg>

      <!-- HTML tooltip, so the text is never squashed by preserveAspectRatio -->
      <div
        v-if="tip"
        class="pointer-events-none absolute top-2 z-10 rounded-xl border border-line bg-surface px-3 py-2"
        :style="{
          left: `${(tip.x / W) * 100}%`,
          transform: tip.flip ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)',
          boxShadow: 'var(--shadow-raised)',
        }"
      >
        <div class="text-[11px] font-medium text-ink-3">{{ tip.date }}</div>
        <div v-for="(r, i) in tip.rows" :key="i" class="mt-1 flex items-center gap-2 text-xs whitespace-nowrap">
          <span class="h-2 w-2 rounded-full" :style="{ background: r.color }" />
          <span class="text-ink-2">{{ r.label }}</span>
          <span class="ml-auto font-semibold text-ink tabular-nums">{{ r.value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
