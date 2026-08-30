import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from '@/router';
import App from '@/App.vue';
import { setUnauthorizedHandler } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { toastErr } from '@/lib/toast';
import { initTheme } from '@/lib/theme';
import '@/style.css';

// Stamp the palette before the first paint, so a dark-mode admin never sees a
// white flash of the light theme on load.
initTheme();

const app = createApp(App);
app.use(createPinia());
app.use(router);

// Session expired mid-use → drop local auth state and return to the login
// screen with a note. Guarded by `isAuthed` so a burst of parallel 401s only
// fires once, and so it can never loop on the login page itself.
setUnauthorizedHandler(() => {
  const auth = useAuthStore();
  if (!auth.isAuthed) return;
  auth.clearSession();
  toastErr('Sessiya muddati tugadi. Iltimos, qaytadan kiring.');
  const from = router.currentRoute.value.fullPath;
  router.replace({ name: 'login', query: from && from !== '/' ? { redirect: from } : undefined });
});

app.mount('#app');
