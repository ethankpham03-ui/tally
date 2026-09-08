import assert from 'node:assert/strict';
import test from 'node:test';
import { applyMoneyInputEdit, formatMoneyInputValue, parseMoneyInputPaste, reconcileMoneyInputChange, type MoneyInputOptions } from '../app/money-input-format.ts';
import { parseMoneyInput } from '../app/money.ts';

const vnd = { decimalPlaces: 0 };
const usd = { decimalPlaces: 2 };

function typeText(text: string, options: MoneyInputOptions, initial = '') {
  let value = initial, cursor = formatMoneyInputValue(initial).length;
  for (const digit of text) {
    const result = applyMoneyInputEdit(value, { start: cursor, end: cursor, kind: 'insert', text: digit }, options);
    assert.equal(result.accepted, true, `typing ${digit} into ${value}`);
    value = result.value;
    cursor = result.selectionStart;
  }
  return { value, display: formatMoneyInputValue(value), cursor };
}

test('sequential banking entry groups live and preserves exact stored minor units', () => {
  const amount = typeText('900000', vnd);
  assert.deepEqual(amount, { value: '900000', display: '900.000', cursor: 7 });
  assert.equal(parseMoneyInput(amount.value, 'VND'), 900000);
  const foreign = typeText('1234,56', usd);
  assert.deepEqual(foreign, { value: '1234.56', display: '1.234,56', cursor: 8 });
  assert.equal(parseMoneyInput(foreign.value, 'USD'), 123456);
  assert.deepEqual(typeText('1234.56', usd), foreign);
});

test('canonical prop is not reinterpreted as a pasted grouping pattern', () => {
  assert.equal(formatMoneyInputValue('1.234'), '1,234');
  assert.equal(formatMoneyInputValue('1234.56'), '1.234,56');
  assert.equal(formatMoneyInputValue('-1234567.00'), '-1.234.567,00');
  assert.equal(formatMoneyInputValue('1234.'), '1.234,');
});

test('visible grouped values round-trip and common explicit decimal paste formats agree', () => {
  for (const options of [vnd, usd, { decimalPlaces: 12 }]) {
    for (const raw of ['900000', '900.000', '1.234', '1.234.567']) {
      const parsed = parseMoneyInputPaste(raw, options);
      assert.equal(parsed, raw.replaceAll('.', ''), raw);
      assert.equal(parseMoneyInputPaste(formatMoneyInputValue(parsed!), options), parsed);
    }
  }
  for (const raw of ['1234.56', '1234,56', '1.234,56', '1,234.56', '1 234,56', '1\u202f234,56', '１２３４,５６']) {
    assert.equal(parseMoneyInputPaste(raw, usd), '1234.56', raw);
  }
  assert.equal(parseMoneyInputPaste('9,000,000', vnd), '9000000');
  assert.equal(parseMoneyInputPaste('9,000,000', usd), '9000000');
});

test('invalid and excessive precision paste leaves the previous value and selection intact', () => {
  for (const raw of ['1234.567', '12,345', '1.23.456', '1,23.45', '1.234,567', '3e6', 'abc900000', '12 34', '1-2']) {
    const result = applyMoneyInputEdit('500', { start: 0, end: 3, kind: 'paste', text: raw }, usd);
    assert.deepEqual(result, { value: '500', displayValue: '500', selectionStart: 0, selectionEnd: 3, accepted: false }, raw);
  }
  assert.equal(parseMoneyInputPaste('1234,00', vnd), null);
  assert.equal(parseMoneyInputPaste('1234,5678901234567', { decimalPlaces: 12 }), null);
  assert.equal(parseMoneyInputPaste('-100', vnd), null);
});

test('inserting in the middle restores caret next to the edited digit after regrouping', () => {
  const result = applyMoneyInputEdit('123456', { start: 2, end: 2, kind: 'insert', text: '9' }, vnd);
  assert.deepEqual(result, { value: '1293456', displayValue: '1.293.456', selectionStart: 4, selectionEnd: 4, accepted: true });
  const next = applyMoneyInputEdit(result.value, { start: result.selectionStart, end: result.selectionEnd, kind: 'insert', text: '8' }, vnd);
  assert.equal(next.value, '12983456');
  assert.equal(next.selectionStart, 5);
  assert.equal(next.displayValue, '12.983.456');
});

test('Backspace and Delete at grouping boundaries delete adjacent digits without trapping the caret', () => {
  const backward = applyMoneyInputEdit('900000', { start: 4, end: 4, kind: 'backspace' }, vnd);
  assert.deepEqual(backward, { value: '90000', displayValue: '90.000', selectionStart: 2, selectionEnd: 2, accepted: true });
  const forward = applyMoneyInputEdit('900000', { start: 3, end: 3, kind: 'delete' }, vnd);
  assert.deepEqual(forward, { value: '90000', displayValue: '90.000', selectionStart: 4, selectionEnd: 4, accepted: true });
  assert.equal(applyMoneyInputEdit('900000', { start: 3, end: 4, kind: 'backspace' }, vnd).value, '900000');
  assert.equal(applyMoneyInputEdit('900000', { start: 2, end: 5, kind: 'delete' }, vnd).value, '9000');
});

test('selection replacement, partial paste and full clear preserve the intended amount', () => {
  assert.equal(applyMoneyInputEdit('1234567', { start: 2, end: 5, kind: 'insert', text: '9' }, vnd).value, '19567');
  const replace = applyMoneyInputEdit('900000', { start: 0, end: 7, kind: 'paste', text: '1.234,56' }, usd);
  assert.equal(replace.value, '1234.56');
  assert.equal(replace.selectionStart, 8);
  assert.equal(applyMoneyInputEdit('1200', { start: 3, end: 5, kind: 'paste', text: '45' }, vnd).value, '1245');
  assert.equal(applyMoneyInputEdit('900000', { start: 0, end: 7, kind: 'backspace' }, vnd).value, '');
});

test('signed opening balances, leading zeros and partial decimal drafts remain editable', () => {
  assert.deepEqual(typeText('-500', { ...vnd, signed: true }), { value: '-500', display: '-500', cursor: 4 });
  assert.equal(applyMoneyInputEdit('-5', { start: 2, end: 2, kind: 'backspace' }, { ...vnd, signed: true }).value, '-');
  assert.equal(applyMoneyInputEdit('-', { start: 1, end: 1, kind: 'backspace' }, { ...vnd, signed: true }).value, '');
  assert.equal(typeText('000900000', vnd).value, '900000');
  assert.deepEqual(typeText(',50', usd), { value: '0.50', display: '0,50', cursor: 4 });
  assert.equal(parseMoneyInputPaste('−1.234,56', { ...usd, signed: true }), '-1234.56');
});

test('fraction edits reject excess digits without rounding and retain higher precision FX quotes', () => {
  const result = applyMoneyInputEdit('1234.56', { start: 8, end: 8, kind: 'insert', text: '7' }, usd);
  assert.equal(result.accepted, false);
  assert.equal(result.value, '1234.56');
  assert.equal(applyMoneyInputEdit('1234.56', { start: 6, end: 8, kind: 'insert', text: '7' }, usd).value, '1234.7');
  assert.equal(typeText('25000,123456789012', { decimalPlaces: 12 }).value, '25000.123456789012');
});

test('very large amounts stay string-exact until the existing domain validator rejects unsafe money', () => {
  const raw = '9007199254740993123456789';
  const formatted = '9.007.199.254.740.993.123.456.789';
  assert.equal(formatMoneyInputValue(raw), formatted);
  assert.equal(parseMoneyInputPaste(formatted, vnd), raw);
  assert.equal(typeText(raw, vnd).value, raw);
  assert.equal(parseMoneyInput(raw, 'VND'), null);
});

test('native input fallbacks preserve middle edits, grouping-boundary deletion and autofill', () => {
  assert.equal(reconcileMoneyInputChange('123456', '1293.456', 3, 'insertText', '9', vnd).value, '1293456');
  assert.equal(reconcileMoneyInputChange('900000', '900000', 3, 'deleteContentBackward', null, vnd).value, '90000');
  assert.equal(reconcileMoneyInputChange('900000', '900000', 3, 'deleteContentForward', null, vnd).value, '90000');
  assert.equal(reconcileMoneyInputChange('900000', '1,234.56', 8, 'insertReplacementText', null, usd).value, '1234.56');
  assert.equal(reconcileMoneyInputChange('1234', '1.2345', 6, '', null, vnd).value, '12345');
});
