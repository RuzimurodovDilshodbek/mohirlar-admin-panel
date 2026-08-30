import { defineStore } from 'pinia';
import { ModerationApi } from '@/lib/api';

// Live counts for the sidebar/nav badges (pending jobs, verifications, reports).
// Fed by GET /admin/moderation/counts. Degrades silently to zeros if the
// endpoint isn't available yet — never blocks navigation.
//
// Several places want fresh counts at once (the shell on mount, the palette,
// a page right after a moderation action). Without the guards below that was
// three identical requests per page load, which on a single-worker dev server
// is three round trips the admin waits behind.
let inFlight = null;

export const useModerationStore = defineStore('moderation', {
  state: () => ({
    counts: { pending_jobs: 0, pending_verifications: 0, open_reports: 0 },
    loaded: false,
    fetchedAt: 0,
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
    /**
     * @param {{force?: boolean}} opts  `force` skips the freshness window —
     *   used right after a moderation action, where the whole point is that
     *   the number just changed.
     */
    async refresh({ force = false } = {}) {
      if (inFlight) return inFlight;
      if (!force && this.loaded && Date.now() - this.fetchedAt < 5000) return;

      inFlight = (async () => {
        try {
          const c = await ModerationApi.counts();
          this.counts = {
            pending_jobs: c?.pending_jobs ?? 0,
            pending_verifications: c?.pending_verifications ?? 0,
            open_reports: c?.open_reports ?? 0,
          };
          this.loaded = true;
          this.fetchedAt = Date.now();
        } catch {
          // endpoint may not be ready — keep the last known values, stay silent
        } finally {
          inFlight = null;
        }
      })();

      return inFlight;
    },
  },
});
