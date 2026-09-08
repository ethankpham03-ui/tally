import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmptyData as createLegacyData } from '../app/finance-domain.ts';
import {
  addDaysDateOnly, createEmptyData, deriveAccountBalances, deriveAccountReport,
  deriveBudgetUsage, deriveCashflowSeries, deriveFinanceSummary, deriveLiquiditySeries,
  localTodayIso, parseFinanceData, reconcileAccount, recordSubscriptionPayment,
  saveAccount, saveLedgerTransaction, saveTransfer, serializeFinanceData, setupAccounts, validateFinanceData,
  type FinanceData, type TransactionInput,
} from '../app/finance-v4.ts';
import { deriveDailyFlowWindow } from '../app/daily-cashflow.ts';

const today = localTodayIso();
const yesterday = addDaysDateOnly(today, -1);
const tomorrow = addDaysDateOnly(today, 1);
const reference = (date: string) => new Date(`${date}T12:00:00`);
function ledger(): FinanceData {
  return { ...createEmptyData(0, reference(today)), setupComplete: true,
    accounts: [{ id: 'bank', name: 'Bank', kind: 'bank', currency: 'VND', openingBalance: 1_000_000, openingDate: today, archived: false }],
    budgets: [{ id: 'dining-budget', category: 'dining', limit: 2_000_000 }],
  };
}
function entry(kind: 'income' | 'expense' | 'refund', date: string, amount: number, id = kind): TransactionInput {
  return { id, kind, date, amount, accountId: 'bank', title: id, category: kind === 'income' ? 'income' : 'dining' };
}
function balance(data: FinanceData, date = today) {
  return deriveAccountBalances(data, reference(date))[0].balance;
}

test('a missed yesterday expense preserves the source baseline and affects balances exactly once', () => {
  const original = ledger();
  const data = saveLedgerTransaction(original, entry('expense', yesterday, -100_000));
  assert.equal(original.accounts[0].openingDate, today);
  assert.equal(original.transactions.length, 0);
  assert.equal(data.accounts[0].openingDate, today);
  assert.equal(data.accounts[0].openingBalance, 1_000_000);
  assert.equal(data.transactions.length, 1);
  assert.equal(balance(data, yesterday), -100_000);
  assert.equal(balance(data, today), 900_000);
  assert.equal(deriveFinanceSummary(data, reference(yesterday)).expenseThisMonth, 100_000);
  const report = deriveAccountReport(data, 'bank', undefined, today);
  assert.equal(report.openingBalance, 0);
  assert.equal(report.openingInPeriod, 1_000_000);
  assert.equal(report.expense, 100_000);
  assert.equal(report.adjustments, 0);
  assert.equal(report.closingBalance, report.openingBalance + report.openingInPeriod + report.income - report.expense);
  assert.equal(validateFinanceData(data).valid, true);
});

test('income, expense and refund can each be saved ahead, edited into the past and moved ahead again', () => {
  for (const [kind, amount] of [['income', 200_000], ['expense', -80_000], ['refund', 30_000]] as const) {
    let data = saveLedgerTransaction(ledger(), entry(kind, tomorrow, amount));
    const id = data.transactions[0].id;
    assert.equal(data.accounts[0].openingDate, today);
    assert.equal(balance(data), 1_000_000);
    assert.equal(balance(data, tomorrow), 1_000_000 + amount);
    data = saveLedgerTransaction(data, { ...data.transactions[0], date: yesterday }, id);
    assert.equal(data.transactions.length, 1);
    assert.equal(data.accounts[0].openingDate, today);
    assert.equal(data.accounts[0].openingBalance, 1_000_000);
    assert.equal(balance(data, yesterday), amount);
    assert.equal(balance(data), 1_000_000 + amount);
    data = saveLedgerTransaction(data, { ...data.transactions[0], date: tomorrow }, id);
    assert.equal(data.transactions.length, 1);
    assert.equal(data.transactions[0].id, id);
    assert.equal(balance(data), 1_000_000);
    assert.equal(balance(data, tomorrow), 1_000_000 + amount);
  }
});

test('future entries are stored now but current balances, budgets and posted reports exclude them', () => {
  let data = saveLedgerTransaction(ledger(), entry('income', tomorrow, 1_500_000));
  data = saveLedgerTransaction(data, entry('expense', tomorrow, -700_000));
  data = saveLedgerTransaction(data, { ...entry('refund', tomorrow, 100_000), refundOfId: 'expense' });
  const current = deriveFinanceSummary(data, reference(today));
  assert.equal(current.cashBalance, 1_000_000);
  assert.equal(current.incomeThisMonth, 0);
  assert.equal(current.expenseThisMonth, 0);
  assert.equal(deriveBudgetUsage(data, reference(today))[0].spent, 0);
  for (const point of deriveCashflowSeries(data.transactions, '7d', reference(today))) assert.equal(point.transactionCount, 0);
  for (const point of deriveLiquiditySeries(data, '7d', reference(today))) assert.equal(point.transactionCount, 0);

  const nextDay = deriveFinanceSummary(data, reference(tomorrow));
  assert.equal(nextDay.cashBalance, 1_900_000);
  assert.equal(nextDay.incomeThisMonth, 1_500_000);
  assert.equal(nextDay.expenseThisMonth, 600_000);
  assert.equal(deriveBudgetUsage(data, reference(tomorrow))[0].spent, 600_000);
  const cashflow = deriveCashflowSeries(data.transactions, '7d', reference(tomorrow)).at(-1)!;
  assert.equal(cashflow.income, 1_500_000);
  assert.equal(cashflow.expense, 600_000);
  const planned = deriveDailyFlowWindow(data, today)[16];
  assert.equal(planned.isFuture, true);
  assert.equal(planned.income, 1_500_000);
  assert.equal(planned.expense, 700_000);
  assert.equal(planned.refunds, 100_000);
  assert.equal(planned.transactionCount, 3);
  assert.equal(data.transactions.length, 3);
});

test('editing further into history preserves the opening amount and the report balance identity', () => {
  const earlier = addDaysDateOnly(today, -3);
  let data = saveLedgerTransaction(ledger(), entry('expense', today, -100_000));
  data = saveLedgerTransaction(data, entry('income', yesterday, 200_000));
  data = saveLedgerTransaction(data, { ...data.transactions.find((row) => row.id === 'expense')!, date: earlier }, 'expense');
  assert.equal(data.accounts[0].openingDate, today);
  assert.equal(data.accounts[0].openingBalance, 1_000_000);
  assert.equal(data.transactions.length, 2);
  assert.equal(balance(data, earlier), -100_000);
  assert.equal(balance(data, yesterday), 100_000);
  assert.equal(balance(data), 1_100_000);
  for (const start of [earlier, yesterday, today]) {
    const report = deriveAccountReport(data, 'bank', start, today);
    assert.equal(report.closingBalance, report.openingBalance + report.openingInPeriod + report.income - report.expense + report.transferIn - report.transferOut + report.adjustments);
  }
});

test('past and future dates survive storage roundtrip without another transaction or balance movement', () => {
  let data = saveLedgerTransaction(ledger(), entry('expense', yesterday, -50_000));
  data = saveLedgerTransaction(data, entry('income', tomorrow, 80_000));
  const parsed = parseFinanceData(serializeFinanceData(data));
  assert.equal(parsed.status, 'ok');
  if (parsed.status !== 'ok') return;
  assert.deepEqual(parsed.data.transactions, data.transactions);
  assert.equal(parsed.data.accounts[0].openingDate, today);
  assert.equal(parsed.data.accounts[0].openingBalance, 1_000_000);
  assert.equal(balance(parsed.data), 950_000);
  assert.equal(balance(parsed.data, tomorrow), 1_030_000);
  assert.equal(parsed.data.transactions.length, 2);
});

test('backdating after migrated source setup never duplicates its historical opening balance', () => {
  const parsed = parseFinanceData(JSON.stringify(createLegacyData(10_000_000, reference(today))));
  assert.equal(parsed.status, 'ok');
  if (parsed.status !== 'ok') return;
  const original = setupAccounts(parsed.data, [
    { id: 'bank', name: 'Bank', kind: 'bank', currency: 'VND', openingBalance: 10_000_000, openingDate: today },
    { id: 'cash', name: 'Cash', kind: 'cash', currency: 'VND', openingBalance: 0, openingDate: today },
  ], today);
  const data = saveLedgerTransaction(original, entry('expense', yesterday, -100_000));
  assert.deepEqual(data.accounts, original.accounts);
  assert.deepEqual(data.transactions.filter((transaction) => transaction.id !== 'expense'), original.transactions);
  const past = deriveFinanceSummary(data, reference(yesterday));
  assert.equal(past.netWorth, 9_900_000);
  assert.equal(past.expenseThisMonth, 100_000);
  assert.equal(deriveFinanceSummary(data, reference(today)).netWorth, 9_900_000);
  const historicBalances = deriveAccountBalances(data, reference(yesterday));
  assert.equal(historicBalances.find((row) => row.account.kind === 'legacy')?.balance, 10_000_000);
  assert.equal(historicBalances.find((row) => row.account.id === 'bank')?.balance, -100_000);
  for (const start of [undefined, yesterday, today]) {
    const report = deriveAccountReport(data, 'bank', start, today);
    assert.equal(report.closingBalance, 9_900_000);
    assert.equal(report.closingBalance, report.openingBalance + report.openingInPeriod + report.income - report.expense + report.transferIn - report.transferOut + report.adjustments);
  }
  const entireHistory = deriveAccountReport(data, 'bank', undefined, today);
  assert.equal(entireHistory.transactions.length, 1);
  assert.equal(entireHistory.openingBalance, 0);
  assert.equal(entireHistory.openingInPeriod, 10_000_000);

  const edited = saveLedgerTransaction(data, { ...data.transactions.find((transaction) => transaction.id === 'expense')!, amount: -80_000 }, 'expense');
  assert.equal(deriveFinanceSummary(edited, reference(yesterday)).netWorth, 9_920_000);
  assert.equal(deriveFinanceSummary(edited, reference(today)).netWorth, 9_920_000);
  assert.deepEqual(edited.accounts, original.accounts);
  const roundtrip = parseFinanceData(serializeFinanceData(edited));
  assert.equal(roundtrip.status, 'ok');
  if (roundtrip.status === 'ok') assert.equal(deriveFinanceSummary(roundtrip.data, reference(yesterday)).netWorth, 9_920_000);
});

test('invalid dates and a refund earlier than its linked purchase remain invalid', () => {
  const data = saveLedgerTransaction(ledger(), entry('expense', today, -100_000));
  for (const invalid of ['', '2026-02-30', 'not-a-date']) assert.throws(() => saveLedgerTransaction(data, entry('income', invalid, 100)));
  assert.throws(() => saveLedgerTransaction(data, { ...entry('refund', yesterday, 20_000), refundOfId: 'expense' }), /refund/);
  assert.equal(data.accounts[0].openingDate, today);
});

test('transfer, source setup and reconciliation retain their existing posted-date restrictions', () => {
  const data = ledger();
  data.accounts.push({ id: 'cash', name: 'Cash', kind: 'cash', currency: 'VND', openingBalance: 0, openingDate: today, archived: false });
  for (const date of [yesterday, tomorrow]) {
    assert.throws(() => saveTransfer(data, { accountId: 'bank', toAccountId: 'cash', amount: 100, receivedAmount: 100, date }));
    assert.throws(() => reconcileAccount(data, 'bank', 900_000, date, 'Review'));
  }
  assert.throws(() => saveAccount(data, { ...data.accounts[0], openingDate: tomorrow }, 'bank'));
  assert.throws(() => saveLedgerTransaction(data, { kind: 'adjustment', title: 'Adjustment', accountId: 'bank', amount: 100, date: tomorrow, category: 'other' }));
});

test('recording and editing linked subscription payments retains posted-date restrictions', () => {
  const data = ledger();
  data.subscriptions = [{ id: 'service', name: 'Service', plan: 'Monthly', amount: 100_000, currency: 'VND', cycle: 'month', nextRenewal: today, renewalAnchorDay: Number(today.slice(-2)), status: 'active', monogram: 'S', tone: 'blue', accountId: 'bank' }];
  assert.equal(recordSubscriptionPayment(data, 'service', tomorrow).status, 'invalid-date');
  assert.equal(recordSubscriptionPayment(data, 'service', yesterday).status, 'invalid-date');
  const recorded = recordSubscriptionPayment(data, 'service', today);
  assert.equal(recorded.status, 'recorded');
  if (recorded.status !== 'recorded') return;
  for (const date of [yesterday, tomorrow]) assert.throws(() => saveLedgerTransaction(recorded.data, { ...recorded.transaction, date }, recorded.transaction.id));
  assert.equal(recorded.data.accounts[0].openingDate, today);
});
