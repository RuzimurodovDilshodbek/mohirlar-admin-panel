import axios from 'axios';

// ─── Axios instance for the Mohirlar admin API ───
// Sanctum SPA (session-cookie) auth: every request carries cookies, and the
// XSRF-TOKEN cookie is echoed back as the X-XSRF-TOKEN header (axios does this
// automatically once the cookie is set). In dev, Vite proxies /api + /sanctum
// to the backend so this all runs same-origin.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '',
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json' },
});

// ─── Method-override shim ───
// The local backend runs on PHP 8.3 where a genuine PUT/PATCH/DELETE body can
// fatal inside Symfony's Request::createFromGlobals. Tunnel every mutating verb
// through POST + `X-HTTP-Method-Override`, which Laravel reads natively — this
// is transparent to callers and remains correct on production too.
api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  if (method === 'put' || method === 'patch' || method === 'delete') {
    config.method = 'post';
    config.headers = config.headers || {};
    config.headers['X-HTTP-Method-Override'] = method.toUpperCase();
  }
  return config;
});

let csrfPrimed = false;

/** Hit /sanctum/csrf-cookie once to seed the XSRF-TOKEN cookie. */
export async function ensureCsrf() {
  if (csrfPrimed) return;
  await api.get('/sanctum/csrf-cookie');
  csrfPrimed = true;
}

/**
 * Normalised API error: { code, message, status, details, fields }.
 *
 * Two server shapes are handled: the app envelope `{ error: { code, message } }`
 * and Laravel's validation envelope `{ message, errors: { field: [msg…] } }`
 * (HTTP 422). For a 422 the per-field messages are folded into `message` so the
 * admin sees *which* field failed instead of a generic toast; the raw map stays
 * on `.fields` for callers that want to highlight inputs.
 *
 * `fallback` replaces the generic default when the server said nothing useful.
 */
export function toApiError(err, fallback) {
  const status = err?.response?.status ?? 0;
  const body = err?.response?.data;
  const e = body?.error;
  const fields =
    body?.errors && typeof body.errors === 'object' && !Array.isArray(body.errors)
      ? body.errors
      : null;

  const fieldText = fields
    ? Object.entries(fields)
        .map(([f, msgs]) => `${f}: ${Array.isArray(msgs) ? msgs.join(' ') : msgs}`)
        .join('; ')
    : '';

  const base =
    e?.message ||
    (fields ? 'Maʼlumotlar notoʻgʻri' : body?.message) ||
    fallback ||
    (status === 0 ? 'Tarmoq xatosi — ulanishni tekshiring' : 'Nimadir xato ketdi');

  return {
    status,
    code: e?.code ?? (fields ? 'validation' : status === 0 ? 'network' : 'unknown'),
    message: fieldText ? `${base} — ${fieldText}` : base,
    details: e?.details ?? fields,
    fields,
  };
}

// ─── Session expiry (401) ───
// A Sanctum session can lapse mid-session. Without this the admin is left
// staring at the backend's English "Authentication required." behind a retry
// button that can never succeed. The handler is registered once at boot
// (main.js) so this module stays free of store/router imports.
let onUnauthorized = null;

/** Register the app-level 401 handler (clears auth state + returns to login). */
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

// Requests where a 401 is the normal answer, not an expired session.
const AUTH_EXEMPT = ['/api/v1/auth/admin/login', '/api/v1/auth/admin/logout', '/api/v1/me', '/sanctum/csrf-cookie'];

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err?.config?.url || '';
    if (err?.response?.status === 401 && !AUTH_EXEMPT.some((p) => url.startsWith(p))) {
      csrfPrimed = false;
      try {
        onUnauthorized?.();
      } catch {
        /* never mask the original error */
      }
    }
    return Promise.reject(err);
  },
);

// ─── Auth ───
export const AuthApi = {
  async login({ email, password, remember }) {
    await ensureCsrf();
    const { data } = await api.post('/api/v1/auth/admin/login', { email, password, remember });
    return data.data; // MeResource
  },
  async logout() {
    await api.post('/api/v1/auth/admin/logout');
    csrfPrimed = false;
  },
  async me() {
    const { data } = await api.get('/api/v1/me');
    return data.data; // MeResource
  },
};

// ─── Users ───
export const UsersApi = {
  list(params) {
    return api.get('/api/v1/admin/users', { params }).then((r) => r.data);
  },
  show(uuid) {
    return api.get(`/api/v1/admin/users/${uuid}`).then((r) => r.data.data);
  },
  update(uuid, body) {
    return api.patch(`/api/v1/admin/users/${uuid}`, body).then((r) => r.data.data);
  },
  // Attaches a plan to a candidate/employer by hand. Admin-only on the server
  // (`role:admin`), so the caller must gate the UI the same way.
  setPlan(uuid, body) {
    return api.put(`/api/v1/admin/users/${uuid}/plan`, body).then((r) => r.data.data);
  },
};

// ─── Jobs moderation ───
export const JobsApi = {
  list(params) {
    return api.get('/api/v1/admin/jobs', { params }).then((r) => r.data);
  },
  show(uuid) {
    return api.get(`/api/v1/admin/jobs/${uuid}`).then((r) => r.data.data);
  },
  approve(uuid) {
    return api.post(`/api/v1/admin/jobs/${uuid}/approve`).then((r) => r.data.data);
  },
  reject(uuid, reason) {
    return api.post(`/api/v1/admin/jobs/${uuid}/reject`, { reason }).then((r) => r.data.data);
  },
  feature(uuid, featured) {
    return api.post(`/api/v1/admin/jobs/${uuid}/feature`, { featured }).then((r) => r.data.data);
  },
};

// ─── Verifications ───
export const VerificationsApi = {
  list(params) {
    return api.get('/api/v1/admin/verifications', { params }).then((r) => r.data);
  },
  show(uuid) {
    return api.get(`/api/v1/admin/verifications/${uuid}`).then((r) => r.data.data);
  },
  approve(uuid, note) {
    return api.post(`/api/v1/admin/verifications/${uuid}/approve`, { note }).then((r) => r.data.data);
  },
  reject(uuid, reason) {
    return api.post(`/api/v1/admin/verifications/${uuid}/reject`, { reason }).then((r) => r.data.data);
  },
};

// ─── Reports ───
export const ReportsApi = {
  list(params) {
    return api.get('/api/v1/admin/reports', { params }).then((r) => r.data);
  },
  show(id) {
    return api.get(`/api/v1/admin/reports/${id}`).then((r) => r.data.data);
  },
  resolve(id, body) {
    return api.post(`/api/v1/admin/reports/${id}/resolve`, body).then((r) => r.data.data);
  },
  dismiss(id, body) {
    return api.post(`/api/v1/admin/reports/${id}/dismiss`, body).then((r) => r.data.data);
  },
};

// ─── Audit log ───
// Historically a non-standard nested envelope `{ data: { data, next_cursor } }`.
// Normalised here to `{ data, next_cursor }` and made resilient to the standard
// `{ data:[…], meta:{ next_cursor } }` shape too, so the page never breaks.
export const AuditApi = {
  list(params) {
    return api.get('/api/v1/admin/audit-logs', { params }).then((r) => {
      const body = r.data;
      const inner = body?.data && !Array.isArray(body.data) ? body.data : body;
      return {
        data: inner?.data ?? [],
        next_cursor: inner?.next_cursor ?? inner?.meta?.next_cursor ?? null,
      };
    });
  },
};

// ─── Dashboard stats (GET /admin/stats) ───
export const StatsApi = {
  get() {
    return api.get('/api/v1/admin/stats').then((r) => r.data.data ?? r.data);
  },
};

// ─── Moderation counts — sidebar badges (GET /admin/moderation/counts) ───
export const ModerationApi = {
  counts() {
    return api.get('/api/v1/admin/moderation/counts').then((r) => r.data.data ?? r.data);
  },
};

// ─── Companies ───
export const CompaniesApi = {
  list(params) {
    return api.get('/api/v1/admin/companies', { params }).then((r) => r.data);
  },
  show(uuid) {
    return api.get(`/api/v1/admin/companies/${uuid}`).then((r) => r.data.data);
  },
  verify(uuid, body) {
    return api.post(`/api/v1/admin/companies/${uuid}/verify`, body || {}).then((r) => r.data.data);
  },
  unverify(uuid, body) {
    return api.post(`/api/v1/admin/companies/${uuid}/unverify`, body || {}).then((r) => r.data.data);
  },
};

// ─── Commerce: subscriptions, payments, plans ───
export const CommerceApi = {
  subscriptions(params) {
    return api.get('/api/v1/admin/subscriptions', { params }).then((r) => r.data);
  },
  payments(params) {
    return api.get('/api/v1/admin/payments', { params }).then((r) => r.data);
  },
  plans() {
    return api.get('/api/v1/admin/plans').then((r) => r.data.data ?? r.data);
  },
};

// ─── Reference CMS ───
// Reads hit the PUBLIC /reference/* endpoints; writes hit the ADMIN
// /admin/reference/{kind} endpoints. `kind` ∈ 'categories' | 'skills' | 'districts'.
export const ReferenceApi = {
  categories(params) {
    return api.get('/api/v1/reference/categories', { params }).then((r) => r.data);
  },
  skills(params) {
    return api.get('/api/v1/reference/skills', { params }).then((r) => r.data);
  },
  districts(params) {
    return api.get('/api/v1/reference/districts', { params }).then((r) => r.data);
  },
  regions(params) {
    return api.get('/api/v1/reference/regions', { params }).then((r) => r.data);
  },
  create(kind, body) {
    return api.post(`/api/v1/admin/reference/${kind}`, body).then((r) => r.data.data);
  },
  update(kind, id, body) {
    return api.patch(`/api/v1/admin/reference/${kind}/${id}`, body).then((r) => r.data.data);
  },
  remove(kind, id) {
    return api.delete(`/api/v1/admin/reference/${kind}/${id}`).then((r) => r.data);
  },
};

export default api;
