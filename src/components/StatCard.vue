<script setup>
import { computed } from 'vue';
import Icon from '@/components/Icon.vue';
import Sparkline from '@/components/Sparkline.vue';
import { chartColor } from '@/lib/format';

// KPI card — icon chip, big value, label, optional sub-line, optional 30-day
// spark and a period-over-period delta. `to` turns the whole card into a link
// so a number the admin cares about is one click from the list behind it.
const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '—' },
  sub: { type: String, default: '' },
  icon: { type: String, default: '' },
  tone: { type: String, default: 'accent' }, // accent | info | ai | warn | good | danger | neutral
  spark: { type: Array, default: () => [] },
  // { pct: number|null, dir: 'up'|'down'|'flat' } — see format.delta()
  delta: { type: Object, default: null },
  // `true` when a rise is bad news (open reports, failed payments).
  invertDelta: { type: Boolean, default: false },
  to: { type: [String, Object], default: null },
});

const TONE = {
  accent: 'bg-accent-soft text-accent-ink',
  info: 'bg-info-soft text-info-ink',
  ai: 'bg-ai-soft text-ai-ink',
  warn: 'bg-warn-soft text-warn-ink',
  good: 'bg-good-soft text-good-ink',
  danger: 'bg-danger-soft text-danger-ink',
  neutral: 'bg-elev text-ink-2',
};

const sparkColor = computed(() => chartColor(props.tone === 'neutral' ? 'neutral' : props.tone));

const deltaView = computed(() => {
  const d = props.delta;
  if (!d || d.dir === 'flat' || d.pct == null) return null;
  const positive = props.invertDelta ? d.dir === 'down' : d.dir === 'up';
  return {
    text: `${d.pct > 0 ? '+' : ''}${d.pct}%`,
    icon: d.dir === 'up' ? 'arrowUp' : 'arrowDown',
    cls: positive ? 'bg-good-soft text-good-ink' : 'bg-danger-soft text-danger-ink',
  };
});
</script>

<template>
  <component
    :is="to ? 'RouterLink' : 'div'"
    :to="to || undefined"
    class="card block p-5"
    :class="to ? 'card-hover' : ''"
  >
    <div class="flex items-start justify-between gap-3">
      <span v-if="icon" class="flex h-10 w-10 items-center justify-center rounded-xl" :class="TONE[tone]">
        <Icon :name="icon" :size="19" />
      </span>
      <div class="flex items-center gap-2">
        <Sparkline v-if="spark.length > 1" :data="spark" :color="sparkColor" class="text-ink-4" />
        <span
          v-if="deltaView"
          class="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
          :class="deltaView.cls"
        >
          <Icon :name="deltaView.icon" :size="11" :stroke="2.4" />{{ deltaView.text }}
        </span>
      </div>
    </div>
    <div class="mt-3.5 font-serif-display text-[30px] leading-none text-ink">{{ value }}</div>
    <div class="mt-2 text-sm font-medium text-ink-2">{{ label }}</div>
    <div v-if="sub" class="mt-0.5 text-xs text-ink-3">{{ sub }}</div>
  </component>
</template>
