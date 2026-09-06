import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmptyData as createLegacyData } from '../app/finance-domain.ts';
import {
  completeOnboarding,
  createEmptyData,
  deriveAccountBalances,
  deriveFinanceSummary,
  deriveLiquiditySeries,
  needsOnboarding,
  parseFinanceData,
  saveLedgerTransaction,
  serializeFinanceData,
  skipOnboarding,
  validateFinanceData,
  type AccountInput,
  type FinanceData,
} from '../app/finance-v4.ts';

const reference = new Date('2026-09-06T12:00:00+07:00');
const today = '2026-09-06';
const source = (id: string, kind: AccountInput['kind'], openingBalance = 0, currency: AccountInput['currency'] = 'VND'): AccountInput => ({
  id, name: id, kind, currency, openingBalance, openingDate: today,
});

test('a new ledger starts empty and pending, while older ledgers never acquire an onboarding marker', () => {
  const fresh = createEmptyData(0, reference);
  assert.equal(needsOnboarding(fresh), true);
  assert.equal(fresh.setupComplete, false);
  assert.equal(fresh.mode, 'personal');
  assert.equal(fresh.accounts.length, 1);
  for (const key of ['transactions', 'subscriptions', 'budgets', 'subscriptionPayments', 'customCategories', 'statements', 'exchangeRates'] as const) {
    assert.deepEqual(fresh[key], []);
  }
  const older = { ...fresh };
  delete older.onboarding;
  const parsed = parseFinanceData(JSON.stringify(older));
  assert.equal(parsed.status, 'ok');
  if (parsed.status === 'ok') assert.equal(needsOnboarding(parsed.data), false);
  const migrated = parseFinanceData(JSON.stringify(createLegacyData(0, reference)));
  assert.equal(migrated.status, 'ok');
  if (migrated.status === 'ok') assert.equal(needsOnboarding(migrated.data), false);
  assert.equal(needsOnboarding(createEmptyData(5_000_000, reference)), false);
});

test('first cash, bank, and credit balances are saved atomically without sample entries or invented cash flow', () => {
  const initial = createEmptyData(0, reference);
  initial.revision = 7;
  const before = structuredClone(initial);
  const complete = completeOnboarding(initial, [
    source('cash', 'cash', 500_000),
    { ...source('bank', 'bank', 10_000_000), name: '  Main bank  ' },
    { ...source('card', 'credit_card', -2_000_000), creditLimit: 20_000_000 },
  ], today);
  assert.deepEqual(initial, before);
  assert.equal(complete.revision, 8);
  assert.equal(complete.onboarding, 'completed');
  assert.equal(complete.setupComplete, true);
  assert.equal(needsOnboarding(complete), false);
  assert.deepEqual(complete.accounts.map((account) => account.id), ['cash', 'bank', 'card']);
  assert.equal(complete.accounts[1].name, 'Main bank');
  assert.ok(complete.accounts.every((account) => !account.archived && account.openingDate === today));
  assert.deepEqual(complete.transactions, []);
  const summary = deriveFinanceSummary(complete, reference);
  assert.equal(summary.cashBalance, 10_500_000);
  assert.equal(summary.cardDebt, 2_000_000);
  assert.equal(summary.netWorth, 8_500_000);
  assert.equal(summary.incomeThisMonth, 0);
  assert.equal(summary.expenseThisMonth, 0);
  assert.ok(deriveLiquiditySeries(complete, '7d', reference).every((point) => point.net === 0));
});

test('foreign onboarding balances remain exact and disclose unavailable conversion without requiring a guessed exchange rate', () => {
  const complete = completeOnboarding(createEmptyData(0, reference), [source('usd-bank', 'bank', 10_025, 'USD')], today);
  assert.equal(deriveAccountBalances(complete, reference)[0].balance, 10_025);
  const summary = deriveFinanceSummary(complete, reference);
  assert.deepEqual(summary.missingCurrencies, ['USD']);
  assert.equal(summary.incomeThisMonth, 0);
  assert.deepEqual(complete.exchangeRates, []);
});

test('skipping creates a usable zero cash ledger and its saved choice survives reload', () => {
  const initial = createEmptyData(0, reference);
  const skipped = skipOnboarding(initial);
  assert.equal(initial.onboarding, 'pending');
  assert.equal(skipped.onboarding, 'skipped');
  assert.equal(skipped.setupComplete, true);
  assert.equal(skipped.revision, 1);
  assert.deepEqual(skipped.accounts, initial.accounts);
  const parsed = parseFinanceData(serializeFinanceData(skipped));
  assert.equal(parsed.status, 'ok');
  if (parsed.status !== 'ok') return;
  assert.equal(needsOnboarding(parsed.data), false);
  const spent = saveLedgerTransaction(parsed.data, { accountId: 'account-cash', kind: 'expense', amount: -50_000, category: 'dining', title: 'First lunch', date: today });
  assert.equal(spent.transactions.length, 1);
  assert.equal(spent.onboarding, 'skipped');
});

test('completed onboarding survives serialization and cannot run again', () => {
  const complete = completeOnboarding(createEmptyData(0, reference), [source('cash', 'cash')], today);
  const parsed = parseFinanceData(serializeFinanceData(complete));
  assert.equal(parsed.status, 'ok');
  if (parsed.status === 'ok') {
    assert.deepEqual(parsed.data, complete);
    assert.equal(needsOnboarding(parsed.data), false);
  }
  assert.throws(() => completeOnboarding(complete, [source('replacement', 'bank')], today), /no longer pending/);
  assert.throws(() => skipOnboarding(complete), /no longer pending/);
});

test('onboarding validates real source types, identifiers, minor amounts, credit limits, and the shared opening date', () => {
  const initial = createEmptyData(0, reference);
  const invalidSources: AccountInput[][] = [
    [],
    [source('legacy', 'legacy')],
    [{ ...source('closed', 'bank'), archived: true }],
    [source('same', 'cash'), source('same', 'bank')],
    [{ ...source('blank', 'bank'), name: '  ' }],
    [source('long', 'bank'), { ...source('long-name', 'cash'), name: 'a'.repeat(61) }],
    [source('fraction', 'bank', 0.1)],
    [source('large', 'bank', Number.MAX_SAFE_INTEGER + 1)],
    [{ ...source('currency', 'bank'), currency: 'XYZ' as AccountInput['currency'] }],
    [{ ...source('limit', 'bank'), creditLimit: 1_000_000 }],
    [{ ...source('limit', 'credit_card'), creditLimit: -1 }],
  ];
  for (const inputs of invalidSources) assert.throws(() => completeOnboarding(initial, inputs, today));
  for (const date of ['2026-02-30', '2999-01-01', '']) {
    assert.throws(() => completeOnboarding(initial, [source('cash', 'cash')], date), /date/);
  }
  assert.equal(initial.onboarding, 'pending');
});

test('a pending marker never authorizes replacing meaningful edits or other existing records', () => {
  const fresh = createEmptyData(0, reference);
  const mutations: Array<(data: FinanceData) => void> = [
    (data) => { data.accounts[0].openingBalance = 100_000; },
    (data) => { data.accounts[0].name = 'My pocket'; },
    (data) => { data.accounts[0].currency = 'USD'; },
    (data) => { data.accounts.push({ ...source('saved-bank', 'bank'), id: 'saved-bank', archived: false }); },
    (data) => { data.transactions.push({ id: 'real', accountId: 'account-cash', kind: 'expense', title: 'Real lunch', date: today, amount: -50_000, reportingAmount: -50_000, category: 'dining' }); },
    (data) => { data.budgets.push({ id: 'real-budget', category: 'dining', limit: 1_000_000 }); },
    (data) => { data.customCategories.push({ id: 'custom:real_category', name: 'Real category', icon: 'sparkle' }); },
    (data) => { data.exchangeRates.push({ currency: 'USD', date: today, rate: '25000', source: 'My bank' }); },
    (data) => { data.setupComplete = true; },
    (data) => { data.mode = 'demo'; },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(fresh);
    mutate(changed);
    const before = structuredClone(changed);
    assert.equal(needsOnboarding(changed), false);
    assert.throws(() => completeOnboarding(changed, [source('replacement', 'bank')], today), /Ledger has changed/);
    assert.throws(() => skipOnboarding(changed), /Ledger has changed/);
    assert.deepEqual(changed, before);
  }
});

test('a valid imported pending ledger with a real transaction opens its existing ledger', () => {
  const edited = saveLedgerTransaction(createEmptyData(0, reference), {
    accountId: 'account-cash', kind: 'income', title: 'Real deposit', amount: 100_000, category: 'income', date: today,
  });
  assert.equal(edited.onboarding, 'pending');
  const parsed = parseFinanceData(serializeFinanceData(edited));
  assert.equal(parsed.status, 'ok');
  if (parsed.status !== 'ok') return;
  assert.equal(needsOnboarding(parsed.data), false);
  assert.equal(parsed.data.transactions[0].title, 'Real deposit');
  assert.throws(() => completeOnboarding(parsed.data, [source('replacement', 'bank')], today), /Ledger has changed/);
});

test('malformed onboarding statuses fail closed while all recognized statuses round trip', () => {
  const initial = createEmptyData(0, reference);
  for (const onboarding of [null, '', 'done', true, 1, {}, []]) {
    assert.equal(validateFinanceData({ ...initial, onboarding }).valid, false);
    assert.equal(parseFinanceData(JSON.stringify({ ...initial, onboarding })).status, 'corrupt');
  }
  for (const onboarding of ['pending', 'completed', 'skipped'] as const) {
    const parsed = parseFinanceData(serializeFinanceData({ ...initial, onboarding }));
    assert.equal(parsed.status, 'ok');
    if (parsed.status === 'ok') assert.equal(parsed.data.onboarding, onboarding);
  }
});
