<script setup>
defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  wide: { type: Boolean, default: false },
});
const emit = defineEmits(['close']);
</script>

<template>
  <Transition name="modal">
    <div v-if="open" class="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div class="absolute inset-0 bg-ink/30 backdrop-blur-sm" @click="emit('close')" />
      <div
        class="relative w-full bg-surface border border-line rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col"
        :class="wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'"
      >
        <header v-if="title" class="flex items-start justify-between gap-4 px-5 py-4 border-b border-line">
          <div>
            <h2 class="text-lg font-semibold text-ink">{{ title }}</h2>
            <p v-if="subtitle" class="text-sm text-ink-3 mt-0.5">{{ subtitle }}</p>
          </div>
          <button class="text-ink-3 hover:text-ink text-lg leading-none p-1" @click="emit('close')">✕</button>
        </header>
        <div class="overflow-y-auto px-5 py-4">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="px-5 py-4 border-t border-line bg-elev/40">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
