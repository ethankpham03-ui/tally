import type { SubscriptionCurrency } from './finance-domain.ts';

export const CURRENCIES = ['VND', 'USD', 'EUR', 'GBP', 'JPY', 'KRW', 'SGD', 'THB', 'AUD', 'CAD'] as const;
export type Currency = SubscriptionCurrency;
export const CURRENCY_DECIMALS: Record<Currency, number> = {
  VND: 0, USD: 2, EUR: 2, GBP: 2, JPY: 0, KRW: 0, SGD: 2, THB: 2, AUD: 2, CAD: 2,
};
const MAX_MONEY = BigInt(Number.MAX_SAFE_INTEGER);

export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value);
}

export function safeMoney(value: bigint): number {
  if (value > MAX_MONEY || value < -MAX_MONEY) throw new RangeError('Money exceeds the safe integer limit');
  return Number(value);
}

export function sumMoney(values: Iterable<number>): number {
  let result = 0n;
  for (const value of values) {
    if (!Number.isSafeInteger(value)) throw new RangeError('Money must be a safe integer');
    result += BigInt(value);
  }
  return safeMoney(result);
}

/** Plain decimal input, deliberately without ambiguous grouping separators. */
export function parseMoneyInput(text: string, currency: Currency): number | null {
  const value = text.trim();
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return null;
  const decimals = CURRENCY_DECIMALS[currency];
  const fraction = match[3] ?? '';
  if (fraction.length > decimals && /[1-9]/.test(fraction.slice(decimals))) return null;
  try {
    const units = BigInt(match[2]) * (10n ** BigInt(decimals))
      + BigInt(fraction.slice(0, decimals).padEnd(decimals, '0') || '0');
    return safeMoney(match[1] === '-' ? -units : units);
  } catch { return null; }
}

export function formatMoneyAmount(amount: number, currency: Currency): string {
  if (!Number.isSafeInteger(amount)) throw new RangeError('Money must be a safe integer');
  const decimals = CURRENCY_DECIMALS[currency];
  const sign = amount < 0 ? '-' : '';
  const value = BigInt(Math.abs(amount));
  if (!decimals) return `${sign}${value}`;
  const scale = 10n ** BigInt(decimals);
  return `${sign}${value / scale}.${String(value % scale).padStart(decimals, '0')}`;
}

export function toMajorUnits(amount: number, currency: Currency): number {
  return Number(formatMoneyAmount(amount, currency));
}

export const formatMoneyInput = formatMoneyAmount;
export function formatMoney(amount: number, currency: Currency, localeTag = 'vi-VN'): string {
  const decimal = formatMoneyAmount(amount, currency);
  const decimals = CURRENCY_DECIMALS[currency];
  const absolute = BigInt(Math.abs(amount));
  const whole = absolute / (10n ** BigInt(decimals));
  const fraction = decimal.split('.')[1];
  const signedWhole = amount < 0 ? (whole === 0n ? -0 : -whole) : whole;
  const formatter = new Intl.NumberFormat(localeTag, { style: 'currency', currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return formatter.formatToParts(signedWhole).map((part) => part.type === 'fraction' ? fraction : part.value).join('');
}

/** Decimal FX quotes are rational numbers, never binary-floating arithmetic. */
export function decimalRatio(value: string): { numerator: bigint; denominator: bigint } | null {
  const match = /^(\d{1,18})(?:\.(\d{1,12}))?$/.exec(value.trim());
  if (!match) return null;
  const fraction = match[2] ?? '';
  const numerator = BigInt(`${match[1]}${fraction}`);
  if (numerator <= 0n) return null;
  return { numerator, denominator: 10n ** BigInt(fraction.length) };
}

function roundRatio(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < 0n;
  const absolute = negative ? -numerator : numerator;
  const rounded = (absolute + denominator / 2n) / denominator;
  return negative ? -rounded : rounded;
}

/** rate is VND per one major unit of the native currency; half away from zero. */
export function convertToVnd(amount: number, currency: Currency, rate: string): number {
  if (!Number.isSafeInteger(amount)) throw new RangeError('Money must be a safe integer');
  const ratio = decimalRatio(rate);
  if (!ratio) throw new RangeError('Exchange rate must be a positive plain decimal');
  return safeMoney(roundRatio(BigInt(amount) * ratio.numerator, ratio.denominator * (10n ** BigInt(CURRENCY_DECIMALS[currency]))));
}

export function majorAmountToMinor(amount: number, currency: Currency): number {
  if (!Number.isFinite(amount)) throw new RangeError('Invalid amount');
  const result = parseMoneyInput(String(amount), currency);
  if (result === null) throw new RangeError('Invalid amount or too many decimal places');
  return result;
}
