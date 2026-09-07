import assert from 'node:assert/strict';
import test from 'node:test';
import {
  archiveAccount,
  completeOnboarding,
  createEmptyData,
  deleteAccount,
  deriveAccountBalances,
  deriveFinanceSummary,
  getDefaultAccountId,
  parseFinanceData,
  reorderAccounts,
  saveAccount,
  saveLedgerTransaction,
  serializeFinanceData,
  setDefaultAccount,
  setupAccounts,
  unarchiveAccount,
  validateFinanceData,
  type Account,
  type FinanceData,
} from '../app/finance-v4.ts';

const reference = new Date('2026-09-06T12:00:00+07:00');
const today = '2026-09-06';
const account = (id: string, kind: Account['kind'] = 'bank', openingBalance = 0): Account => ({
  id, name: id, kind, currency: 'VND', openingBalance,
  openingDate: kind === 'legacy' ? null : today, archived: false,
});
const ledger = (accounts: Account[]): FinanceData => ({
  ...createEmptyData(0, reference), accounts, setupComplete: true,
});

test('older v4 backups remain valid and choose cash before other active sources', () => {
  const old = ledger([
    account('history', 'legacy'),
    { ...account('closed-cash', 'cash'), archived: true },
    account('bank'), account('cash', 'cash'), account('second-cash', 'cash'),
  ]);
  assert.equal(old.defaultAccountId, undefined);
  assert.equal(getDefaultAccountId(old), 'cash');
  const parsed = parseFinanceData(serializeFinanceData(old));
  assert.equal(parsed.status, 'ok');
  if (parsed.status === 'ok') {
    assert.deepEqual(parsed.data, old);
    assert.equal(getDefaultAccountId(parsed.data), 'cash');
  }
  assert.equal(getDefaultAccountId(ledger([account('first'), account('second')])), 'first');
  assert.equal(getDefaultAccountId(ledger([account('history', 'legacy')])), undefined);
  assert.equal(getDefaultAccountId({ ...old, defaultAccountId: 'missing' }), 'cash');
  assert.equal(getDefaultAccountId({ ...old, defaultAccountId: 'closed-cash' }), 'cash');
});

test('an explicit default survives round trips and unrelated transaction edits', () => {
  const initial = ledger([account('bank'), account('cash', 'cash')]);
  const selected = setDefaultAccount(initial, 'bank');
  assert.equal(initial.defaultAccountId, undefined);
  assert.equal(selected.revision, initial.revision + 1);
  const spent = saveLedgerTransaction(selected, {
    kind: 'expense', accountId: 'cash', title: 'Lunch', amount: -50_000,
    category: 'dining', date: today,
  });
  const parsed = parseFinanceData(serializeFinanceData(spent));
  assert.equal(parsed.status, 'ok');
  if (parsed.status === 'ok') assert.equal(getDefaultAccountId(parsed.data), 'bank');
  assert.equal(setDefaultAccount(selected, 'bank'), selected);
});

test('adding a source pins the previous fallback instead of changing the default', () => {
  const old = ledger([account('bank')]);
  const added = saveAccount(old, account('cash', 'cash'));
  assert.equal(added.defaultAccountId, 'bank');
  const changed = setDefaultAccount(added, 'cash');
  assert.equal(changed.defaultAccountId, 'cash');
});

test('reordering persists all active sources without affecting balances, records, or the default', () => {
  let initial = ledger([
    account('bank', 'bank', 1_000_000), account('history', 'legacy'),
    account('cash', 'cash', 200_000), { ...account('closed'), archived: true },
    account('card', 'credit_card', -50_000),
  ]);
  initial = saveLedgerTransaction(initial, {
    kind: 'expense', accountId: 'bank', title: 'Lunch', amount: -50_000,
    category: 'dining', date: today,
  });
  initial = setDefaultAccount(initial, 'bank');
  const before = structuredClone(initial);
  const reordered = reorderAccounts(initial, ['card', 'bank', 'cash']);
  assert.deepEqual(initial, before);
  assert.equal(reordered.revision, initial.revision + 1);
  assert.deepEqual(reordered.accounts.map((item) => item.id), ['card', 'history', 'bank', 'closed', 'cash']);
  assert.equal(reordered.defaultAccountId, 'bank');
  for (const key of ['transactions', 'subscriptions', 'subscriptionPayments', 'statements', 'budgets', 'exchangeRates'] as const) {
    assert.deepEqual(reordered[key], initial[key]);
  }
  const balances = (data: FinanceData) => Object.fromEntries(deriveAccountBalances(data, reference).map((row) => [row.account.id, row.balance]));
  assert.deepEqual(balances(reordered), balances(initial));
  assert.deepEqual(deriveFinanceSummary(reordered, reference), deriveFinanceSummary(initial, reference));
  const parsed = parseFinanceData(serializeFinanceData(reordered));
  assert.equal(parsed.status, 'ok');
  if (parsed.status === 'ok') assert.deepEqual(parsed.data, reordered);
});

test('reordering older ledgers preserves their default even when cash order changes', () => {
  const data = ledger([account('cash-a', 'cash'), account('cash-b', 'cash')]);
  const reordered = reorderAccounts(data, ['cash-b', 'cash-a']);
  assert.equal(reordered.defaultAccountId, 'cash-a');
});

test('reordering requires every active real account once and rejects partial or foreign lists', () => {
  const data = ledger([account('bank'), account('cash', 'cash'), account('history', 'legacy'), { ...account('closed'), archived: true }]);
  for (const order of [[], ['bank'], ['cash', 'cash'], ['bank', 'missing'], ['bank', 'closed'], ['bank', 'history'], ['bank', 'cash', 'history']]) {
    assert.throws(() => reorderAccounts(data, order), /each active source exactly once/);
  }
  assert.deepEqual(data.accounts.map((item) => item.id), ['bank', 'cash', 'history', 'closed']);
});

test('archiving and deleting the default select a remaining source and restoring does not steal it', () => {
  const initial = setDefaultAccount(ledger([account('bank'), account('cash', 'cash')]), 'bank');
  const archived = archiveAccount(initial, 'bank');
  assert.equal(archived.defaultAccountId, 'cash');
  const restored = unarchiveAccount(archived, 'bank');
  assert.equal(restored.defaultAccountId, 'cash');
  const removed = deleteAccount(restored, 'cash');
  assert.equal(removed.defaultAccountId, 'bank');
  const onlyActive = ledger([account('bank'), { ...account('closed'), archived: true }]);
  assert.throws(() => deleteAccount(onlyActive, 'bank'), /at least one active source/);
});

test('account setup and onboarding establish a usable default among the replacement sources', () => {
  const fresh = completeOnboarding(createEmptyData(0, reference), [account('bank'), account('cash', 'cash')], today);
  assert.equal(fresh.defaultAccountId, 'cash');
  const pending = { ...setDefaultAccount(ledger([account('old-bank')]), 'old-bank'), setupComplete: false };
  const setup = setupAccounts(pending, [account('new-bank'), account('new-cash', 'cash')], today);
  assert.equal(setup.defaultAccountId, 'new-cash');
  assert.equal(setup.accounts.find((item) => item.id === 'old-bank')?.archived, true);
  assert.equal(validateFinanceData(setup).valid, true);
});

test('default choices reject missing, archived, and historical account references', () => {
  const data = ledger([account('bank'), account('history', 'legacy'), { ...account('closed'), archived: true }]);
  for (const id of ['missing', 'history', 'closed', '']) assert.throws(() => setDefaultAccount(data, id));
  for (const defaultAccountId of [null, 1, '', 'missing', 'history', 'closed']) {
    assert.equal(validateFinanceData({ ...data, defaultAccountId }).valid, false);
  }
});

test('bank identity is optional, portable, and validated independently of the display catalog', () => {
  const data = saveAccount(ledger([account('cash', 'cash')]), { ...account('bank'), bankId: 'vn-bidv' });
  const parsed = parseFinanceData(serializeFinanceData(data));
  assert.equal(parsed.status, 'ok');
  if (parsed.status === 'ok') assert.equal(parsed.data.accounts[1].bankId, 'vn-bidv');
  assert.equal(validateFinanceData(ledger([{ ...account('bank'), bankId: 'future_bank-123' }])).valid, true);
  for (const bankId of [null, 7, '', ' ', 'bad id', '../logo', 'a'.repeat(81)]) {
    const invalid = { ...ledger([account('bank')]), accounts: [{ ...account('bank'), bankId }] };
    const result = validateFinanceData(invalid);
    assert.equal(result.valid, false);
    if (!result.valid) assert.ok(result.issues.some((issue) => issue.includes('bankId')));
  }
});
