import { watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

/**
 * Keep a page's filter refs in the URL.
 *
 * Why: a moderator who filters down to "bloklangan ish beruvchilar" and sends
 * the link to a colleague was sending them an unfiltered page. Now the query
 * string carries the state, back/forward work, and a reload keeps the view.
 *
 * @param {Record<string, import('vue').Ref>} refs   filter name → ref
 * @param {Record<string, any>} defaults             value that means "not in the URL"
 * @param {() => void} onChange                      called once after a URL-driven change
 */
export function useQuerySync(refs, defaults = {}, onChange = null) {
  const route = useRoute();
  const router = useRouter();
  let applying = false;

  // Hydrate from the URL on entry.
  for (const [key, ref] of Object.entries(refs)) {
    const q = route.query[key];
    if (q != null && q !== '') ref.value = Array.isArray(q) ? q[0] : q;
  }

  function push() {
    const query = { ...route.query };
    for (const [key, ref] of Object.entries(refs)) {
      const v = ref.value;
      if (v == null || v === '' || v === defaults[key]) delete query[key];
      else query[key] = String(v);
    }
    // `replace` — filter tweaks are not navigation steps worth a back-button
    // press each; the page itself already is one.
    router.replace({ query });
  }

  watch(
    Object.values(refs),
    () => {
      if (applying) return;
      push();
    },
    { flush: 'post' },
  );

  // React to back/forward: re-read the URL into the refs, then reload once.
  watch(
    () => route.query,
    (q) => {
      let dirty = false;
      applying = true;
      for (const [key, ref] of Object.entries(refs)) {
        const next = q[key] == null ? (defaults[key] ?? '') : String(q[key]);
        if (String(ref.value ?? '') !== next) {
          ref.value = next;
          dirty = true;
        }
      }
      applying = false;
      if (dirty) onChange?.();
    },
  );
}
