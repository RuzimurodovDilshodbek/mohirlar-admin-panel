import { defineStore } from 'pinia';
import { ModerationApi } from '@/lib/api';

// Live counts for the sidebar/nav badges (pending jobs, verifications, reports).
// Fed by GET /admin/moderation/counts. Degrades silently to zeros if the
// endpoint isn't available yet — never blocks navigation.
export const useModerationStore = defineStore('moderation', {
  state: () => ({
    counts: { pending_jobs: 0, pending_verifications: 0, open_reports: 0 },
    loaded: false,
  }),
  getters: {
    total: (s) =>
      (s.counts.pending_jobs || 0) +
      (s.counts.pending_verifications || 0) +
      (s.counts.open_reports || 0),
    byNav: (s) => ({
      jobs: s.counts.pending_jobs || 0,
      verifications: s.counts.pending_verifications || 0,
      reports: s.counts.open_reports || 0,
    }),
  },
  actions: {
    async refresh() {
      try {
        const c = await ModerationApi.counts();
        this.counts = {
          pending_jobs: c?.pending_jobs ?? 0,
          pending_verifications: c?.pending_verifications ?? 0,
          open_reports: c?.open_reports ?? 0,
        };
        this.loaded = true;
      } catch {
        // endpoint may not be ready — keep zeros, stay silent
      }
    },
  },
});
