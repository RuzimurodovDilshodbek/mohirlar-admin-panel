import { ref, computed } from 'vue';
import { readPref, writePref } from '@/lib/prefs';

// ─── Theme ───
// Three settings, two outcomes: 'light' | 'dark' pin the palette, 'system'
// follows the OS and keeps following it while the panel is open. Whatever the
// setting, exactly one resolved value is stamped on <html data-theme> — the
// stylesheet never has to reason about `prefers-color-scheme` itself.

export const THEMES = [
  { value: 'light', label: 'Yorugʻ' },
  { value: 'dark', label: 'Qorongʻi' },
  { value: 'system', label: 'Tizim' },
];

const media = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null;

export const themeSetting = ref(readPref('theme', 'system'));
const systemDark = ref(media ? media.matches : false);

export const resolvedTheme = computed(() =>
  themeSetting.value === 'system' ? (systemDark.value ? 'dark' : 'light') : themeSetting.value,
);

function stamp() {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', resolvedTheme.value);
  // Keeps the browser UI (address bar on mobile, form controls) in step.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolvedTheme.value === 'dark' ? '#04070f' : '#f5f7fa');
}

export function setTheme(value) {
  themeSetting.value = THEMES.some((t) => t.value === value) ? value : 'system';
  writePref('theme', themeSetting.value);
  stamp();
}

/** light → dark → light. 'system' resolves first, so the first click always flips. */
export function toggleTheme() {
  setTheme(resolvedTheme.value === 'dark' ? 'light' : 'dark');
}

/** Called once from main.js, before the app mounts. */
export function initTheme() {
  stamp();
  media?.addEventListener?.('change', (e) => {
    systemDark.value = e.matches;
    if (themeSetting.value === 'system') stamp();
  });
}
