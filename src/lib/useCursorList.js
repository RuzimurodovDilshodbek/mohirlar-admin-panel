import { ref, shallowRef } from 'vue';
import { toApiError } from '@/lib/api';
import { cursorFromUrl } from '@/lib/format';

/**
 * Cursor-paginated list loader for the admin tables.
 *
 * `apiFn(params)` should return the raw axios envelope. By default we read the
 * standard Laravel resource-collection shape `{ data, links, meta }`; pass a
 * custom `adapt(res) → { items, nextCursor }` for non-standard endpoints
 * (e.g. the audit log returns `{ data, next_cursor }`).
 */
export function useCursorList(apiFn, adapt) {
  const items = shallowRef([]);
  const loading = ref(false);
  const loadingMore = ref(false);
  const error = ref(null);
  const nextCursor = ref(null);
  let baseParams = {};

  const normalise =
    adapt ||
    ((res) => ({
      items: res?.data ?? [],
      nextCursor: res?.meta?.next_cursor ?? cursorFromUrl(res?.links?.next),
    }));

  async function load(params = {}) {
    baseParams = params;
    loading.value = true;
    error.value = null;
    nextCursor.value = null;
    try {
      const res = await apiFn({ ...baseParams });
      const { items: rows, nextCursor: next } = normalise(res);
      items.value = rows;
      nextCursor.value = next;
    } catch (e) {
      error.value = toApiError(e);
      items.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function loadMore() {
    if (!nextCursor.value || loadingMore.value) return;
    loadingMore.value = true;
    try {
      const res = await apiFn({ ...baseParams, cursor: nextCursor.value });
      const { items: rows, nextCursor: next } = normalise(res);
      items.value = [...items.value, ...rows];
      nextCursor.value = next;
    } catch (e) {
      error.value = toApiError(e);
    } finally {
      loadingMore.value = false;
    }
  }

  /** Replace a row in-place after an update (matched by `id`). */
  function patch(updated) {
    if (!updated) return;
    items.value = items.value.map((row) => (row.id === updated.id ? { ...row, ...updated } : row));
  }

  /** Drop a row from the list (e.g. after it leaves the current filter). */
  function remove(id) {
    items.value = items.value.filter((row) => row.id !== id);
  }

  return { items, loading, loadingMore, error, nextCursor, load, loadMore, patch, remove };
}
