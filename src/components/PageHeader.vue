<script setup>
// Title + one-line explanation of what the page is for, with a slot for the
// page's own controls. Every page used to open straight into a filter row, so
// nothing said what the screen was or what an action there would do.
defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
});
</script>

<template>
  <div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
    <div class="min-w-0">
      <h2 v-if="title" class="font-serif-display text-2xl leading-tight text-ink">{{ title }}</h2>
      <p v-if="description" class="mt-1 max-w-2xl text-sm text-ink-3">{{ description }}</p>
      <slot name="meta" />
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
