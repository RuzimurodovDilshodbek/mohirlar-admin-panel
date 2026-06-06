import { reactive } from 'vue';

let seq = 1;
export const toastState = reactive({ items: [] });

export function toast(message, type = 'success', ms = 3200) {
  const id = seq++;
  toastState.items.push({ id, message, type });
  setTimeout(() => dismiss(id), ms);
  return id;
}
export function dismiss(id) {
  const i = toastState.items.findIndex((t) => t.id === id);
  if (i >= 0) toastState.items.splice(i, 1);
}
export const toastOk = (m) => toast(m, 'success');
export const toastErr = (m) => toast(m, 'error', 4500);
