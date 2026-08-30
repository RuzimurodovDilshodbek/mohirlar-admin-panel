<script setup>
import { ref } from 'vue';
import Icon from '@/components/Icon.vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Qidirish' },
  // Focused by pressing "/" anywhere on the page.
  hotkey: { type: Boolean, default: true },
});
const emit = defineEmits(['update:modelValue']);

const el = ref(null);
defineExpose({ focus: () => el.value?.focus() });

function onKey(e) {
  if (e.key === 'Escape' && props.modelValue) {
    e.stopPropagation();
    emit('update:modelValue', '');
  }
}
</script>

<template>
  <div class="relative w-full max-w-sm">
    <Icon name="search" :size="16" class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-4" />
    <input
      ref="el"
      :value="modelValue"
      type="search"
      :placeholder="placeholder"
      class="input h-10 pr-16 pl-10 [&::-webkit-search-cancel-button]:hidden"
      @input="emit('update:modelValue', $event.target.value)"
      @keydown="onKey"
    />
    <button
      v-if="modelValue"
      class="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-ink-4 hover:text-ink"
      title="Tozalash"
      @click="emit('update:modelValue', '')"
    >
      <Icon name="close" :size="14" />
    </button>
    <span v-else-if="hotkey" class="kbd pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2">/</span>
  </div>
</template>
