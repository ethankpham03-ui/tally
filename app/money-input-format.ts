export type MoneyInputOptions = { decimalPlaces: number; signed?: boolean };
export type MoneyInputEdit = { start: number; end: number; kind: 'insert' | 'paste' | 'backspace' | 'delete'; text?: string };
export type MoneyInputEditResult = { value: string; displayValue: string; selectionStart: number; selectionEnd: number; accepted: boolean };

/** Canonical plain decimals are distinct from user-facing, dot-grouped text. */
export function formatMoneyInputValue(value: string): string {
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction] = unsigned.split('.');
  return `${negative ? '-' : ''}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${fraction === undefined ? '' : `,${fraction}`}`;
}

function canonicalOffset(display: string, offset: number): number {
  return display.slice(0, Math.max(0, offset)).replaceAll('.', '').length;
}
function displayOffset(display: string, offset: number): number {
  if (offset <= 0) return 0;
  let count = 0;
  for (let index = 0; index < display.length; index += 1) {
    if (display[index] !== '.') count += 1;
    if (count === offset) return index + 1;
  }
  return display.length;
}

function normalizeDraft(raw: string, cursor: number, options: MoneyInputOptions): { value: string; cursor: number } | null {
  if (!Number.isInteger(options.decimalPlaces) || options.decimalPlaces < 0 || options.decimalPlaces > 12) return null;
  if (raw === '') return { value: '', cursor: 0 };
  if (raw === '-') return options.signed ? { value: '-', cursor: Math.min(1, cursor) } : null;
  if (!/^-?\d*(?:\.\d*)?$/.test(raw) || (!options.signed && raw.startsWith('-'))) return null;
  const signLength = raw.startsWith('-') ? 1 : 0;
  if (raw[signLength] === '.') { raw = `${raw.slice(0, signLength)}0${raw.slice(signLength)}`; if (cursor > signLength) cursor += 1; }
  const [whole, fraction] = raw.slice(signLength).split('.');
  if (!whole || (fraction !== undefined && (options.decimalPlaces === 0 || fraction.length > options.decimalPlaces))) return null;
  const stripped = whole.replace(/^0+(?=\d)/, '');
  const removed = whole.length - stripped.length;
  cursor -= Math.min(removed, Math.max(0, cursor - signLength));
  return { value: `${raw.slice(0, signLength)}${stripped}${fraction === undefined ? '' : `.${fraction}`}`, cursor };
}

function isGrouped(value: string, separator: string): boolean {
  const groups = value.split(separator);
  return groups.length > 1 && /^\d{1,3}$/.test(groups[0]) && groups.slice(1).every((group) => /^\d{3}$/.test(group));
}

/**
 * Paste accepts the displayed banking format and explicit US/native decimals.
 * Valid dot-grouping wins over decimal interpretation, including FX fields, so
 * copying the visible value always round-trips. No rounding or digit truncation.
 */
export function parseMoneyInputPaste(text: string, options: MoneyInputOptions): string | null {
  let value = text.trim().replace(/\u2212/g, '-').replace(/[\u00a0\u202f]/g, ' ')
    .replace(/[０-９]/g, (digit) => String(digit.charCodeAt(0) - 0xff10));
  let sign = '';
  if (/^[+-]/.test(value)) { sign = value[0] === '-' ? '-' : ''; value = value.slice(1); }
  if (sign && !options.signed) return null;
  if (!value) return normalizeDraft(sign, sign.length, options)?.value ?? null;
  if (!/^[\d., ]+$/.test(value)) return null;
  let whole = value, fraction: string | undefined;
  const dots = value.split('.').length - 1, commas = value.split(',').length - 1;
  if (value.includes(' ')) {
    if (dots + commas > 1) return null;
    const separator = commas ? ',' : dots ? '.' : undefined;
    if (separator) [whole, fraction] = value.split(separator);
    if (!isGrouped(whole, ' ')) return null;
    whole = whole.replaceAll(' ', '');
  } else if (dots && commas) {
    const decimal = value.lastIndexOf(',') > value.lastIndexOf('.') ? ',' : '.';
    const group = decimal === ',' ? '.' : ',';
    if (value.split(decimal).length !== 2) return null;
    [whole, fraction] = value.split(decimal);
    if (!isGrouped(whole, group)) return null;
    whole = whole.replaceAll(group, '');
  } else if (dots) {
    if (isGrouped(value, '.')) whole = value.replaceAll('.', '');
    else if (dots === 1) [whole, fraction] = value.split('.');
    else return null;
  } else if (commas) {
    if ((commas > 1 || options.decimalPlaces === 0) && isGrouped(value, ',')) whole = value.replaceAll(',', '');
    else if (commas === 1) [whole, fraction] = value.split(',');
    else return null;
  }
  const canonical = `${sign}${whole}${fraction === undefined ? '' : `.${fraction}`}`;
  return normalizeDraft(canonical, canonical.length, options)?.value ?? null;
}

/** Selection offsets refer to the displayed text, never the unformatted state. */
export function applyMoneyInputEdit(value: string, edit: MoneyInputEdit, options: MoneyInputOptions): MoneyInputEditResult {
  const before = formatMoneyInputValue(value);
  const start = Math.max(0, Math.min(edit.start, edit.end, before.length));
  const end = Math.max(start, Math.min(Math.max(edit.start, edit.end), before.length));
  const reject = (): MoneyInputEditResult => ({ value, displayValue: before, selectionStart: start, selectionEnd: end, accepted: false });
  let from = canonicalOffset(before, start), to = canonicalOffset(before, end);
  let inserted = '';
  if (edit.kind === 'paste') {
    const parsed = parseMoneyInputPaste(edit.text ?? '', options);
    if (parsed === null) return reject();
    inserted = parsed;
  } else if (edit.kind === 'insert') {
    inserted = (edit.text ?? '').replaceAll(',', '.').replace(/\u2212/g, '-')
      .replace(/[０-９]/g, (digit) => String(digit.charCodeAt(0) - 0xff10));
  } else if (start === end) {
    if (edit.kind === 'backspace') from = Math.max(0, from - 1);
    else to = Math.min(value.length, to + 1);
  }
  const next = normalizeDraft(value.slice(0, from) + inserted + value.slice(to), from + inserted.length, options);
  if (!next) return reject();
  const displayValue = formatMoneyInputValue(next.value);
  const selection = displayOffset(displayValue, next.cursor);
  return { value: next.value, displayValue, selectionStart: selection, selectionEnd: selection, accepted: true };
}

/** Fallback for autofill, speech input, and browsers without cancelable beforeinput. */
export function reconcileMoneyInputChange(value: string, displayed: string, cursor: number, inputType: string, data: string | null, options: MoneyInputOptions): MoneyInputEditResult {
  const before = formatMoneyInputValue(value);
  if (inputType === 'insertFromPaste' || inputType === 'insertReplacementText' || inputType === 'historyUndo' || inputType === 'historyRedo') {
    return applyMoneyInputEdit(value, { start: 0, end: before.length, kind: 'paste', text: displayed }, options);
  }
  if (inputType === 'insertText' && data !== null) {
    const start = Math.max(0, cursor - data.length);
    const removed = Math.max(0, before.length + data.length - displayed.length);
    return applyMoneyInputEdit(value, { start, end: start + removed, kind: 'insert', text: data }, options);
  }
  if ((inputType === 'deleteContentBackward' || inputType === 'deleteContentForward') && before.length - displayed.length === 1) {
    const start = cursor + (inputType === 'deleteContentBackward' ? 1 : 0);
    return applyMoneyInputEdit(value, { start, end: start, kind: inputType === 'deleteContentBackward' ? 'backspace' : 'delete' }, options);
  }
  let start = 0;
  while (start < before.length && start < displayed.length && before[start] === displayed[start]) start += 1;
  let end = before.length, after = displayed.length;
  while (end > start && after > start && before[end - 1] === displayed[after - 1]) { end -= 1; after -= 1; }
  return applyMoneyInputEdit(value, { start, end, kind: 'insert', text: displayed.slice(start, after) }, options);
}
