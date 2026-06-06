<script setup>
import { toastState, dismiss } from '@/lib/toast';
</script>

<template>
  <div class="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))]">
    <TransitionGroup name="toast">
      <div
        v-for="t in toastState.items"
        :key="t.id"
        class="flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur bg-surface/95"
        :class="t.type === 'error'
          ? 'border-warn/30 text-warn'
          : t.type === 'info' ? 'border-info/30 text-info' : 'border-accent/30 text-accent-ink'"
      >
        <span class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          :class="t.type === 'error' ? 'bg-warn-soft' : t.type === 'info' ? 'bg-info-soft' : 'bg-accent-soft'">
          {{ t.type === 'error' ? '!' : t.type === 'info' ? 'i' : '✓' }}
        </span>
        <p class="flex-1 text-sm leading-snug text-ink">{{ t.message }}</p>
        <button class="text-ink-3 hover:text-ink" @click="dismiss(t.id)">✕</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.22s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
