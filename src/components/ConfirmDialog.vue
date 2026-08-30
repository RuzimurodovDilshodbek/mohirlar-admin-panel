<script setup>
import ModalDialog from '@/components/ModalDialog.vue';
import Spinner from '@/components/Spinner.vue';
import Icon from '@/components/Icon.vue';

defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Tasdiqlang' },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Tasdiqlash' },
  cancelLabel: { type: String, default: 'Bekor qilish' },
  tone: { type: String, default: 'danger' }, // danger | primary
  busy: { type: Boolean, default: false },
});
const emit = defineEmits(['confirm', 'cancel']);
</script>

<template>
  <ModalDialog :open="open" size="sm" :dismissible="!busy" @close="emit('cancel')">
    <div class="flex gap-4 pt-2">
      <span
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
        :class="tone === 'danger' ? 'bg-danger-soft text-danger-ink' : 'bg-accent-soft text-accent-ink'"
      >
        <Icon :name="tone === 'danger' ? 'alert' : 'info'" :size="20" />
      </span>
      <div class="min-w-0">
        <h2 class="text-[17px] font-semibold text-ink">{{ title }}</h2>
        <p v-if="message" class="mt-1 text-sm leading-relaxed text-ink-2">{{ message }}</p>
        <slot />
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button class="btn btn-neutral" :disabled="busy" @click="emit('cancel')">{{ cancelLabel }}</button>
        <button
          class="btn"
          :class="tone === 'danger' ? 'btn-danger' : 'btn-primary'"
          :disabled="busy"
          @click="emit('confirm')"
        >
          <Spinner v-if="busy" :size="16" on-fill />
          {{ confirmLabel }}
        </button>
      </div>
    </template>
  </ModalDialog>
</template>
