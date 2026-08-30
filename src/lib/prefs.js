// Tiny namespaced localStorage wrapper. Every read is guarded: a panel opened
// in a private window (or with site data blocked) must still render, it just
// forgets the preference.
const NS = 'mohirlar.admin.';

export function readPref(key, fallback = null) {
  try {
    const raw = localStorage.getItem(NS + key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writePref(key, value) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    /* storage unavailable — the preference is simply not remembered */
  }
}

export function removePref(key) {
  try {
    localStorage.removeItem(NS + key);
  } catch {
    /* ignore */
  }
}
