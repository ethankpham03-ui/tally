import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveDailyFlowWindow } from '../app/daily-cashflow.ts';
import { createEmptyData, type Account, type FinanceData, type Transaction } from '../app/finance-v4.ts';

const today = '2026-09-08';
function account(id: string, kind: Account['kind'] = 'bank', currency: Account['currency'] = 'VND'): Account {
  return { id, kind, currency, name: id, openingBalance: 0, openingDate: '2020-01-01', archived: false };
}
function row(id: string, kind: Transaction['kind'], amount: number, extra: Partial<Transaction> = {}): Transaction {
  return { id, kind, amount, reportingAmount: amount, accountId: 'bank', title: id, date: today, category: kind === 'income' ? 'income' : 'other', ...extra };
}
function ledger(transactions: Transaction[] = []): FinanceData {
  return { ...createEmptyData(0, new Date(`${today}T12:00:00`)), transactions,
    accounts: [account('bank'), account('cash', 'cash'), account('card', 'credit_card'), account('usd', 'ewallet', 'USD')],
  };
}

test('one date keeps 1.5 million income and 700 thousand gross spending simultaneously', () => {
  const data = ledger([row('salary', 'income', 1_500_000), row('purchase', 'expense', -700_000)]);
  const original = structuredClone(data);
  const points = deriveDailyFlowWindow(data, today);
  assert.equal(points.length, 31);
  assert.deepEqual(points[15], {
    date: today, income: 1_500_000, expense: 700_000, refunds: 0, adjustments: 0,
    transactionCount: 2, unconvertedTransactionCount: 0, isFuture: false,
  });
  assert.deepEqual(data, original);
});

test('empty days are retained and exactly fifteen dates follow and precede today', () => {
  const points = deriveDailyFlowWindow(ledger(), today);
  assert.equal(points[0].date, '2026-08-24');
  assert.equal(points[15].date, today);
  assert.equal(points[30].date, '2026-09-23');
  assert.equal(new Set(points.map((point) => point.date)).size, 31);
  assert.deepEqual(points.map((point) => point.date), points.map((point) => point.date).sort());
  assert.equal(points.filter((point) => point.isFuture).length, 15);
  for (const point of points) {
    assert.equal(point.income + point.expense + point.refunds + point.adjustments, 0);
    assert.equal(point.transactionCount, 0);
  }
});

test('date-only windows cross years and leap days without UTC or local-time shifts', () => {
  for (const [center, start, end] of [
    ['2026-01-01', '2025-12-17', '2026-01-16'],
    ['2024-02-29', '2024-02-14', '2024-03-15'],
    ['2026-03-08', '2026-02-21', '2026-03-23'],
  ]) {
    const points = deriveDailyFlowWindow(ledger(), center);
    assert.equal(points[0].date, start);
    assert.equal(points[15].date, center);
    assert.equal(points[30].date, end);
  }
});

test('refunds remain separate positive amounts and never reduce the gross expense bar', () => {
  const data = ledger([row('purchase', 'expense', -700_000), row('return', 'refund', 900_000)]);
  const point = deriveDailyFlowWindow(data, today)[15];
  assert.equal(point.income, 0);
  assert.equal(point.expense, 700_000);
  assert.equal(point.refunds, 900_000);
  assert.equal(point.transactionCount, 2);
});

test('only captured reporting values count, and missing FX is disclosed without using current rates', () => {
  const data = ledger([
    row('foreign-purchase', 'expense', -500, { accountId: 'usd', reportingAmount: -125_000 }),
    row('unknown-expense', 'expense', -500, { accountId: 'usd', reportingAmount: undefined }),
    row('unknown-income', 'income', 1_000, { accountId: 'usd', reportingAmount: undefined }),
    row('unknown-refund', 'refund', 500, { accountId: 'usd', reportingAmount: undefined }),
  ]);
  data.exchangeRates = [{ currency: 'USD', date: today, rate: '30000', source: 'test' }];
  const point = deriveDailyFlowWindow(data, today)[15];
  assert.equal(point.expense, 125_000);
  assert.equal(point.income, 0);
  assert.equal(point.refunds, 0);
  assert.equal(point.transactionCount, 4);
  assert.equal(point.unconvertedTransactionCount, 3);
});

test('spending excludes transfers and balance adjustments while retaining their explicit fees', () => {
  const data = ledger([
    row('transfer', 'transfer', -1_000_000, { toAccountId: 'cash', receivedAmount: 1_000_000 }),
    row('fee', 'expense', -5_000, { systemTitle: 'transfer_fee' }),
    row('reconciliation', 'adjustment', 50_000),
    row('setup', 'adjustment', 1_000_000, { systemTitle: 'setup' }),
    row('card-purchase', 'expense', -200_000, { accountId: 'card' }),
  ]);
  const point = deriveDailyFlowWindow(data, today)[15];
  assert.equal(point.expense, 205_000);
  assert.equal(point.income, 0);
  assert.equal(point.adjustments, 0);
  assert.equal(point.transactionCount, 2);
});

test('liquid mode counts cash-card movements, gross cash refunds and separate adjustments', () => {
  const data = ledger([
    row('salary', 'income', 1_500_000),
    row('purchase', 'expense', -700_000),
    row('refund', 'refund', 100_000),
    row('internal-transfer', 'transfer', -200_000, { toAccountId: 'cash', receivedAmount: 200_000 }),
    row('card-payment', 'transfer', -300_000, { toAccountId: 'card', receivedAmount: 300_000 }),
    row('card-advance', 'transfer', -50_000, { accountId: 'card', toAccountId: 'cash', receivedAmount: 40_000, receivedReportingAmount: 40_000 }),
    row('card-purchase', 'expense', -80_000, { accountId: 'card' }),
    row('fee', 'expense', -5_000, { systemTitle: 'transfer_fee' }),
    row('reconcile', 'adjustment', 20_000),
    row('setup', 'adjustment', 1_000_000, { systemTitle: 'setup' }),
    row('card-reconcile', 'adjustment', 90_000, { accountId: 'card' }),
  ]);
  const point = deriveDailyFlowWindow(data, today, 'liquid')[15];
  assert.equal(point.income, 1_640_000);
  assert.equal(point.expense, 1_005_000);
  assert.equal(point.adjustments, 20_000);
  assert.equal(point.refunds, 0);
  assert.equal(point.transactionCount, 7);
});

test('liquid mode discloses missing movement values on the correct side of transfers', () => {
  const data = ledger([
    row('card-advance', 'transfer', -500, { accountId: 'card', toAccountId: 'bank', receivedAmount: 12_000, receivedReportingAmount: undefined }),
    row('card-payment', 'transfer', -500, { toAccountId: 'card', receivedAmount: 500, reportingAmount: undefined }),
    row('unknown-internal', 'transfer', -500, { toAccountId: 'cash', receivedAmount: 500, reportingAmount: undefined }),
    row('unknown-card-purchase', 'expense', -500, { accountId: 'card', reportingAmount: undefined }),
  ]);
  const point = deriveDailyFlowWindow(data, today, 'liquid')[15];
  assert.equal(point.income + point.expense, 0);
  assert.equal(point.transactionCount, 2);
  assert.equal(point.unconvertedTransactionCount, 2);
});

test('stored future entries stay on their calendar date and out-of-window records stay excluded', () => {
  const data = ledger([
    row('tomorrow', 'income', 99_000, { date: '2026-09-09' }),
    row('last-slot', 'expense', -25_000, { date: '2026-09-23' }),
    row('too-late', 'income', 1_000_000, { date: '2026-09-24' }),
    row('too-early', 'expense', -1_000_000, { date: '2026-08-23' }),
  ]);
  const points = deriveDailyFlowWindow(data, today);
  assert.equal(points[15].transactionCount, 0);
  assert.equal(points[16].date, '2026-09-09');
  assert.equal(points[16].income, 99_000);
  assert.equal(points[16].isFuture, true);
  assert.equal(points[30].expense, 25_000);
  assert.equal(points.reduce((count, point) => count + point.transactionCount, 0), 2);
});

test('upcoming subscriptions do not fabricate transactions or projected expense bars', () => {
  const data = ledger();
  data.subscriptions = [{
    id: 'scheduled-service', name: 'Service', plan: 'Monthly', amount: 199_000,
    currency: 'VND', cycle: 'month', nextRenewal: '2026-09-09', renewalAnchorDay: 9,
    status: 'active', monogram: 'S', tone: 'green', accountId: 'bank',
  }];
  for (const mode of ['spending', 'liquid'] as const) {
    const points = deriveDailyFlowWindow(data, today, mode);
    assert.equal(points[16].isFuture, true);
    assert.equal(points[16].transactionCount, 0);
    assert.equal(points[16].expense, 0);
  }
});
