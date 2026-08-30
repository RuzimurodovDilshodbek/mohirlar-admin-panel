<script setup>
import { toastState, dismiss } from '@/lib/toast';
import Icon from '@/components/Icon.vue';

const TONE = {
  success: { cls: 'text-good-ink', chip: 'bg-good-soft text-good-ink', icon: 'check' },
  error: { cls: 'text-danger-ink', chip: 'bg-danger-soft text-danger-ink', icon: 'alert' },
  info: { cls: 'text-info-ink', chip: 'bg-info-soft text-info-ink', icon: 'info' },
};
const of = (t) => TONE[t] || TONE.info;
</script>

<template>
  <!-- Bottom-right: the top-right corner belongs to the header controls, and a
       toast landing on the theme toggle intercepted the click. -->
  <div
    class="pointer-events-none fixed right-4 bottom-4 z-[200] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2"
    role="status"
    aria-live="polite"
  >
    <TransitionGroup name="toast">
      <div
        v-for="t in toastState.items"
        :key="t.id"
        class="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3"
        :style="{ boxShadow: 'var(--shadow-pop)' }"
      >
        <span class="mt-px inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full" :class="of(t.type).chip">
          <Icon :name="of(t.type).icon" :size="12" :stroke="2.4" />
        </span>
        <p class="flex-1 text-sm leading-snug text-ink">{{ t.message }}</p>
        <button class="-mt-0.5 -mr-1 rounded-md p-1 text-ink-4 hover:text-ink" aria-label="Yopish" @click="dismiss(t.id)">
          <Icon name="close" :size="14" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.26s var(--ease-out);
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.97);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
.toast-move {
  transition: transform 0.26s var(--ease-out);
}
</style>
