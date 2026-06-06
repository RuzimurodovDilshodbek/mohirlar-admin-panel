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
  'job.moderate.approved',
  'job.moderate.rejected',
  'job.moderate.featured',
  'job.moderate.unfeatured',
  'verification.approved',
  'verification.rejected',
  'report.resolved',
  'report.dismissed',
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
};

export function label(key) {
  if (key == null) return '—';
  return LABELS[key] ?? key;
}

const TONES = {
  active: 'good', approved: 'good', resolved: 'good',
  pending: 'warn', pending_review: 'warn', reviewing: 'info', open: 'warn',
  suspended: 'danger', rejected: 'danger', deleted: 'danger', dismissed: 'neutral',
  draft: 'neutral', paused: 'neutral', closed: 'neutral', expired: 'neutral',
  admin: 'ai', moderator: 'info', employer: 'accent', candidate: 'neutral',
};
export function tone(key) {
  return TONES[key] ?? 'neutral';
}

// Audit action → human label + tone
export function auditLabel(action) {
  const map = {
    'user.updated': 'Foydalanuvchi yangilandi',
    'job.moderate.approved': 'Vakansiya tasdiqlandi',
    'job.moderate.rejected': 'Vakansiya rad etildi',
    'job.moderate.featured': 'Vakansiya tavsiya etildi',
    'job.moderate.unfeatured': 'Tavsiya bekor qilindi',
    'verification.approved': 'Tasdiqlash qabul qilindi',
    'verification.rejected': 'Tasdiqlash rad etildi',
    'report.resolved': 'Shikoyat hal qilindi',
    'report.dismissed': 'Shikoyat rad etildi',
  };
  return map[action] ?? action;
}

/** App\\Models\\User → "User" (last path segment of an FQCN). */
export function shortClass(fqcn) {
  if (!fqcn) return '—';
  const parts = String(fqcn).split('\\');
  return parts[parts.length - 1];
}

// ─── Money (UZS → "mln soʻm") ───
export function som(amount) {
  if (amount == null) return '—';
  if (amount >= 1e6) return `${Math.round(amount / 1e6)} mln soʻm`;
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
export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleString('uz-UZ', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
export function timeAgo(iso) {
  if (!iso) return '—';
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return 'hozir';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} daqiqa oldin`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat oldin`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days} kun oldin`;
  return fmtDate(iso);
}

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
