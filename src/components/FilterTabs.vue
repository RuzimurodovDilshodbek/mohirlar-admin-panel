<script setup>
defineProps({
  modelValue: { type: [String, Number], default: null },
  // [{ value, label, count?, tone? }]
  options: { type: Array, required: true },
  size: { type: String, default: 'md' }, // md | sm
});
defineEmits(['update:modelValue']);

// Counts are the point of a moderation filter — a red pill on "Yangi" is the
// difference between a queue you check and one you forget.
const COUNT_TONE = {
  danger: 'bg-danger-soft text-danger-ink',
  warn: 'bg-warn-soft text-warn-ink',
  info: 'bg-info-soft text-info-ink',
};
</script>

<template>
  <!-- Scrolls instead of wrapping: eight status tabs on a laptop used to eat
       three lines above every table. -->
  <div class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="inline-flex shrink-0 items-center gap-1.5 rounded-full border font-medium transition-colors duration-150"
      :class="[
        size === 'sm' ? 'px-3 py-1 text-xs' : 'px-3.5 py-1.5 text-[13px]',
        modelValue === opt.value
          ? 'border-ink bg-ink text-bg'
          : 'border-line bg-surface text-ink-2 hover:border-ink-4 hover:text-ink',
      ]"
      :aria-pressed="modelValue === opt.value"
      @click="$emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
      <span
        v-if="opt.count != null"
        class="rounded-full px-1.5 text-[11px] font-semibold tabular-nums"
        :class="modelValue === opt.value
          ? 'bg-bg/20 text-bg'
          : (COUNT_TONE[opt.tone] || 'bg-elev text-ink-3')"
      >{{ opt.count }}</span>
    </button>
  </div>
</template>
