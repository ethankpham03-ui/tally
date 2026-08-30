import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CATEGORY_ICON_IDS,
  EXPENSE_CATEGORY_DEFINITIONS,
  FINANCE_DATA_VERSION,
  addDaysDateOnly,
  addMonthsPreservingAnchor,
  addYearsPreservingAnchor,
  createDemoData,
  createEmptyData,
  dateOnlyDayDifference,
  deriveBudgetUsage,
  deriveCashflowSeries,
  deriveFinanceSummary,
  deriveSubscriptionTotals,
  isSafePositiveAmount,
  isValidDateOnly,
  parseFinanceData,
  recordSubscriptionPayment,
  serializeFinanceData,
  suggestSubscriptionExpenseCategory,
  validateFinanceData,
  type Transaction,
} from '../app/finance-domain.ts';

const reference = new Date('2026-08-27T12:00:00+07:00');

test('demo data is internally coherent and relative to the selected month', () => {
  const data = createDemoData(reference);
  const summary = deriveFinanceSummary(data, reference);

  assert.equal(data.version, FINANCE_DATA_VERSION);
  assert.equal(data.mode, 'demo');
  assert.equal(summary.incomeThisMonth, 53_400_000);
  assert.equal(summary.expenseThisMonth, 24_720_000);
  assert.equal(summary.netThisMonth, 28_680_000);
  assert.equal(summary.availableBalance, 42_680_000);
  assert.equal(summary.transactionCountThisMonth, 13);
  assert.ok(data.transactions.every((transaction) => transaction.date.startsWith('2026-08-')));
});

test('summary scopes monthly totals but uses the full ledger for available balance', () => {
  const data = createEmptyData(1_000, reference);
  data.transactions = [
    { id: 'current-income', title: 'Income', category: 'income', date: '2026-08-01', amount: 500 },
    { id: 'current-expense', title: 'Expense', category: 'dining', date: '2026-08-10', amount: -120 },
    { id: 'prior-expense', title: 'Old expense', category: 'bills', date: '2026-07-31', amount: -80 },
  ];

  assert.deepEqual(deriveFinanceSummary(data, reference), {
    availableBalance: 1_300,
    incomeThisMonth: 500,
    expenseThisMonth: 120,
    netThisMonth: 380,
    transactionCountThisMonth: 2,
  });
});

test('date-only helpers are strict, signed, and independent of DST-length days', () => {
  assert.equal(isValidDateOnly('2024-02-29'), true);
  assert.equal(isValidDateOnly('2023-02-29'), false);
  assert.equal(isValidDateOnly('2026-8-01'), false);
  assert.equal(dateOnlyDayDifference('2026-03-07', '2026-03-09'), 2);
  assert.equal(dateOnlyDayDifference('2026-03-09', '2026-03-07'), -2);
  assert.equal(addDaysDateOnly('2026-03-01', -1), '2026-02-28');
});

test('monthly recurrence preserves the original anchor after short months', () => {
  const february = addMonthsPreservingAnchor('2027-01-31', 1, 31);
  assert.equal(february, '2027-02-28');
  assert.equal(addMonthsPreservingAnchor(february, 1, 31), '2027-03-31');
  assert.equal(addMonthsPreservingAnchor('2024-01-31', 1, 31), '2024-02-29');
});

test('yearly recurrence handles leap-day anchors', () => {
  const nonLeap = addYearsPreservingAnchor('2024-02-29', 1, 29);
  assert.equal(nonLeap, '2025-02-28');
  assert.equal(addYearsPreservingAnchor(nonLeap, 3, 29), '2028-02-29');
});

test('budget spending is derived only from current-month expense transactions', () => {
  const data = createDemoData(reference);
  const usage = deriveBudgetUsage(data, reference);
  const shopping = usage.find((budget) => budget.category === 'shopping');
  const entertainment = usage.find((budget) => budget.category === 'entertainment');

  assert.equal(shopping?.spent, 3_650_000);
  assert.equal(shopping?.remaining, -1_650_000);
  assert.equal(shopping?.isOver, true);
  assert.equal(entertainment?.spent, 707_000);
  assert.equal(entertainment?.isWarning, false);
});

test('cashflow daily series aggregates income and expense without inventing values', () => {
  const transactions: Transaction[] = [
    { id: 'a', title: 'Income', category: 'income', date: '2026-08-27', amount: 1_000 },
    { id: 'b', title: 'Coffee', category: 'dining', date: '2026-08-27', amount: -125 },
    { id: 'c', title: 'Old', category: 'other', date: '2026-08-19', amount: -300 },
  ];
  const series = deriveCashflowSeries(transactions, '7d', reference);

  assert.equal(series.length, 7);
  assert.equal(series[0].startDate, '2026-08-21');
  assert.deepEqual(series.at(-1), {
    key: '2026-08-27',
    startDate: '2026-08-27',
    endDate: '2026-08-27',
    income: 1_000,
    expense: 125,
    net: 875,
    transactionCount: 2,
  });
  assert.equal(series.reduce((sum, point) => sum + point.transactionCount, 0), 2);
});

test('cashflow month periods contain six or twelve calendar buckets', () => {
  const data = createDemoData(reference);
  const sixMonths = deriveCashflowSeries(data.transactions, '6m', reference);
  const year = deriveCashflowSeries(data.transactions, '1y', reference);

  assert.equal(sixMonths.length, 6);
  assert.equal(sixMonths[0].key, '2026-03');
  assert.equal(sixMonths.at(-1)?.key, '2026-08');
  assert.equal(year.length, 12);
  assert.equal(year[0].key, '2025-09');
  assert.equal(year.at(-1)?.net, 28_680_000);
});

test('subscription totals normalize annual billing and exclude paused services', () => {
  const data = createDemoData(reference);
  const totals = deriveSubscriptionTotals(data.subscriptions);

  assert.deepEqual(totals, { monthly: 985_250, annual: 11_823_000, activeCount: 5 });
});

test('versioned JSON parser distinguishes missing, corrupt, future and valid data', () => {
  const data = createDemoData(reference);
  assert.deepEqual(parseFinanceData(null), { status: 'missing' });
  assert.deepEqual(parseFinanceData('  '), { status: 'missing' });
  assert.equal(parseFinanceData('{oops').status, 'corrupt');
  assert.deepEqual(parseFinanceData(JSON.stringify({ version: 7 })), { status: 'future-version', version: 7 });

  const parsed = parseFinanceData(serializeFinanceData(data));
  assert.equal(parsed.status, 'ok');
  if (parsed.status === 'ok') assert.deepEqual(parsed.data, data);
});

test('v1 backups migrate to v2 without changing financial totals', () => {
  const current = createDemoData(reference);
  const before = deriveFinanceSummary(current, reference);
  const legacy = structuredClone(current) as unknown as Record<string, unknown>;
  legacy.version = 1;
  delete legacy.customCategories;

  const parsed = parseFinanceData(JSON.stringify(legacy));
  assert.equal(parsed.status, 'ok');
  if (parsed.status !== 'ok') return;
  assert.equal(parsed.data.version, FINANCE_DATA_VERSION);
  assert.deepEqual(parsed.data.customCategories, []);
  assert.deepEqual(deriveFinanceSummary(parsed.data, reference), before);
});

test('v1 migration normalizes legacy amount and category mismatches', () => {
  const legacy = structuredClone(createEmptyData(0, reference)) as unknown as Record<string, unknown>;
  legacy.version = 1;
  delete legacy.customCategories;
  legacy.transactions = [
    { id: 'legacy-income', title: 'Refund', category: 'shopping', date: '2026-08-20', amount: 250_000 },
    { id: 'legacy-expense', title: 'Charge', category: 'income', date: '2026-08-21', amount: -90_000 },
  ];

  const parsed = parseFinanceData(JSON.stringify(legacy));
  assert.equal(parsed.status, 'ok');
  if (parsed.status !== 'ok') return;
  assert.equal(parsed.migrated, true);
  assert.deepEqual(parsed.data.transactions.map((transaction) => transaction.category), ['income', 'other']);
});

test('custom categories round-trip through validated backups', () => {
  const data = createEmptyData(0, reference);
  const category = { id: 'custom:plants_123' as const, name: 'Chăm cây cảnh', icon: 'sparkle' as const };
  data.customCategories.push(category);
  data.transactions.push({ id: 'custom-tx', title: 'Đất trồng', category: category.id, date: '2026-08-27', amount: -125_000 });
  data.budgets.push({ id: 'custom-budget', category: category.id, limit: 500_000 });

  const parsed = parseFinanceData(serializeFinanceData(data));
  assert.equal(parsed.status, 'ok');
  if (parsed.status === 'ok') assert.deepEqual(parsed.data, data);
});

test('expense taxonomy has unique stable ids and allowlisted icons', () => {
  const ids = EXPENSE_CATEGORY_DEFINITIONS.map((category) => category.id);
  const iconIds = new Set<string>(CATEGORY_ICON_IDS);
  assert.ok(ids.length >= 90);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(EXPENSE_CATEGORY_DEFINITIONS.every((category) => iconIds.has(category.icon)));
});

test('subscription category suggestions use brand boundaries instead of substrings', () => {
  assert.equal(suggestSubscriptionExpenseCategory('Apple TV+'), 'streaming');
  assert.equal(suggestSubscriptionExpenseCategory('Xbox Game Pass'), 'gaming');
  assert.equal(suggestSubscriptionExpenseCategory('Box Business'), 'cloud_storage');
  assert.equal(suggestSubscriptionExpenseCategory('A small app'), 'software');
});

test('runtime validation rejects unsafe monetary values and duplicate budget categories', () => {
  const data = createDemoData(reference);
  const unsafe = structuredClone(data) as unknown as { openingBalance: number };
  unsafe.openingBalance = Number.MAX_SAFE_INTEGER + 1;
  assert.equal(validateFinanceData(unsafe).valid, false);

  const duplicateBudget = structuredClone(data);
  duplicateBudget.budgets.push({ ...duplicateBudget.budgets[0], id: 'another-budget' });
  const result = validateFinanceData(duplicateBudget);
  assert.equal(result.valid, false);
  if (!result.valid) assert.ok(result.issues.some((issue) => issue.includes('duplicate category')));

  assert.equal(isSafePositiveAmount(1), true);
  assert.equal(isSafePositiveAmount(0), false);
  assert.equal(isSafePositiveAmount(1.5), false);
  assert.equal(isSafePositiveAmount(Number.MAX_SAFE_INTEGER + 1), false);
});

test('recording a subscription payment creates one ledger expense and advances its recurrence', () => {
  const data = createDemoData(reference);
  const subscription = data.subscriptions.find((item) => item.id === 'demo-sub-spotify');
  assert.ok(subscription);
  const occurrenceDate = subscription.nextRenewal;
  const transactionCount = data.transactions.length;

  const result = recordSubscriptionPayment(data, subscription.id, '2026-08-28');
  assert.equal(result.status, 'recorded');
  if (result.status !== 'recorded') return;
  assert.equal(result.data.transactions.length, transactionCount + 1);
  assert.equal(result.transaction.amount, -59_000);
  assert.equal(result.transaction.category, 'music');
  assert.equal(result.payment.occurrenceDate, occurrenceDate);
  assert.equal(result.data.subscriptions.find((item) => item.id === subscription.id)?.nextRenewal, '2026-09-28');
  assert.equal(result.data.mode, 'personal');

  const sameOccurrence = {
    ...result.data,
    subscriptions: result.data.subscriptions.map((item) => item.id === subscription.id ? { ...item, nextRenewal: occurrenceDate } : item),
  };
  const duplicate = recordSubscriptionPayment(sameOccurrence, subscription.id, '2026-08-28');
  assert.equal(duplicate.status, 'already-recorded');
  assert.equal(duplicate.data.transactions.length, transactionCount + 1);
});

test('payment recording safely reports missing, paused and invalid requests', () => {
  const data = createDemoData(reference);
  assert.equal(recordSubscriptionPayment(data, 'missing').status, 'not-found');
  assert.equal(recordSubscriptionPayment(data, 'demo-sub-netflix').status, 'paused');
  assert.equal(recordSubscriptionPayment(data, 'demo-sub-spotify', 'not-a-date').status, 'invalid-date');
});
