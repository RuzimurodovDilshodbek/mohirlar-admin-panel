<script setup>
import { computed, useSlots } from 'vue';

const props = defineProps({
  title: { type: String, default: '' },
  hint: { type: String, default: '' },
  // `flush` drops the body padding for tables and lists that draw their own.
  flush: { type: Boolean, default: false },
});

const slots = useSlots();
const hasHeader = computed(() => !!props.title || !!slots.actions);
const bodyClass = computed(() => {
  if (props.flush) return '';
  return hasHeader.value ? 'px-5 pb-5' : 'p-5';
});
</script>

<template>
  <section class="card overflow-hidden">
    <header
      v-if="hasHeader"
      class="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
      :class="flush ? 'border-b border-line' : ''"
    >
      <div class="min-w-0">
        <h3 class="text-[15px] font-semibold text-ink">{{ title }}</h3>
        <p v-if="hint" class="mt-0.5 text-xs text-ink-3">{{ hint }}</p>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-2"><slot name="actions" /></div>
    </header>
    <div :class="bodyClass"><slot /></div>
  </section>
</template>
