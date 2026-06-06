import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes = [
  { path: '/login', name: 'login', component: () => import('@/pages/LoginPage.vue'), meta: { guest: true } },
  {
    path: '/',
    component: () => import('@/components/AppLayout.vue'),
    meta: { auth: true },
    children: [
      { path: '', redirect: { name: 'dashboard' } },
      { path: 'dashboard', name: 'dashboard', component: () => import('@/pages/DashboardPage.vue'), meta: { title: 'Boshqaruv paneli' } },
      { path: 'users', name: 'users', component: () => import('@/pages/UsersPage.vue'), meta: { title: 'Foydalanuvchilar' } },
      { path: 'jobs', name: 'jobs', component: () => import('@/pages/JobsPage.vue'), meta: { title: 'Vakansiyalar moderatsiyasi' } },
      { path: 'verifications', name: 'verifications', component: () => import('@/pages/VerificationsPage.vue'), meta: { title: 'Tasdiqlashlar' } },
      { path: 'reports', name: 'reports', component: () => import('@/pages/ReportsPage.vue'), meta: { title: 'Shikoyatlar' } },
      { path: 'audit', name: 'audit', component: () => import('@/pages/AuditPage.vue'), meta: { title: 'Audit jurnali' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: { name: 'dashboard' } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Global guard: ensure the session is booted, then gate by auth.
router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (auth.booting) {
    await auth.boot();
  }
  if (to.meta.auth && !auth.isAuthed) {
    return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined };
  }
  if (to.meta.guest && auth.isAuthed) {
    return { name: 'dashboard' };
  }
  return true;
});

export default router;
