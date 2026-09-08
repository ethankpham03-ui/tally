import assert from 'node:assert/strict';
import test from 'node:test';
import { groupTransactionsByDay } from '../app/ledger-groups.ts';
import type { Transaction } from '../app/finance-v4.ts';

function row(id: string, date: string, kind: Transaction['kind'], amount: number, reportingAmount: number | undefined = amount): Transaction {
  return { id, date, kind, amount, reportingAmount, accountId: 'bank', title: id, category: kind === 'income' ? 'income' : 'other' };
}

test('daily ledger groups full dates newest first without changing input order or merging years', () => {
  const transactions = [
    row('last-year', '2025-09-08', 'expense', -20_000),
    row('today-a', '2026-09-08', 'expense', -20_000),
    row('yesterday', '2026-09-07', 'expense', -77_000),
    row('today-b', '2026-09-08', 'expense', -68_897),
  ];
  const originalOrder = transactions.map((transaction) => transaction.id);
  const groups = groupTransactionsByDay(transactions);
  assert.deepEqual(groups.map((day) => day.date), ['2026-09-08', '2026-09-07', '2025-09-08']);
  assert.deepEqual(groups[0].transactions.map((transaction) => transaction.id), ['today-a', 'today-b']);
  assert.equal(groups[0].expense, 88_897);
  assert.deepEqual(transactions.map((transaction) => transaction.id), originalOrder);
});

test('daily totals use recorded VND values, subtract refunds and exclude transfers and adjustments', () => {
  const date = '2026-09-08';
  const transactions = [
    row('salary', date, 'income', 1_000_000),
    row('food', date, 'expense', -100_000),
    row('refund', date, 'refund', 25_000),
    row('foreign-purchase', date, 'expense', -500, -125_000),
    row('transfer', date, 'transfer', -4_000_000),
    row('adjustment', date, 'adjustment', 10_000),
  ];
  const [day] = groupTransactionsByDay(transactions);
  assert.equal(day.income, 1_000_000);
  assert.equal(day.expense, 200_000);
  assert.equal(day.transactions.length, 6);
  assert.equal(day.excludedTransactionCount, 2);
  assert.equal(day.refundCount, 1);
  assert.equal(day.unconvertedTransactionCount, 0);
});

test('unconverted reportable rows are disclosed while missing transfer conversion is excluded', () => {
  const date = '2026-09-08';
  const unknownExpense = { ...row('foreign-expense', date, 'expense', -500), reportingAmount: undefined };
  const unknownIncome = { ...row('foreign-income', date, 'income', 500), reportingAmount: undefined };
  const transfer = { ...row('transfer', date, 'transfer', -500), reportingAmount: undefined };
  const [day] = groupTransactionsByDay([unknownExpense, unknownIncome, transfer]);
  assert.equal(day.income, 0);
  assert.equal(day.expense, 0);
  assert.equal(day.unconvertedTransactionCount, 2);
  assert.equal(day.excludedTransactionCount, 1);
});

test('filtered totals describe visible rows and a refund-only day keeps negative net spending', () => {
  const date = '2026-09-08';
  const transactions = [row('food', date, 'expense', -100_000), row('refund', date, 'refund', 25_000)];
  const [day] = groupTransactionsByDay(transactions.filter((transaction) => transaction.kind === 'refund'));
  assert.equal(day.transactions.length, 1);
  assert.equal(day.income, 0);
  assert.equal(day.expense, -25_000);
  assert.deepEqual(groupTransactionsByDay([]), []);
});
