<script setup>
defineProps({
  size: { type: [Number, String], default: 20 },
  // `on-fill` flips the ring to white for a spinner inside a filled button.
  onFill: { type: Boolean, default: false },
});
</script>

<template>
  <span
    class="inline-block animate-spin rounded-full border-2 align-[-2px]"
    :class="onFill ? 'border-white/35 border-t-white' : 'border-line border-t-accent'"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="status"
    aria-label="Yuklanmoqda"
  />
</template>
