import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { toastErr } from '@/lib/toast';

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
      // `admin: true` mirrors the backend's `role:admin` group (routes/api.php)
      // — moderators would get a raw 403 on these, so gate them client-side.
      { path: 'companies', name: 'companies', component: () => import('@/pages/CompaniesPage.vue'), meta: { title: 'Kompaniyalar', admin: true } },
      { path: 'verifications', name: 'verifications', component: () => import('@/pages/VerificationsPage.vue'), meta: { title: 'Tasdiqlashlar' } },
      { path: 'reports', name: 'reports', component: () => import('@/pages/ReportsPage.vue'), meta: { title: 'Shikoyatlar' } },
      { path: 'commerce', name: 'commerce', component: () => import('@/pages/CommercePage.vue'), meta: { title: 'Moliya va obunalar', admin: true } },
      { path: 'content', name: 'content', component: () => import('@/pages/ContentPage.vue'), meta: { title: 'Kontent va maʼlumotnomalar', admin: true } },
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
  // Admin-only sections: a moderator typing the URL directly would otherwise
  // hit the backend's English 403. Send them back to the dashboard instead.
  if (to.meta.admin && auth.isAuthed && !auth.isAdmin) {
    toastErr('Bu boʻlim faqat administrator uchun');
    return { name: 'dashboard' };
  }
  return true;
});

export default router;
