const IST_TIME_ZONE = 'Asia/Kolkata';
const IST_LOCALE = 'en-IN';

export function parseIstDateTime(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  let input = value;
  if (typeof value === 'string') {
    const raw = value.trim();
    const localIstMatch = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2}(?:\.\d+)?)(?:Z|\+00:00)$/);
    const dateOnlyMatch = raw.match(/^(\d{4}-\d{2}-\d{2})$/);

    if (localIstMatch) {
      input = `${localIstMatch[1]}T${localIstMatch[2]}+05:30`;
    } else if (dateOnlyMatch) {
      input = `${dateOnlyMatch[1]}T00:00:00+05:30`;
    }
  }

  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDate(value) {
  return parseIstDateTime(value);
}

export function formatIstDate(value, fallback = '-') {
  const date = toDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat(IST_LOCALE, {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

export function formatIstTimestamp(value, fallback = '-') {
  return formatIstDate(value, fallback);
}

export function todayIstIsoDate() {
  const parts = new Intl.DateTimeFormat(IST_LOCALE, {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function parseDateOnlyInIst(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return toDate(value);
  const [, year, month, day] = match;
  return new Date(`${year}-${month}-${day}T00:00:00+05:30`);
}
