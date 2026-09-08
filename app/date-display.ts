import { isValidDateOnly } from './finance-domain.ts';

type DateValue = Date | number | string;

function dateParts(value: DateValue): { day: string; month: string; year: string } | null {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (!isValidDateOnly(value)) return null;
    const [year, month, day] = value.split('-');
    return { day, month, year };
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return { day: String(date.getDate()).padStart(2, '0'), month: String(date.getMonth() + 1).padStart(2, '0'), year: String(date.getFullYear()).padStart(4, '0') };
}

/** Fixed day/month order in every UI language. ISO date-only values never shift zones. */
export function formatShortDate(value: DateValue): string {
  const parts = dateParts(value);
  return parts ? `${parts.day}/${parts.month}` : '—';
}

export function formatFullDate(value: DateValue): string {
  const parts = dateParts(value);
  return parts ? `${parts.day}/${parts.month}/${parts.year}` : '—';
}

export function formatWeekday(value: DateValue, locale = 'en-US', length: 'long' | 'short' | 'narrow' = 'short'): string {
  const parts = dateParts(value);
  if (!parts) return '—';
  return new Intl.DateTimeFormat(locale, { weekday: length, timeZone: 'UTC' })
    .format(new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00Z`));
}

/** Parse the visible day-first date; never interpret an ambiguous date as month-first. */
export function parseDisplayDate(value: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const iso = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  return isValidDateOnly(iso) ? iso : null;
}

/** Insert separators for numeric keyboards, and accept complete day-first or ISO pastes. */
export function formatDateInputDraft(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) && isValidDateOnly(value)) return formatFullDate(value);
  const parsed = parseDisplayDate(value);
  if (parsed) return formatFullDate(parsed);
  if (/[^\d/\s-]/.test(value)) return value;
  const digits = value.replace(/\D/g, '');
  return `${digits.slice(0, 2)}${digits.length > 2 ? `/${digits.slice(2, 4)}` : ''}${digits.length > 4 ? `/${digits.slice(4)}` : ''}`;
}
