// Enum label maps (Uzbek) + badge tones + small formatters for the admin UI.
// Tones map to the StatusBadge component's colour variants.

export const USER_ROLES = ['candidate', 'employer', 'moderator', 'admin'];
export const USER_STATUSES = ['active', 'suspended', 'pending', 'deleted'];
export const JOB_STATUSES = ['draft', 'pending_review', 'active', 'paused', 'closed', 'rejected', 'expired'];
export const VERIFICATION_TYPES = ['phone', 'passport', 'inn', 'company_registration', 'company_owner', 'address', 'education', 'employment'];
export const VERIFICATION_STATUSES = ['pending', 'reviewing', 'approved', 'rejected', 'expired'];
export const REPORT_STATUSES = ['open', 'reviewing', 'resolved', 'dismissed'];
export const REPORT_REASONS = ['spam', 'fake', 'inappropriate', 'harassment', 'discrimination', 'scam', 'duplicate', 'other'];
export const REPORT_ACTIONS = ['warning', 'content_removed', 'user_suspended', 'company_unverified', 'noted', 'forwarded'];
export const REPORT_TARGETS = ['user', 'job', 'company', 'message', 'application'];
export const AUDIT_ACTIONS = [
  'user.updated',
  'user.plan_changed',
  'job.moderate.approved',
  'job.moderate.rejected',
  'job.moderate.featured',
  'job.moderate.unfeatured',
  'verification.approved',
  'verification.rejected',
  'report.resolved',
  'report.dismissed',
  'company.verified',
  'company.unverified',
];

const LABELS = {
  // user roles
  candidate: 'Nomzod',
  employer: 'Ish beruvchi',
  moderator: 'Moderator',
  admin: 'Administrator',
  // user statuses
  active: 'Faol',
  suspended: 'Bloklangan',
  pending: 'Kutilmoqda',
  deleted: 'Oʻchirilgan',
  // job statuses
  draft: 'Qoralama',
  pending_review: 'Koʻrib chiqilmoqda',
  paused: 'Toʻxtatilgan',
  closed: 'Yopilgan',
  rejected: 'Rad etilgan',
  expired: 'Muddati tugagan',
  // verification statuses
  reviewing: 'Tekshirilmoqda',
  approved: 'Tasdiqlangan',
  // verification types
  phone: 'Telefon',
  passport: 'Pasport',
  inn: 'STIR (INN)',
  company_registration: 'Kompaniya roʻyxati',
  company_owner: 'Kompaniya egasi',
  address: 'Manzil',
  education: 'Taʼlim',
  employment: 'Ish staji',
  // report statuses
  open: 'Yangi',
  resolved: 'Hal qilingan',
  dismissed: 'Rad etilgan',
  // report reasons
  spam: 'Spam',
  fake: 'Soxta',
  inappropriate: 'Nomaqbul',
  harassment: 'Tahqirlash',
  discrimination: 'Kamsitish',
  scam: 'Firibgarlik',
  duplicate: 'Takror',
  other: 'Boshqa',
  // report actions
  warning: 'Ogohlantirish',
  content_removed: 'Kontent oʻchirildi',
  user_suspended: 'Foydalanuvchi bloklandi',
  company_unverified: 'Kompaniya tasdigʻi bekor qilindi',
  noted: 'Qayd etildi',
  forwarded: 'Yuborildi',
  // report targets
  user: 'Foydalanuvchi',
  job: 'Vakansiya',
  company: 'Kompaniya',
  message: 'Xabar',
  application: 'Ariza',
  // job type / mode
  fulltime: 'Toʻliq stavka',
  parttime: 'Yarim stavka',
  contract: 'Shartnoma',
  internship: 'Amaliyot',
  onsite: 'Ofisda',
  hybrid: 'Gibrid',
  remote: 'Masofaviy',
  // application statuses
  submitted: 'Yuborilgan',
  applied: 'Ariza berilgan',
  screening: 'Saralash',
  reviewed: 'Koʻrib chiqilgan',
  in_review: 'Koʻrib chiqilmoqda',
  offered: 'Taklif berilgan',
  shortlisted: 'Qisqa roʻyxat',
  interview: 'Suhbat',
  offer: 'Taklif',
  hired: 'Ishga olindi',
  withdrawn: 'Qaytarib olingan',
  viewed: 'Koʻrilgan',
  // subscription statuses
  trialing: 'Sinov muddati',
  trial: 'Sinov muddati',
  past_due: 'Toʻlov kechikkan',
  canceled: 'Bekor qilingan',
  cancelled: 'Bekor qilingan',
  incomplete: 'Tugallanmagan',
  grace: 'Imtiyoz muddati',
  // billing periods
  monthly: 'oylik',
  yearly: 'yillik',
  // payment statuses
  paid: 'Toʻlangan',
  succeeded: 'Muvaffaqiyatli',
  success: 'Muvaffaqiyatli',
  failed: 'Muvaffaqiyatsiz',
  refunded: 'Qaytarilgan',
  processing: 'Jarayonda',
  // funnel stages
  job_views: 'Koʻrishlar',
  applications_total: 'Arizalar',
  interview_stage: 'Suhbat',
  // companies
  verified: 'Tasdiqlangan',
  unverified: 'Tasdiqlanmagan',
};

export function label(key) {
  if (key == null) return '—';
  return LABELS[key] ?? key;
}

// ─── Plan feature flags ───
// `Plan::features` is a flat array of snake_case keys with no server-side
// labels, so the panel was printing `unlimited_applications` at the reader.
// Kept in its own namespace: these are feature flags, not status enums, and
// they must not collide with the LABELS map. Wording matches the mobile app's
// FEATURE_UZ so a plan reads the same in both places.
const PLAN_FEATURES = {
  // candidate
  unlimited_applications: 'Cheksiz ariza',
  basic_match: 'Oddiy AI moslik bahosi',
  chat_with_employers: 'Ish beruvchilar bilan yozishma',
  priority_visibility: 'Ustuvor koʻrinish',
  extended_ai: 'Kengaytirilgan AI yordam',
  salary_insights: 'Maosh tahlili',
  who_viewed: 'Profilingizni kim koʻrgani',
  unlimited_ai: 'Cheksiz AI',
  interview_prep: 'Intervyuga tayyorgarlik',
  cv_review: 'CV tahlili',
  // employer
  basic_search: 'Oddiy nomzod qidiruvi',
  ai_scoring: 'AI nomzod baholash',
  advanced_filters: 'Kengaytirilgan filterlar',
  verified_badge: 'Tasdiqlangan nishon',
  team_seats: 'Jamoa hisoblari',
  pipeline_automation: 'Pipeline avtomatlashtirish',
  dedicated_manager: 'Shaxsiy menejer',
  ats_integration: 'ATS integratsiya',
  sso: 'SSO',
  // shared
  priority_support: 'Ustuvor qoʻllab-quvvatlash',
};

/** A plan feature key → Uzbek. An unknown key is humanised, never dropped. */
export function planFeature(key) {
  if (key == null) return '—';
  if (typeof key !== 'string') return key.label || key.name || '—';
  return PLAN_FEATURES[key] ?? key.replace(/_/g, ' ');
}

// `danger` is a real red now (it used to alias `warn`): a blocked account and a
// queue waiting for review are not the same signal.
const TONES = {
  active: 'good', approved: 'good', resolved: 'good',
  pending: 'warn', pending_review: 'warn', reviewing: 'info', open: 'warn',
  suspended: 'danger', rejected: 'danger', deleted: 'danger', dismissed: 'neutral',
  draft: 'neutral', paused: 'neutral', closed: 'neutral', expired: 'neutral',
  admin: 'ai', moderator: 'info', employer: 'accent', candidate: 'neutral',
  // application statuses
  hired: 'good', offer: 'good', shortlisted: 'info', interview: 'ai',
  submitted: 'neutral', applied: 'neutral', screening: 'warn', reviewed: 'info',
  in_review: 'info', offered: 'good',
  withdrawn: 'neutral', viewed: 'neutral',
  // subscription statuses
  trialing: 'info', trial: 'info', past_due: 'warn', canceled: 'neutral',
  cancelled: 'neutral', incomplete: 'warn', grace: 'warn',
  // payment statuses
  paid: 'good', succeeded: 'good', success: 'good', failed: 'danger',
  refunded: 'neutral', processing: 'info',
  // companies
  verified: 'good', unverified: 'neutral',
};
export function tone(key) {
  return TONES[key] ?? 'neutral';
}

// ─── Audit actions ───
// The reference CMS and the company endpoints log actions too, so the log no
// longer shows raw `reference.district.updated` strings next to Uzbek ones.
const AUDIT_LABELS = {
  'user.updated': 'Foydalanuvchi yangilandi',
  'user.plan_changed': 'Tarif oʻzgartirildi',
  'job.moderate.approved': 'Vakansiya tasdiqlandi',
  'job.moderate.rejected': 'Vakansiya rad etildi',
  'job.moderate.featured': 'Vakansiya tavsiya etildi',
  'job.moderate.unfeatured': 'Tavsiya bekor qilindi',
  'verification.approved': 'Tasdiqlash qabul qilindi',
  'verification.rejected': 'Tasdiqlash rad etildi',
  'report.resolved': 'Shikoyat hal qilindi',
  'report.dismissed': 'Shikoyat rad etildi',
  'company.verified': 'Kompaniya tasdiqlandi',
  'company.unverified': 'Kompaniya tasdigʻi bekor qilindi',
};
const AUDIT_ENTITY = {
  category: 'Kategoriya',
  skill: 'Koʻnikma',
  district: 'Tuman',
  region: 'Viloyat',
};
const AUDIT_VERB = {
  created: 'qoʻshildi',
  updated: 'yangilandi',
  deleted: 'oʻchirildi',
};

export function auditLabel(action) {
  if (!action) return '—';
  if (AUDIT_LABELS[action]) return AUDIT_LABELS[action];
  // reference.<entity>.<verb> → "Tuman yangilandi"
  const parts = String(action).split('.');
  if (parts[0] === 'reference' && parts.length === 3) {
    const entity = AUDIT_ENTITY[parts[1]] ?? parts[1];
    const verb = AUDIT_VERB[parts[2]] ?? parts[2];
    return `${entity} ${verb}`;
  }
  return action;
}

/** Colour a log line by what it did, not by which module it came from. */
export function auditTone(action) {
  const a = String(action || '');
  if (/(approved|verified|created|resolved)$/.test(a) && !/unverified/.test(a)) return 'good';
  if (/(rejected|deleted|dismissed|unverified|unfeatured)$/.test(a)) return 'danger';
  if (/featured$/.test(a)) return 'ai';
  return 'info';
}

/** App\\Models\\User → "User" (last path segment of an FQCN). */
export function shortClass(fqcn) {
  if (!fqcn) return '—';
  const parts = String(fqcn).split('\\');
  return parts[parts.length - 1];
}

const TARGET_LABELS = {
  User: 'Foydalanuvchi',
  Job: 'Vakansiya',
  Company: 'Kompaniya',
  Verification: 'Tasdiqlash',
  Report: 'Shikoyat',
  Subscription: 'Obuna',
  Payment: 'Toʻlov',
  Category: 'Kategoriya',
  Skill: 'Koʻnikma',
  District: 'Tuman',
  Application: 'Ariza',
};
export function targetLabel(fqcn) {
  const short = shortClass(fqcn);
  return TARGET_LABELS[short] ?? short;
}

// ─── Money (UZS) ───
export function som(amount) {
  if (amount == null || isNaN(amount)) return '—';
  if (amount >= 1e9) return `${(amount / 1e9).toFixed(1).replace(/\.0$/, '')} mlrd soʻm`;
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(amount >= 1e7 ? 0 : 1).replace(/\.0$/, '')} mln soʻm`;
  if (amount >= 1e3) return `${Math.round(amount / 1e3)} ming soʻm`;
  return `${Math.round(amount)} soʻm`;
}
export function salaryRange(min, max) {
  if (min == null && max == null) return '—';
  if (min != null && max != null && min !== max) {
    if (min >= 1e6 || max >= 1e6) return `${Math.round(min / 1e6)}–${Math.round(max / 1e6)} mln soʻm`;
    return `${Math.round(min / 1e3)}–${Math.round(max / 1e3)} ming soʻm`;
  }
  return som(min ?? max);
}

// ─── Dates ───
// Written by hand rather than via Intl: Chromium ships without `uz-UZ` date
// patterns in some builds and falls back to "2026 M07 13", which is what the
// panel was showing. These names are always right, in every browser.
const MONTHS_SHORT = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];
const MONTHS_LONG = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];

const pad = (n) => String(n).padStart(2, '0');
function toDate(iso) {
  if (!iso) return null;
  const d = iso instanceof Date ? iso : new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/** 29-avg, 2026 */
export function fmtDate(iso) {
  const d = toDate(iso);
  if (!d) return '—';
  return `${pad(d.getDate())}-${MONTHS_SHORT[d.getMonth()]}, ${d.getFullYear()}`;
}
/** 29-avg, 2026 · 14:05 */
export function fmtDateTime(iso) {
  const d = toDate(iso);
  if (!d) return '—';
  return `${fmtDate(d)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
/** 29 avg — compact axis / chart label */
export function fmtDayMonth(iso) {
  const d = toDate(iso);
  if (!d) return '';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}
/** payshanba, 29 avgust — used by the dashboard greeting */
export function fmtLongDay(iso) {
  const d = toDate(iso) || new Date();
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`;
}
export function fmtTime(iso) {
  const d = toDate(iso);
  if (!d) return '—';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function timeAgo(iso) {
  const d = toDate(iso);
  if (!d) return '—';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 0) return fmtDate(d);
  if (s < 60) return 'hozir';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} daqiqa oldin`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat oldin`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days} kun oldin`;
  return fmtDate(d);
}

/** "3 kun" — for dense table cells where the "oldin" is implied by the column. */
export function timeAgoShort(iso) {
  const d = toDate(iso);
  if (!d) return '—';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'hozir';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} daq`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days} kun`;
  return fmtDate(d);
}

/** ISO date (YYYY-MM-DD) for a Date, in local time — chart bucket keys. */
export function isoDay(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ─── Numbers ───
/** Group digits: 12345 → "12 345". Hand-grouped for the same reason as dates. */
export function fmtNum(n) {
  if (n == null || isNaN(n)) return '—';
  const neg = n < 0;
  const s = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return neg ? `−${s}` : s;
}
/** 1200 → "1,2 ming" · 3400000 → "3,4 mln" — for tight KPI slots. */
export function fmtCompact(n) {
  if (n == null || isNaN(n)) return '—';
  const abs = Math.abs(n);
  const dec = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
  if (abs >= 1e9) return `${dec(n / 1e9)} mlrd`;
  if (abs >= 1e6) return `${dec(n / 1e6)} mln`;
  if (abs >= 1e4) return `${dec(n / 1e3)} ming`;
  return fmtNum(n);
}
/** Full money with thousands grouping: 1500000 → "1 500 000 soʻm". */
export function somFull(amount) {
  if (amount == null || isNaN(amount)) return '—';
  return `${fmtNum(amount)} soʻm`;
}
/** Percentage of a whole, e.g. 12%. */
export function pct(part, whole) {
  if (!whole) return '0%';
  return `${Math.round((part / whole) * 100)}%`;
}
/** Signed change between two periods: +18% / −4% / — when there is no base. */
export function delta(current, previous) {
  if (previous == null || current == null) return null;
  if (previous === 0) return current === 0 ? { pct: 0, dir: 'flat' } : { pct: null, dir: 'up' };
  const change = Math.round(((current - previous) / previous) * 100);
  return { pct: change, dir: change > 0 ? 'up' : change < 0 ? 'down' : 'flat' };
}

// ─── Localised reference name (falls back across locales) ───
export function refName(row, locale = 'uz') {
  if (!row) return '—';
  return row[`name_${locale}`] || row.name || row.name_uz || row.name_ru || row.name_en || '—';
}

/** First letter(s) for an avatar chip. */
export function initials(value) {
  const s = String(value ?? '').trim();
  if (!s) return '?';
  const words = s.split(/[\s@._-]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

/** Deterministic tint per identity, so the same user keeps the same colour. */
const AVATAR_TONES = ['accent', 'info', 'ai', 'good', 'warn'];
export function avatarTone(seed) {
  const s = String(seed ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

// Shared chart palette. Resolved from the live CSS variables so the charts
// follow the theme instead of freezing the light-mode hexes.
const CHART_VARS = {
  accent: '--color-accent',
  info: '--color-info',
  ai: '--color-ai',
  warn: '--color-warn',
  good: '--color-good',
  danger: '--color-danger',
  neutral: '--color-ink-4',
  ink: '--color-ink-2',
  line: '--color-line',
};
const CHART_FALLBACK = {
  accent: '#3d6bff', info: '#0ea5e9', ai: '#7c3aed', warn: '#d9920b',
  good: '#1f9e54', danger: '#e1483b', neutral: '#94a3b8', ink: '#475569',
  line: '#d7dfea',
};

export function chartColor(role) {
  if (typeof window === 'undefined') return CHART_FALLBACK[role] ?? CHART_FALLBACK.accent;
  const v = getComputedStyle(document.documentElement).getPropertyValue(CHART_VARS[role] ?? '').trim();
  return v || CHART_FALLBACK[role] || CHART_FALLBACK.accent;
}

/** Back-compat alias for the old constant map — resolves at read time. */
export const CHART_COLORS = new Proxy(CHART_FALLBACK, {
  get: (target, key) => (typeof key === 'string' && key in CHART_VARS ? chartColor(key) : target[key]),
});

/** Parse the `cursor` value out of a Laravel pagination `links.next` URL. */
export function cursorFromUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url, 'http://x');
    return u.searchParams.get('cursor');
  } catch {
    return null;
  }
}
