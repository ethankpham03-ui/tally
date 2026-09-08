import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmptyData as createLegacyData } from '../app/finance-domain.ts';
import {
  archiveAccount,
  createEmptyData,
  deleteAccount,
  deleteLedgerTransaction,
  deriveAccountBalances,
  deriveAccountReport,
  deriveBudgetUsage,
  deriveCashflowSeries,
  deriveFinanceSummary,
  deriveLiquiditySeries,
  deriveStatementStatus,
  parseFinanceData,
  recordSubscriptionPayment,
  reconcileAccount,
  saveAccount,
  saveLedgerTransaction,
  saveStatement,
  saveTransfer,
  serializeFinanceData,
  setExchangeRate,
  setupAccounts,
  unarchiveAccount,
  validateFinanceData,
  type Account,
  type FinanceData,
} from '../app/finance-v4.ts';
import { CURRENCIES, convertToVnd, formatMoneyAmount, parseMoneyInput, sumMoney } from '../app/money.ts';

const reference = new Date('2026-09-06T12:00:00+07:00');
const today = '2026-09-06';

function account(id: string, kind: Account['kind'] = 'bank', currency: Account['currency'] = 'VND', openingBalance = 0): Account {
  return { id, name: id, kind, currency, openingBalance, openingDate: '2026-09-01', archived: false };
}

function ledger(accounts: Account[]): FinanceData {
  return { ...createEmptyData(0, reference), accounts, setupComplete: true, revision: 0 };
}

function balances(data: FinanceData): Record<string, number> {
  return Object.fromEntries(deriveAccountBalances(data, reference).map((row) => [row.account.id, row.balance]));
}

function legacyLedger(version: 1 | 2 | 3) {
  const data = createLegacyData(5_000_000, reference);
  data.transactions = [
    { id: 'old', title: 'Prior expense', category: 'other', date: '2026-08-30', amount: -100_000 },
    { id: 'salary', title: 'Salary', category: 'income', date: '2026-09-02', amount: 3_000_000 },
    { id: 'food', title: 'Food', category: 'dining', date: '2026-09-03', amount: -900_000 },
  ];
  const raw: Record<string, unknown> = { ...data, version };
  if (version === 1) delete raw.customCategories;
  return JSON.stringify(raw);
}

test('v1, v2, and v3 migrations preserve balances and spending without inventing historical payment accounts', () => {
  for (const version of [1, 2, 3] as const) {
    const parsed = parseFinanceData(legacyLedger(version));
    assert.equal(parsed.status, 'ok');
    if (parsed.status !== 'ok') continue;
    assert.equal(parsed.migrated, true);
    assert.equal(parsed.data.version, 4);
    assert.equal(parsed.data.revision, 0);
    assert.equal(parsed.data.accounts.length, 1);
    assert.equal(parsed.data.accounts[0].kind, 'legacy');
    assert.ok(parsed.data.transactions.every((tx) => tx.accountId === parsed.data.accounts[0].id));
    const summary = deriveFinanceSummary(parsed.data, reference);
    assert.equal(summary.netWorth, 7_000_000);
    assert.equal(summary.incomeThisMonth, 3_000_000);
    assert.equal(summary.expenseThisMonth, 900_000);
    assert.equal(parsed.data.openingBalance, 0);
    const roundtrip = parseFinanceData(serializeFinanceData(parsed.data));
    assert.equal(roundtrip.status, 'ok');
    if (roundtrip.status === 'ok') assert.deepEqual(roundtrip.data, parsed.data);
  }
});

test('splitting a historical 7m balance into bank 10m and card debt 3m does not subtract debt twice', () => {
  const parsed = parseFinanceData(legacyLedger(3));
  if (parsed.status !== 'ok') return assert.fail('Expected migrated legacy ledger');
  const data = setupAccounts(parsed.data, [
    account('bank', 'bank', 'VND', 10_000_000),
    { ...account('card', 'credit_card', 'VND', -3_000_000), creditLimit: 50_000_000 },
  ], today);
  const summary = deriveFinanceSummary(data, reference);
  assert.equal(summary.cashBalance, 10_000_000);
  assert.equal(summary.cardDebt, 3_000_000);
  assert.equal(summary.netWorth, 7_000_000);
  assert.equal(summary.expenseThisMonth, 900_000);
  assert.equal(summary.incomeThisMonth, 3_000_000);
  const legacyAccount = data.accounts.find((item) => item.kind === 'legacy');
  assert.ok(legacyAccount);
  if (legacyAccount) assert.equal(balances(data)[legacyAccount.id], 0);
  assert.equal(data.transactions.filter((tx) => tx.kind === 'expense').length, 2);
});

test('internal transfer and its fee edit and delete together without inflating income or expense', () => {
  const initial = ledger([account('bank', 'bank', 'VND', 10_000_000), account('cash', 'cash')]);
  const sent = saveTransfer(initial, { accountId: 'bank', toAccountId: 'cash', amount: 2_000_000, receivedAmount: 2_000_000, fee: 5_000, date: today });
  assert.deepEqual(balances(sent), { bank: 7_995_000, cash: 2_000_000 });
  const summary = deriveFinanceSummary(sent, reference);
  assert.equal(summary.incomeThisMonth, 0);
  assert.equal(summary.expenseThisMonth, 5_000);
  assert.equal(summary.netWorth, 9_995_000);
  const transfer = sent.transactions.find((tx) => tx.kind === 'transfer');
  assert.ok(transfer);
  if (!transfer) return;
  const edited = saveTransfer(sent, { accountId: 'bank', toAccountId: 'cash', amount: 3_000_000, receivedAmount: 3_000_000, fee: 10_000, date: today }, transfer.id);
  assert.deepEqual(balances(edited), { bank: 6_990_000, cash: 3_000_000 });
  assert.equal(deriveFinanceSummary(edited, reference).expenseThisMonth, 10_000);
  const deleted = deleteLedgerTransaction(edited, transfer.id);
  assert.deepEqual(balances(deleted), balances(initial));
  assert.equal(deleted.transactions.length, 0);
});

test('a source-specific cash report explains movements while global spending excludes transfers', () => {
  let data = ledger([account('bank', 'bank', 'VND', 1_000_000), account('cash', 'cash')]);
  data = saveTransfer(data, { accountId: 'bank', toAccountId: 'cash', amount: 500_000, receivedAmount: 500_000, date: today });
  data = saveLedgerTransaction(data, { kind: 'expense', accountId: 'cash', amount: -80_000, title: 'Lunch', category: 'dining', date: today });
  const report = deriveAccountReport(data, 'cash', '2026-09-01', today);
  assert.equal(report.transferIn, 500_000);
  assert.equal(report.expense, 80_000);
  assert.equal(report.closingBalance, 420_000);
  assert.equal(report.openingBalance + report.income - report.expense + report.transferIn - report.transferOut + report.adjustments, report.closingBalance);
  assert.equal(deriveFinanceSummary(data, reference).incomeThisMonth, 0);
  assert.equal(deriveFinanceSummary(data, reference).expenseThisMonth, 80_000);
});

test('card purchases count once; repayment is a transfer; refund reduces the original spending category', () => {
  let data = ledger([account('bank', 'bank', 'VND', 10_000_000), { ...account('card', 'credit_card'), creditLimit: 50_000_000 }]);
  data.budgets = [{ id: 'food-budget', category: 'dining', limit: 2_000_000 }];
  data = saveLedgerTransaction(data, { kind: 'expense', accountId: 'card', amount: -1_000_000, title: 'Dinner', category: 'dining', date: '2026-09-02' });
  const purchase = data.transactions.find((tx) => tx.kind === 'expense')!;
  const purchased = deriveFinanceSummary(data, reference);
  assert.equal(purchased.cashBalance, 10_000_000);
  assert.equal(purchased.cardDebt, 1_000_000);
  assert.equal(purchased.netWorth, 9_000_000);
  data = saveTransfer(data, { accountId: 'bank', toAccountId: 'card', amount: 1_000_000, receivedAmount: 1_000_000, date: '2026-09-03' });
  assert.equal(deriveFinanceSummary(data, reference).expenseThisMonth, 1_000_000);
  data = saveLedgerTransaction(data, { kind: 'refund', accountId: 'card', amount: 200_000, title: 'Dinner refund', category: 'dining', refundOfId: purchase.id, date: '2026-09-04' });
  const refunded = deriveFinanceSummary(data, reference);
  assert.equal(refunded.incomeThisMonth, 0);
  assert.equal(refunded.expenseThisMonth, 800_000);
  assert.equal(refunded.cashBalance, 9_000_000);
  assert.equal(refunded.cardDebt, 0);
  assert.equal(refunded.cardCredit, 200_000);
  assert.equal(refunded.netWorth, 9_200_000);
  assert.equal(deriveBudgetUsage(data, reference)[0].spent, 800_000);
});

test('card interest and fees are expenses while changing its credit limit creates no income', () => {
  let data = ledger([{ ...account('card', 'credit_card', 'VND', -3_000_000), creditLimit: 50_000_000 }]);
  data = saveLedgerTransaction(data, { kind: 'expense', accountId: 'card', amount: -30_000, title: 'Interest', category: 'interest', date: today });
  data = saveAccount(data, { ...data.accounts[0], creditLimit: 100_000_000 }, 'card');
  const summary = deriveFinanceSummary(data, reference);
  assert.equal(summary.expenseThisMonth, 30_000);
  assert.equal(summary.incomeThisMonth, 0);
  assert.equal(summary.cardDebt, 3_030_000);
  assert.equal(summary.netWorth, -3_030_000);
});

test('all supported currencies parse exact minor units and arithmetic refuses precision loss', () => {
  assert.equal(CURRENCIES.length, 10);
  for (const currency of CURRENCIES) {
    const decimal = ['VND', 'JPY', 'KRW'].includes(currency) ? '123' : '123.45';
    const amount = parseMoneyInput(decimal, currency);
    assert.notEqual(amount, null, currency);
    if (amount !== null) assert.equal(formatMoneyAmount(amount, currency), decimal);
  }
  assert.equal(parseMoneyInput('0.10', 'USD'), 10);
  assert.equal(parseMoneyInput('12.34', 'USD'), 1234);
  assert.equal(parseMoneyInput('1.5', 'VND'), null);
  assert.equal(parseMoneyInput('0.001', 'USD'), null);
  assert.equal(parseMoneyInput('9,999', 'USD'), null);
  assert.equal(parseMoneyInput('9007199254740992', 'VND'), null);
  assert.equal(convertToVnd(1999, 'USD', '25000'), 499_750);
  assert.throws(() => sumMoney([Number.MAX_SAFE_INTEGER, 1]), RangeError);
  assert.throws(() => convertToVnd(Number.MAX_SAFE_INTEGER, 'USD', '999999'), RangeError);
});

test('a foreign transfer preserves two different native amounts; only its explicit fee is spending', () => {
  let data = ledger([account('usd', 'bank', 'USD', 20_000), account('vnd', 'bank')]);
  data = setExchangeRate(data, { currency: 'USD', rate: '25000', date: '2026-09-01', source: 'manual' });
  data = saveTransfer(data, { accountId: 'usd', toAccountId: 'vnd', amount: 10_000, receivedAmount: 2_500_000, fee: 100, date: today });
  assert.deepEqual(balances(data), { usd: 9900, vnd: 2_500_000 });
  const summary = deriveFinanceSummary(data, reference);
  assert.equal(summary.incomeThisMonth, 0);
  assert.equal(summary.expenseThisMonth, 25_000);
  assert.equal(summary.netWorth, 4_975_000);
  assert.throws(() => saveTransfer(data, { accountId: 'usd', toAccountId: 'usd', amount: 100, receivedAmount: 100, date: today }));
});

test('later FX quotes revalue current balances without changing historical transaction snapshots', () => {
  let data = ledger([account('usd', 'bank', 'USD', 20_000)]);
  data = setExchangeRate(data, { currency: 'USD', rate: '25000', date: '2026-09-01', source: 'manual' });
  data = saveLedgerTransaction(data, { kind: 'expense', accountId: 'usd', amount: -1234, title: 'A purchase', category: 'shopping', date: '2026-09-02' });
  const original = structuredClone(data.transactions[0]);
  assert.equal(original.reportingAmount, -308_500);
  data = setExchangeRate(data, { currency: 'USD', rate: '26000', date: today, source: 'manual' });
  assert.deepEqual(data.transactions[0], original);
  assert.equal(deriveFinanceSummary(data, reference).expenseThisMonth, 308_500);
  assert.equal(deriveFinanceSummary(data, reference).netWorth, 4_879_160);
  data = setExchangeRate(data, { currency: 'USD', rate: '27000', date: '2026-09-01', source: 'corrected' });
  assert.deepEqual(data.transactions[0], original);
  assert.equal(deriveFinanceSummary(data, reference).expenseThisMonth, 308_500);
});

test('a missing exchange rate is disclosed instead of adding foreign units as VND or repricing history later', () => {
  let data = ledger([account('usd', 'bank', 'USD', 10_000), account('vnd', 'bank', 'VND', 1_000_000)]);
  data = saveLedgerTransaction(data, { kind: 'expense', accountId: 'usd', amount: -1000, title: 'USD purchase', category: 'shopping', date: today });
  const before = deriveFinanceSummary(data, reference);
  assert.deepEqual(before.missingCurrencies, ['USD']);
  assert.equal(before.unconvertedTransactionCount, 1);
  assert.equal(before.cashBalance, 1_000_000);
  assert.equal(data.transactions[0].reportingAmount, undefined);
  data = setExchangeRate(data, { currency: 'USD', rate: '25000', date: today, source: 'manual' });
  assert.equal(data.transactions[0].reportingAmount, undefined);
  assert.equal(deriveFinanceSummary(data, reference).unconvertedTransactionCount, 1);
  assert.equal(deriveFinanceSummary(data, reference).cashBalance, 3_250_000);
});

test('subscription confirmation records actual card debit plus original currency once per occurrence', () => {
  let data = ledger([account('card', 'credit_card')]);
  data.subscriptions = [{ id: 'service', name: 'Example Service', plan: 'Monthly', amount: 20, currency: 'USD', cycle: 'month', nextRenewal: today, renewalAnchorDay: 6, status: 'active', monogram: 'E', tone: 'blue', accountId: 'card' }];
  const result = recordSubscriptionPayment(data, 'service', today, { expectedOccurrence: today, accountId: 'card', amount: 530_000 });
  assert.equal(result.status, 'recorded');
  if (result.status !== 'recorded') return;
  data = result.data;
  assert.equal(result.transaction.amount, -530_000);
  assert.equal(result.transaction.originalCurrency, 'USD');
  assert.equal(result.transaction.originalAmount, 2000);
  assert.equal(result.transaction.reportingAmount, -530_000);
  assert.equal(data.subscriptions[0].nextRenewal, '2026-10-06');
  const duplicate = recordSubscriptionPayment(data, 'service', today, { expectedOccurrence: today, accountId: 'card', amount: 530_000 });
  assert.equal(duplicate.status, 'already-recorded');
  assert.equal(duplicate.data.transactions.length, 1);
  assert.equal(deriveFinanceSummary(duplicate.data, reference).cardDebt, 530_000);
});

test('future-dated entries do not change current balances, budgets, or reports', () => {
  let data = ledger([account('bank', 'bank', 'VND', 1_000_000)]);
  data.budgets = [{ id: 'shopping', category: 'shopping', limit: 1_000_000 }];
  const future = { id: 'future', kind: 'expense' as const, accountId: 'bank', amount: -500_000, reportingAmount: -500_000, title: 'Future purchase', category: 'shopping' as const, date: '2026-09-20' };
  // Plans are saved immediately but do not affect reports before their own date.
  data = saveLedgerTransaction(data, future);
  assert.equal(data.transactions.length, 1);
  assert.equal(parseFinanceData(JSON.stringify(data)).status, 'ok');
  assert.equal(balances(data).bank, 1_000_000);
  assert.equal(deriveFinanceSummary(data, reference).expenseThisMonth, 0);
  assert.equal(deriveBudgetUsage(data, reference)[0].spent, 0);
  assert.equal(deriveCashflowSeries(data.transactions, '30d', reference).reduce((sum, row) => sum + row.expense, 0), 0);
});

test('account currency cannot be relabeled after transactions and missing references make import invalid', () => {
  let data = ledger([account('bank', 'bank', 'VND', 1_000_000)]);
  data = saveLedgerTransaction(data, { kind: 'expense', accountId: 'bank', amount: -500_000, title: 'Purchase', category: 'shopping', date: today });
  assert.throws(() => saveAccount(data, { ...data.accounts[0], currency: 'USD' }, 'bank'));
  const broken = { ...data, transactions: data.transactions.map((tx) => ({ ...tx, accountId: 'does-not-exist' })) };
  assert.equal(validateFinanceData(broken).valid, false);
  assert.equal(parseFinanceData(JSON.stringify(broken)).status, 'corrupt');
});

test('validation rejects aggregate integer overflow even when each account balance is individually valid', () => {
  const data = ledger([account('first', 'bank', 'VND', Number.MAX_SAFE_INTEGER), account('second', 'bank', 'VND', 1)]);
  assert.equal(validateFinanceData(data).valid, false);
  assert.equal(parseFinanceData(JSON.stringify(data)).status, 'corrupt');
});

test('statement balances stay distinct from current debt and track only payments explicitly allocated to that statement', () => {
  let data = ledger([account('bank', 'bank', 'VND', 10_000_000), account('card', 'credit_card', 'VND', -3_000_000)]);
  data = saveStatement(data, { id: 'statement', accountId: 'card', closingDate: '2026-09-02', dueDate: '2026-09-05', amount: 2_000_000, minimumPayment: 200_000 });
  data = saveTransfer(data, { accountId: 'bank', toAccountId: 'card', amount: 500_000, receivedAmount: 500_000, date: '2026-09-03', statementId: 'statement' });
  const allocated = data.transactions.find((tx) => tx.statementId === 'statement')!;
  data = saveTransfer(data, { accountId: 'bank', toAccountId: 'card', amount: 300_000, receivedAmount: 300_000, date: '2026-09-04' });
  const status = deriveStatementStatus(data, 'statement', reference);
  assert.equal(status.paid, 500_000);
  assert.equal(status.remaining, 1_500_000);
  assert.equal(status.minimumRemaining, 0);
  assert.equal(status.isOverdue, true);
  assert.equal(deriveFinanceSummary(data, reference).cardDebt, 2_200_000);
  assert.equal(deriveFinanceSummary(data, reference).expenseThisMonth, 0);
  const undone = deleteLedgerTransaction(data, allocated.id);
  assert.equal(deriveStatementStatus(undone, 'statement', reference).remaining, 2_000_000);
  assert.equal(deriveFinanceSummary(undone, reference).cardDebt, 2_700_000);
});

test('archiving retains historical spending and blocks new transactions; deletion cannot orphan transfers', () => {
  let data = ledger([account('old-cash', 'cash', 'VND', 500_000), account('bank', 'bank', 'VND', 1_000_000)]);
  data = saveLedgerTransaction(data, { kind: 'expense', accountId: 'old-cash', amount: -500_000, title: 'Last purchase', category: 'shopping', date: '2026-09-02' });
  assert.throws(() => deleteAccount(data, 'old-cash'));
  data = archiveAccount(data, 'old-cash');
  assert.equal(data.accounts.find((row) => row.id === 'old-cash')?.archived, true);
  assert.equal(deriveFinanceSummary(data, reference).expenseThisMonth, 500_000);
  assert.equal(deriveAccountReport(data, 'old-cash', '2026-09-01', today).expense, 500_000);
  assert.throws(() => saveLedgerTransaction(data, { kind: 'income', accountId: 'old-cash', amount: 1, title: 'New', category: 'income', date: today }));
  assert.throws(() => archiveAccount(data, 'bank'));
  data = unarchiveAccount(data, 'old-cash');
  data = saveTransfer(data, { accountId: 'bank', toAccountId: 'old-cash', amount: 100_000, receivedAmount: 100_000, date: today });
  assert.throws(() => deleteAccount(data, 'bank'));
  assert.throws(() => deleteAccount(data, 'old-cash'));
});

test('balance reconciliation records an adjustment without rewriting opening history or pretending it is income', () => {
  const initial = ledger([account('cash', 'cash', 'VND', 500_000)]);
  const adjusted = reconcileAccount(initial, 'cash', 450_000, today, 'Counted the notes in my wallet');
  assert.equal(adjusted.accounts[0].openingBalance, 500_000);
  assert.equal(balances(adjusted).cash, 450_000);
  assert.equal(adjusted.transactions[0].kind, 'adjustment');
  assert.equal(adjusted.transactions[0].amount, -50_000);
  assert.equal(deriveFinanceSummary(adjusted, reference).expenseThisMonth, 0);
  const report = deriveAccountReport(adjusted, 'cash', '2026-09-02', today);
  assert.equal(report.openingBalance, 500_000);
  assert.equal(report.adjustments, -50_000);
  assert.equal(report.closingBalance, 450_000);
});

test('subscription account defaults cannot be archived and previous payments retain their actual payment source', () => {
  let data = ledger([account('card', 'credit_card'), account('bank', 'bank', 'VND', 1_000_000)]);
  data.subscriptions = [{ id: 'service', name: 'Example Service', plan: 'Monthly', amount: 20, currency: 'USD', cycle: 'month', nextRenewal: today, renewalAnchorDay: 6, status: 'active', monogram: 'E', tone: 'blue', accountId: 'card' }];
  assert.throws(() => archiveAccount(data, 'card'));
  const paid = recordSubscriptionPayment(data, 'service', today, { expectedOccurrence: today, accountId: 'card', amount: 530_000 });
  if (paid.status !== 'recorded') return assert.fail('Expected payment');
  data = { ...paid.data, subscriptions: paid.data.subscriptions.map((subscription) => ({ ...subscription, accountId: 'bank' })) };
  assert.equal(data.subscriptionPayments[0].accountId, 'card');
  assert.equal(data.transactions[0].accountId, 'card');
  const stale = recordSubscriptionPayment(data, 'service', today, { expectedOccurrence: '2026-08-06', accountId: 'bank', amount: 530_000 });
  assert.equal(stale.status, 'stale-occurrence');
  assert.equal(stale.data.transactions.length, 1);
});

test('description-only edits preserve captured FX and intentionally missing historical conversion', () => {
  for (const hadRate of [true, false]) {
    let data = ledger([account('usd', 'bank', 'USD', 10_000)]);
    if (hadRate) data = setExchangeRate(data, { currency: 'USD', rate: '25000', date: '2026-09-01', source: 'manual' });
    data = saveLedgerTransaction(data, { kind: 'expense', accountId: 'usd', amount: -1234, title: 'Purchase', category: 'shopping', date: '2026-09-02' });
    const saved = structuredClone(data.transactions[0]);
    data = setExchangeRate(data, { currency: 'USD', rate: '27000', date: '2026-09-01', source: 'corrected later' });
    data = saveLedgerTransaction(data, { kind: 'expense', accountId: 'usd', amount: -1234, title: 'Corrected description', category: 'shopping', date: '2026-09-02' }, saved.id);
    assert.equal(data.transactions[0].reportingAmount, saved.reportingAmount);
    assert.deepEqual(data.transactions[0].reportingRate, saved.reportingRate);
  }
});

test('liquidity records card repayment when bank money leaves and excludes the earlier card purchase', () => {
  let data = ledger([account('bank', 'bank', 'VND', 10_000_000), account('cash', 'cash'), account('card', 'credit_card')]);
  data = saveLedgerTransaction(data, { kind: 'expense', accountId: 'card', amount: -1_000_000, title: 'Card purchase', category: 'shopping', date: '2026-09-02' });
  data = saveTransfer(data, { accountId: 'bank', toAccountId: 'cash', amount: 1_000_000, receivedAmount: 1_000_000, date: '2026-09-03' });
  data = saveTransfer(data, { accountId: 'bank', toAccountId: 'card', amount: 600_000, receivedAmount: 600_000, date: '2026-09-04' });
  data = saveLedgerTransaction(data, { kind: 'expense', accountId: 'cash', amount: -100_000, title: 'Cash purchase', category: 'dining', date: '2026-09-05' });
  const liquidity = deriveLiquiditySeries(data, '7d', reference);
  assert.equal(liquidity.reduce((sum, day) => sum + day.expense, 0), 700_000);
  assert.equal(liquidity.reduce((sum, day) => sum + day.income, 0), 0);
  assert.equal(deriveFinanceSummary(data, reference).expenseThisMonth, 1_100_000);
});

test('a foreign statement payment uses the amount received by the card, and liquidity snapshots do not drift', () => {
  let data = ledger([account('usd', 'bank', 'USD', 20_000), account('card', 'credit_card', 'VND', -3_000_000)]);
  data = setExchangeRate(data, { currency: 'USD', rate: '25000', date: '2026-09-01', source: 'manual' });
  data = saveStatement(data, { id: 'statement', accountId: 'card', amount: 3_000_000, closingDate: '2026-09-02', dueDate: '2026-09-10' });
  data = saveTransfer(data, { accountId: 'usd', toAccountId: 'card', amount: 10_000, receivedAmount: 2_500_000, date: '2026-09-03', statementId: 'statement' });
  const history = deriveLiquiditySeries(data, '7d', reference);
  assert.equal(history.reduce((sum, day) => sum + day.expense, 0), 2_500_000);
  assert.equal(deriveStatementStatus(data, 'statement', reference).remaining, 500_000);
  data = setExchangeRate(data, { currency: 'USD', rate: '26000', date: '2026-09-01', source: 'corrected later' });
  assert.deepEqual(deriveLiquiditySeries(data, '7d', reference), history);
  assert.equal(deriveStatementStatus(data, 'statement', reference).remaining, 500_000);
});

test('historical changes after account setup remain visible as a balance difference without changing real account openings', () => {
  const parsed = parseFinanceData(legacyLedger(3));
  if (parsed.status !== 'ok') return assert.fail('Expected migrated legacy ledger');
  let data = setupAccounts(parsed.data, [account('bank', 'bank', 'VND', 10_000_000), account('card', 'credit_card', 'VND', -3_000_000)], today);
  const oldExpense = data.transactions.find((tx) => tx.id === 'food')!;
  data = saveLedgerTransaction(data, { ...oldExpense, amount: -800_000, reportingAmount: -800_000 }, oldExpense.id);
  assert.equal(data.accounts.find((row) => row.id === 'bank')?.openingBalance, 10_000_000);
  assert.equal(data.accounts.find((row) => row.id === 'card')?.openingBalance, -3_000_000);
  assert.equal(balances(data)[oldExpense.accountId], 100_000);
  assert.equal(deriveFinanceSummary(data, reference).netWorth, 7_100_000);
  assert.throws(() => saveLedgerTransaction(data, { ...oldExpense, accountId: 'bank' }, oldExpense.id));
});

test('deleting a paid occurrence rewinds only the most recent renewal and cleans both payment references', () => {
  let data = ledger([{ ...account('bank', 'bank', 'VND', 1_000_000), openingDate: '2026-08-01' }]);
  data.subscriptions = [{ id: 'service', name: 'Example Service', plan: 'Monthly', amount: 100_000, currency: 'VND', cycle: 'month', nextRenewal: '2026-08-06', renewalAnchorDay: 6, status: 'active', monogram: 'E', tone: 'blue', accountId: 'bank' }];
  const first = recordSubscriptionPayment(data, 'service', '2026-08-06', { expectedOccurrence: '2026-08-06', accountId: 'bank', amount: 100_000 });
  if (first.status !== 'recorded') return assert.fail('Expected first payment');
  const second = recordSubscriptionPayment(first.data, 'service', today, { expectedOccurrence: today, accountId: 'bank', amount: 100_000 });
  if (second.status !== 'recorded') return assert.fail('Expected second payment');
  assert.equal(second.data.subscriptions[0].nextRenewal, '2026-10-06');
  data = deleteLedgerTransaction(second.data, first.transaction.id);
  assert.equal(data.subscriptions[0].nextRenewal, '2026-10-06');
  assert.equal(data.subscriptionPayments.length, 1);
  data = deleteLedgerTransaction(data, second.transaction.id);
  assert.equal(data.subscriptions[0].nextRenewal, today);
  assert.equal(data.transactions.length, 0);
  assert.equal(data.subscriptionPayments.length, 0);
  assert.equal(balances(data).bank, 1_000_000);
});

test('deleting a transfer cannot orphan a refund linked to its fee', () => {
  let data = ledger([account('bank', 'bank', 'VND', 1_000_000), account('cash', 'cash')]);
  data = saveTransfer(data, { accountId: 'bank', toAccountId: 'cash', amount: 100_000, receivedAmount: 100_000, fee: 5_000, date: '2026-09-02' });
  const fee = data.transactions.find((tx) => tx.kind === 'expense')!;
  const transfer = data.transactions.find((tx) => tx.kind === 'transfer')!;
  data = saveLedgerTransaction(data, { kind: 'refund', accountId: 'bank', amount: 5_000, title: 'Fee returned', category: fee.category, refundOfId: fee.id, date: '2026-09-03' });
  assert.throws(() => deleteLedgerTransaction(data, transfer.id));
  assert.throws(() => deleteLedgerTransaction(data, fee.id));
  const refund = data.transactions.find((tx) => tx.kind === 'refund')!;
  data = deleteLedgerTransaction(data, refund.id);
  data = deleteLedgerTransaction(data, fee.id);
  assert.equal(data.transactions.length, 0);
  assert.deepEqual(balances(data), { bank: 1_000_000, cash: 0 });
});

test('a refund of prior-month spending can make this month net spending negative without becoming income', () => {
  let data = ledger([{ ...account('card', 'credit_card'), openingDate: '2026-08-01' }]);
  data.budgets = [{ id: 'shopping', category: 'shopping', limit: 1_000_000 }];
  data = saveLedgerTransaction(data, { kind: 'expense', accountId: 'card', amount: -500_000, title: 'Old purchase', category: 'shopping', date: '2026-08-20' });
  const original = data.transactions[0];
  data = saveLedgerTransaction(data, { kind: 'refund', accountId: 'card', amount: 200_000, title: 'Partial refund', category: 'shopping', refundOfId: original.id, date: today });
  assert.equal(deriveFinanceSummary(data, reference).expenseThisMonth, -200_000);
  assert.equal(deriveFinanceSummary(data, reference).incomeThisMonth, 0);
  assert.equal(deriveBudgetUsage(data, reference)[0].spent, -200_000);
  assert.equal(deriveBudgetUsage(data, reference)[0].remaining, 1_200_000);
  assert.equal(deriveFinanceSummary(data, reference).cardDebt, 300_000);
});

test('malformed arrays, reference values, and incomplete exchange snapshots return corrupt without throwing', () => {
  const base = ledger([account('usd', 'bank', 'USD', 10_000)]);
  for (const key of ['accounts', 'transactions', 'subscriptions', 'budgets', 'customCategories', 'subscriptionPayments', 'statements', 'exchangeRates']) {
    for (const value of [null, {}, [null], [false], ['invalid']]) {
      const malformed = { ...base, [key]: value };
      assert.doesNotThrow(() => {
        assert.equal(parseFinanceData(JSON.stringify(malformed)).status, 'corrupt', `${key}=${JSON.stringify(value)}`);
      });
    }
  }
  const incomplete = { ...base, transactions: [{ id: 'bad', kind: 'expense', accountId: 'usd', amount: -100, reportingAmount: -25_000, title: 'Broken FX', date: today, category: 'shopping', reportingRate: { currency: 'USD', date: today, source: 'manual' } }] };
  assert.doesNotThrow(() => assert.equal(parseFinanceData(JSON.stringify(incomplete)).status, 'corrupt'));
  for (const rate of ['0', '-1', 'NaN', 'Infinity', '1e3', '9999999999999999999999999999999']) {
    assert.equal(parseFinanceData(JSON.stringify({ ...base, exchangeRates: [{ currency: 'USD', rate, date: today, source: 'manual' }] })).status, 'corrupt');
  }
});

test('historical aggregate overflow is rejected even if a later expense makes the current total safe', () => {
  const data = ledger([account('first', 'bank', 'VND', Number.MAX_SAFE_INTEGER), account('second', 'bank', 'VND', 1)]);
  data.transactions = [{ id: 'later-expense', kind: 'expense', accountId: 'first', amount: -1, reportingAmount: -1, title: 'Later debit', category: 'other', date: '2026-09-02' }];
  assert.equal(validateFinanceData(data).valid, false);
  assert.equal(parseFinanceData(JSON.stringify(data)).status, 'corrupt');
});

test('preserved future entries cannot make a future native balance overflow', () => {
  const data = ledger([account('bank', 'bank', 'VND', Number.MAX_SAFE_INTEGER)]);
  data.transactions = [{ id: 'future-income', kind: 'income', accountId: 'bank', amount: 1, reportingAmount: 1, title: 'Future income', category: 'income', date: '2026-09-20' }];
  assert.equal(validateFinanceData(data).valid, false);
  assert.equal(parseFinanceData(JSON.stringify(data)).status, 'corrupt');
});

test('original merchant amounts are positive native minor units with a matching currency', () => {
  let data = ledger([account('card', 'credit_card')]);
  data = saveLedgerTransaction(data, { kind: 'expense', accountId: 'card', amount: -530_000, title: 'USD purchase', category: 'shopping', date: today, originalCurrency: 'USD', originalAmount: 2000 });
  assert.equal(data.transactions[0].amount, -530_000);
  assert.equal(data.transactions[0].originalAmount, 2000);
  for (const originalAmount of [-2000, 0, 0.2, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(validateFinanceData({ ...data, transactions: [{ ...data.transactions[0], originalAmount }] }).valid, false);
  }
  const unpaired = { ...data.transactions[0] };
  delete unpaired.originalCurrency;
  assert.equal(validateFinanceData({ ...data, transactions: [unpaired] }).valid, false);
});

test('a title-only foreign transfer edit preserves both sides and its fee conversion', () => {
  let data = ledger([account('usd-card', 'credit_card', 'USD'), account('cash', 'cash', 'THB')]);
  data = setExchangeRate(data, { currency: 'USD', rate: '25000', date: '2026-09-01', source: 'manual' });
  data = setExchangeRate(data, { currency: 'THB', rate: '750', date: '2026-09-01', source: 'manual' });
  data = saveTransfer(data, { accountId: 'usd-card', toAccountId: 'cash', amount: 10_000, receivedAmount: 300_000, fee: 100, date: '2026-09-02' });
  const transfer = data.transactions.find((tx) => tx.kind === 'transfer')!;
  const before = deriveLiquiditySeries(data, '7d', reference);
  const feeBefore = data.transactions.find((tx) => tx.kind === 'expense')!;
  assert.equal(transfer.receivedReportingAmount, 2_250_000);
  data = setExchangeRate(data, { currency: 'USD', rate: '27000', date: '2026-09-01', source: 'corrected' });
  data = setExchangeRate(data, { currency: 'THB', rate: '800', date: '2026-09-01', source: 'corrected' });
  data = saveTransfer(data, { accountId: 'usd-card', toAccountId: 'cash', amount: 10_000, receivedAmount: 300_000, fee: 100, date: '2026-09-02', title: 'Cash withdrawn on holiday' }, transfer.id);
  const after = data.transactions.find((tx) => tx.kind === 'transfer')!;
  const feeAfter = data.transactions.find((tx) => tx.kind === 'expense')!;
  assert.equal(after.reportingAmount, transfer.reportingAmount);
  assert.equal(after.receivedReportingAmount, transfer.receivedReportingAmount);
  assert.equal(feeAfter.reportingAmount, feeBefore.reportingAmount);
  assert.deepEqual(deriveLiquiditySeries(data, '7d', reference), before);
});

test('account setup does not invent a 7m cash outflow while real reconciliation remains visible', () => {
  const parsed = parseFinanceData(serializeLegacyOpeningBalance());
  if (parsed.status !== 'ok') return assert.fail('Expected migrated ledger');
  const before = deriveLiquiditySeries(parsed.data, '7d', reference);
  let data = setupAccounts(parsed.data, [
    account('bank', 'bank', 'VND', 10_000_000),
    account('card', 'credit_card', 'VND', -3_000_000),
  ], today);
  assert.ok(data.transactions.some((transaction) => transaction.systemTitle === 'setup' && transaction.amount === -7_000_000));
  assert.deepEqual(deriveLiquiditySeries(data, '7d', reference), before);
  assert.equal(deriveFinanceSummary(data, reference).cashBalance, 10_000_000);
  assert.equal(deriveFinanceSummary(data, reference).netWorth, 7_000_000);
  data = reconcileAccount(data, 'bank', 10_100_000, today, 'Balance correction');
  const todayPoint = deriveLiquiditySeries(data, '7d', reference).at(-1)!;
  assert.equal(todayPoint.adjustments, 100_000);
  assert.equal(todayPoint.net, 100_000);
  assert.equal(todayPoint.income, 0);
  assert.equal(todayPoint.expense, 0);
});

function serializeLegacyOpeningBalance() {
  return JSON.stringify(createLegacyData(7_000_000, reference));
}

test('a card default report separates its opening debt from actual adjustments and same-day purchases', () => {
  let data = ledger([account('card', 'credit_card', 'VND', -2_000_000)]);
  const opening = deriveAccountReport(data, 'card', undefined, today);
  assert.equal(opening.openingBalance, -2_000_000);
  assert.equal(opening.openingInPeriod, 0);
  assert.equal(opening.adjustments, 0);
  assert.equal(opening.closingBalance, -2_000_000);

  data = saveLedgerTransaction(data, { kind: 'expense', accountId: 'card', amount: -200_000, title: 'First-day purchase', category: 'shopping', date: '2026-09-01' });
  const report = deriveAccountReport(data, 'card', undefined, today);
  assert.equal(report.openingBalance, -2_000_000);
  assert.equal(report.expense, 200_000);
  assert.equal(report.adjustments, 0);
  assert.equal(report.closingBalance, -2_200_000);
  assert.equal(report.closingBalance, report.openingBalance + report.openingInPeriod + report.income - report.expense + report.transferIn - report.transferOut + report.adjustments);
});

test('a source opened during a report period has a separate opening movement and an exact balance identity', () => {
  let data = ledger([
    account('bank', 'bank', 'VND', 1_000_000),
    { ...account('card', 'credit_card', 'VND', -2_000_000), openingDate: '2026-09-03' },
  ]);
  data = saveLedgerTransaction(data, { kind: 'expense', accountId: 'card', amount: -200_000, title: 'Purchase', category: 'shopping', date: '2026-09-03' });
  data = saveTransfer(data, { accountId: 'bank', toAccountId: 'card', amount: 500_000, receivedAmount: 500_000, date: '2026-09-04' });
  data = reconcileAccount(data, 'card', -1_650_000, '2026-09-05', 'Matched card statement');

  const report = deriveAccountReport(data, 'card', '2026-09-01', today);
  assert.equal(report.openingBalance, 0);
  assert.equal(report.openingInPeriod, -2_000_000);
  assert.equal(report.expense, 200_000);
  assert.equal(report.transferIn, 500_000);
  assert.equal(report.adjustments, 50_000);
  assert.equal(report.closingBalance, -1_650_000);
  assert.equal(report.closingBalance, report.openingBalance + report.openingInPeriod + report.income - report.expense + report.transferIn - report.transferOut + report.adjustments);

  const later = deriveAccountReport(data, 'card', '2026-09-04', today);
  assert.equal(later.openingBalance, -2_200_000);
  assert.equal(later.openingInPeriod, 0);
  assert.equal(later.adjustments, 50_000);
  assert.equal(later.closingBalance, later.openingBalance + later.income - later.expense + later.transferIn - later.transferOut + later.adjustments);
});
