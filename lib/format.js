// Deterministic formatting helpers.
// Intl output can differ between the Node server and the browser, which
// causes React hydration mismatches, so these are computed manually.

export function formatNumber(value) {
  const number = Math.round(Number(value) || 0);
  const sign = number < 0 ? '-' : '';
  const digits = String(Math.abs(number));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${grouped}`;
}

function parseSqlDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(text)
    ? `${text.replace(' ', 'T')}Z`
    : text;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

const pad = (value) => String(value).padStart(2, '0');

// SQLite timestamps are stored in UTC. Display them in Baku time (UTC+4)
// without relying on the machine timezone.
export function formatDateTime(value) {
  const date = parseSqlDate(value);
  if (!date) return value ? String(value) : '—';
  const baku = new Date(date.getTime() + 4 * 60 * 60 * 1000);
  return `${pad(baku.getUTCDate())}.${pad(baku.getUTCMonth() + 1)}.${baku.getUTCFullYear()} ${pad(baku.getUTCHours())}:${pad(baku.getUTCMinutes())}`;
}

export function formatDate(value) {
  const date = parseSqlDate(value);
  if (!date) return value ? String(value) : '—';
  const baku = new Date(date.getTime() + 4 * 60 * 60 * 1000);
  return `${pad(baku.getUTCDate())}.${pad(baku.getUTCMonth() + 1)}.${baku.getUTCFullYear()}`;
}

export function formatMoney(cents, { decimals = 2 } = {}) {
  const amount = Number(cents || 0) / 100;
  return `$${amount.toFixed(decimals)}`;
}
