import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDateInputDraft, formatFullDate, formatShortDate, formatWeekday, parseDisplayDate } from '../app/date-display.ts';

test('dates always use padded day/month order, including ambiguous English dates', () => {
  assert.equal(formatShortDate('2026-09-08'), '08/09');
  assert.equal(formatFullDate('2026-09-08'), '08/09/2026');
  assert.equal(formatShortDate('2026-01-02'), '02/01');
  assert.equal(formatFullDate('2024-02-29'), '29/02/2024');
});

test('date-only strings retain their exact calendar day at month and year boundaries', () => {
  assert.equal(formatFullDate('2025-12-31'), '31/12/2025');
  assert.equal(formatFullDate('2026-01-01'), '01/01/2026');
  assert.equal(formatShortDate('2026-03-08'), '08/03');
  assert.equal(formatWeekday('2026-09-08', 'en-US'), 'Tue');
  assert.match(formatWeekday('2026-09-08', 'vi-VN'), /^Th.*3$/);
});

test('Date and timestamp inputs keep local calendar semantics with a fixed display order', () => {
  const date = new Date(2026, 8, 8, 12, 30);
  assert.equal(formatShortDate(date), '08/09');
  assert.equal(formatFullDate(date.getTime()), '08/09/2026');
  assert.equal(formatFullDate('2026-09-08T12:30:00'), '08/09/2026');
});

test('invalid dates have an explicit empty marker instead of silently rolling into another day', () => {
  for (const value of ['2026-02-30', '2026-13-01', 'not-a-date', new Date(NaN)]) {
    assert.equal(formatShortDate(value), '—');
    assert.equal(formatFullDate(value), '—');
  }
});

test('typed dates are parsed day-first with leap-year and real calendar validation', () => {
  assert.equal(parseDisplayDate('08/09/2026'), '2026-09-08');
  assert.equal(parseDisplayDate('1/2/2026'), '2026-02-01');
  assert.equal(parseDisplayDate('29/02/2024'), '2024-02-29');
  assert.equal(parseDisplayDate('29/02/2000'), '2000-02-29');
  for (const value of ['', '08/09', '08/09/20', '31/04/2026', '29/02/1900', '29/02/2026', '13/13/2026', '00/09/2026', '2026-09-08']) assert.equal(parseDisplayDate(value), null, value);
});

test('numeric typing keeps partial drafts and inserts separators without accepting incomplete ISO values', () => {
  assert.equal(formatDateInputDraft('0'), '0');
  assert.equal(formatDateInputDraft('08'), '08');
  assert.equal(formatDateInputDraft('080'), '08/0');
  assert.equal(formatDateInputDraft('0809'), '08/09');
  assert.equal(formatDateInputDraft('08092'), '08/09/2');
  assert.equal(formatDateInputDraft('08092026'), '08/09/2026');
  assert.equal(parseDisplayDate(formatDateInputDraft('08092')), null);
  assert.equal(formatDateInputDraft('32/09/2026'), '32/09/2026');
  assert.equal(parseDisplayDate(formatDateInputDraft('32/09/2026')), null);
  assert.equal(parseDisplayDate(formatDateInputDraft('080920261')), null);
  assert.equal(parseDisplayDate(formatDateInputDraft('08/09/2026x')), null);
});

test('complete pasted day-first and ISO values normalize to the same visible date', () => {
  for (const raw of ['08/09/2026', '8/9/2026', '08092026', '2026-09-08']) {
    const draft = formatDateInputDraft(raw);
    assert.equal(draft, '08/09/2026');
    assert.equal(parseDisplayDate(draft), '2026-09-08');
  }
});
