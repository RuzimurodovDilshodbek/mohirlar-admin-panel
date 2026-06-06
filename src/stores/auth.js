import { defineStore } from 'pinia';
import { AuthApi, toApiError } from '@/lib/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    roles: [],
    permissions: [],
    booting: true,
  }),
  getters: {
    isAuthed: (s) => !!s.user,
    isAdmin: (s) => s.user?.role === 'admin' || s.roles.includes('super-admin') || s.roles.includes('admin'),
    isModerator: (s) => s.user?.role === 'moderator',
    displayName: (s) => s.user?.email || s.user?.phone || '—',
  },
  actions: {
    _apply(me) {
      this.user = me?.user ?? null;
      this.roles = me?.roles ?? [];
      this.permissions = me?.permissions ?? [];
    },
    async boot() {
      this.booting = true;
      try {
        const me = await AuthApi.me();
        this._apply(me);
      } catch {
        this._apply(null);
      } finally {
        this.booting = false;
      }
    },
    async login(payload) {
      try {
        const me = await AuthApi.login(payload);
        this._apply(me);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: toApiError(e) };
      }
    },
    async logout() {
      try {
        await AuthApi.logout();
      } catch {
        /* ignore */
      }
      this._apply(null);
    },
  },
});
