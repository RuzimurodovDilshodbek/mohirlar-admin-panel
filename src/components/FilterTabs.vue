<script setup>
defineProps({
  modelValue: { type: String, default: null },
  // [{ value, label, count? }]
  options: { type: Array, required: true },
});
defineEmits(['update:modelValue']);
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors"
      :class="modelValue === opt.value
        ? 'bg-ink text-white border-ink'
        : 'bg-surface text-ink-2 border-line hover:bg-elev'"
      @click="$emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
      <span
        v-if="opt.count != null"
        class="rounded-full px-1.5 text-[11px] font-semibold"
        :class="modelValue === opt.value ? 'bg-white/20' : 'bg-elev text-ink-3'"
      >{{ opt.count }}</span>
    </button>
  </div>
</template>
