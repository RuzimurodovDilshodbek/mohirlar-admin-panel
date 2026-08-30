<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue';
import Icon from '@/components/Icon.vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  size: { type: String, default: 'md' }, // sm | md | lg | xl
  wide: { type: Boolean, default: false }, // back-compat alias for size="lg"
  // Set false while a request is in flight so a stray Escape cannot abandon it.
  dismissible: { type: Boolean, default: true },
});
const emit = defineEmits(['close']);

const SIZE = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
};

const panel = ref(null);
let lastFocused = null;

function close() {
  if (props.dismissible) emit('close');
}

// Escape closes, Tab cycles inside. Without the trap, tabbing out of a dialog
// lands on the page behind it — which is still scrollable and still clickable.
function onKeydown(e) {
  if (e.key === 'Escape') {
    e.stopPropagation();
    close();
    return;
  }
  if (e.key !== 'Tab' || !panel.value) return;
  const focusables = panel.value.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function lockScroll(on) {
  const b = document.body;
  if (on) {
    const pad = window.innerWidth - document.documentElement.clientWidth;
    b.dataset.prevOverflow = b.style.overflow;
    b.style.overflow = 'hidden';
    if (pad > 0) b.style.paddingRight = `${pad}px`;
  } else {
    b.style.overflow = b.dataset.prevOverflow || '';
    b.style.paddingRight = '';
    delete b.dataset.prevOverflow;
  }
}

watch(
  () => props.open,
  async (open) => {
    lockScroll(open);
    if (open) {
      lastFocused = document.activeElement;
      await nextTick();
      panel.value?.focus();
    } else {
      lastFocused?.focus?.();
      lastFocused = null;
    }
  },
);

onUnmounted(() => lockScroll(false));
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="fixed inset-0 z-[150] flex items-end justify-center sm:items-center sm:p-6" @keydown="onKeydown">
        <div class="modal-scrim absolute inset-0 backdrop-blur-[2px]" :style="{ background: 'var(--scrim)' }" @click="close" />
        <div
          ref="panel"
          class="modal-panel relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-surface sm:rounded-2xl"
          :class="SIZE[wide ? 'lg' : size]"
          :style="{ boxShadow: 'var(--shadow-pop)' }"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
        >
          <!-- Grab handle: on a phone the sheet is dragged, not clicked away. -->
          <div class="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line sm:hidden" />

          <header v-if="title" class="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div class="min-w-0">
              <h2 class="truncate text-[17px] font-semibold text-ink">{{ title }}</h2>
              <p v-if="subtitle" class="mt-0.5 truncate text-sm text-ink-3">{{ subtitle }}</p>
            </div>
            <button class="icon-btn -mt-1 -mr-1" aria-label="Yopish" @click="close">
              <Icon name="close" :size="18" />
            </button>
          </header>

          <div class="overflow-y-auto overscroll-contain px-5 py-4"><slot /></div>

          <footer v-if="$slots.footer" class="border-t border-line bg-elev/50 px-5 py-4">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active .modal-scrim,
.modal-leave-active .modal-scrim {
  transition: opacity 0.2s ease;
}
.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition: opacity 0.24s var(--ease-out), transform 0.24s var(--ease-out);
}
.modal-enter-from .modal-scrim,
.modal-leave-to .modal-scrim {
  opacity: 0;
}
.modal-enter-from .modal-panel,
.modal-leave-to .modal-panel {
  opacity: 0;
  transform: translateY(16px) scale(0.985);
}
</style>
