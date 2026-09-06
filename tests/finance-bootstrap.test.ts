import assert from 'node:assert/strict';
import test from 'node:test';

import { createDemoData as createLegacyDemoData } from '../app/finance-domain.ts';
import { initializeFinanceStorage } from '../app/finance-bootstrap.ts';
import {
  FINANCE_STORAGE_KEY,
  LEGACY_FINANCE_STORAGE_KEY,
  createDemoData,
  serializeFinanceData,
} from '../app/finance-v4.ts';
import {
  LEGACY_FINANCE_BACKUP_KEY,
  createFinanceStorageController,
  type FinanceLockManager,
} from '../app/finance-storage.ts';

const reference = new Date('2026-09-06T12:00:00+07:00');

class MemoryStorage {
  values = new Map<string, string>();
  writes: string[] = [];
  failOnRead = false;
  failOnWrite = false;

  getItem(key: string) {
    if (this.failOnRead) throw new Error('Storage is disabled');
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    if (this.failOnWrite) throw new Error('Quota exceeded');
    this.values.set(key, value);
    this.writes.push(key);
  }
}

function demoStorage() {
  const storage = new MemoryStorage();
  const data = { ...createDemoData(reference), revision: 7 };
  const raw = serializeFinanceData(data);
  storage.values.set(FINANCE_STORAGE_KEY, raw);
  return { storage, data, raw };
}

test('a new installation stays empty and unwritten until an onboarding choice', async () => {
  const storage = new MemoryStorage();
  const result = await initializeFinanceStorage(createFinanceStorageController(storage, null));
  assert.equal(result.status, 'missing');
  assert.deepEqual(storage.writes, []);
});

test('an untouched demo is replaced with a persisted empty ledger at the next revision', async () => {
  const { storage, data } = demoStorage();
  const controller = createFinanceStorageController(storage, null);
  const result = await initializeFinanceStorage(controller);
  if (result.status !== 'ok') return assert.fail('Expected a clean ledger');
  assert.equal(result.data.mode, 'personal');
  assert.equal(result.data.revision, data.revision + 1);
  assert.equal(result.data.setupComplete, false);
  assert.equal(result.data.onboarding, 'pending');
  assert.equal(result.data.accounts.length, 1);
  assert.equal(result.data.accounts[0].openingBalance, 0);
  for (const rows of [result.data.transactions, result.data.subscriptions, result.data.budgets,
    result.data.subscriptionPayments, result.data.customCategories, result.data.statements, result.data.exchangeRates]) {
    assert.deepEqual(rows, []);
  }
  assert.deepEqual(storage.writes, [FINANCE_STORAGE_KEY]);
  assert.deepEqual(controller.load(), result);

  const secondLoad = await initializeFinanceStorage(controller);
  assert.deepEqual(secondLoad, result);
  assert.deepEqual(storage.writes, [FINANCE_STORAGE_KEY]);
});

test('an old demo is cleared only after the storage controller preserves its exact legacy bytes', async () => {
  const storage = new MemoryStorage();
  const raw = JSON.stringify(createLegacyDemoData(reference), null, 2);
  storage.values.set(LEGACY_FINANCE_STORAGE_KEY, raw);
  const result = await initializeFinanceStorage(createFinanceStorageController(storage, null));
  if (result.status !== 'ok') return assert.fail('Expected a clean ledger');
  assert.equal(result.data.mode, 'personal');
  assert.equal(result.data.onboarding, 'pending');
  assert.deepEqual(result.data.transactions, []);
  assert.equal(storage.getItem(LEGACY_FINANCE_BACKUP_KEY), raw);
  assert.equal(storage.getItem(LEGACY_FINANCE_STORAGE_KEY), raw);
  assert.deepEqual(storage.writes, [LEGACY_FINANCE_BACKUP_KEY, FINANCE_STORAGE_KEY]);
});

test('personal data is preserved even when the user originally edited a demo', async () => {
  const { storage, data } = demoStorage();
  const personal = {
    ...data,
    mode: 'personal' as const,
    accounts: data.accounts.map((account, index) => index ? account : { ...account, name: 'My actual cash' }),
  };
  const raw = serializeFinanceData(personal);
  storage.values.set(FINANCE_STORAGE_KEY, raw);
  const result = await initializeFinanceStorage(createFinanceStorageController(storage, null));
  if (result.status !== 'ok') return assert.fail('Expected personal data');
  assert.deepEqual(result.data, personal);
  assert.equal(storage.getItem(FINANCE_STORAGE_KEY), raw);
  assert.deepEqual(storage.writes, []);
});

test('corrupt and future data stay protected without falling back to a legacy demo', async () => {
  for (const raw of ['', '  ', '{broken', JSON.stringify({ version: 99 })]) {
    const storage = new MemoryStorage();
    storage.values.set(FINANCE_STORAGE_KEY, raw);
    storage.values.set(LEGACY_FINANCE_STORAGE_KEY, JSON.stringify(createLegacyDemoData(reference)));
    const result = await initializeFinanceStorage(createFinanceStorageController(storage, null));
    assert.equal(result.status, raw.includes('99') ? 'future' : 'corrupt');
    assert.equal(storage.getItem(FINANCE_STORAGE_KEY), raw);
    assert.deepEqual(storage.writes, []);
  }
});

test('a failed cleanup reports an error and preserves stored bytes until an explicit retry', async () => {
  const { storage, raw } = demoStorage();
  storage.failOnWrite = true;
  const controller = createFinanceStorageController(storage, null);
  const result = await initializeFinanceStorage(controller);
  assert.equal(result.status, 'error');
  if (result.status === 'error') assert.match(result.reason, /Sample data could not be cleared.*Quota exceeded/);
  assert.equal(storage.getItem(FINANCE_STORAGE_KEY), raw);
  assert.deepEqual(storage.writes, []);

  storage.failOnWrite = false;
  const retried = await initializeFinanceStorage(controller);
  if (retried.status !== 'ok') return assert.fail('Expected successful retry');
  assert.equal(retried.data.mode, 'personal');
  assert.deepEqual(retried.data.transactions, []);
});

test('a blocked legacy backup prevents cleanup instead of discarding the original demo', async () => {
  const storage = new MemoryStorage();
  const raw = JSON.stringify(createLegacyDemoData(reference));
  storage.values.set(LEGACY_FINANCE_STORAGE_KEY, raw);
  storage.values.set(LEGACY_FINANCE_BACKUP_KEY, 'A different preserved ledger');
  const result = await initializeFinanceStorage(createFinanceStorageController(storage, null));
  assert.equal(result.status, 'error');
  assert.equal(storage.getItem(LEGACY_FINANCE_STORAGE_KEY), raw);
  assert.equal(storage.getItem(FINANCE_STORAGE_KEY), null);
  assert.deepEqual(storage.writes, []);
});

test('personal data saved by a competing tab wins over demo cleanup, including at the same revision', async () => {
  for (const revisionChange of [0, 1]) {
    const { storage, data } = demoStorage();
    const personal = { ...data, mode: 'personal' as const, revision: data.revision + revisionChange };
    const raw = serializeFinanceData(personal);
    const locks: FinanceLockManager = {
      async request<T>(_name: string, callback: () => T | Promise<T>) {
        storage.values.set(FINANCE_STORAGE_KEY, raw);
        return await callback();
      },
    };
    const result = await initializeFinanceStorage(createFinanceStorageController(storage, locks));
    if (result.status !== 'ok') return assert.fail('Expected the competing personal ledger');
    assert.deepEqual(result.data, personal);
    assert.equal(storage.getItem(FINANCE_STORAGE_KEY), raw);
    assert.deepEqual(storage.writes, []);
  }
});

test('a competing demo produces a retry error and is never returned for presentation', async () => {
  const { storage, data } = demoStorage();
  const raw = serializeFinanceData({ ...data, revision: data.revision + 1 });
  let lockRequests = 0;
  const locks: FinanceLockManager = {
    async request<T>(_name: string, callback: () => T | Promise<T>) {
      lockRequests += 1;
      storage.values.set(FINANCE_STORAGE_KEY, raw);
      return await callback();
    },
  };
  const result = await initializeFinanceStorage(createFinanceStorageController(storage, locks));
  assert.equal(result.status, 'error');
  if (result.status === 'error') assert.match(result.reason, /Retry/);
  assert.equal(lockRequests, 1);
  assert.equal(storage.getItem(FINANCE_STORAGE_KEY), raw);
  assert.deepEqual(storage.writes, []);
});

test('storage access and Web Lock errors never cause an unprotected cleanup write', async () => {
  for (const failure of ['storage', 'lock']) {
    const { storage, raw } = demoStorage();
    storage.failOnRead = failure === 'storage';
    const locks: FinanceLockManager = { async request() { throw new Error('Lock denied'); } };
    const result = await initializeFinanceStorage(createFinanceStorageController(storage, locks));
    assert.equal(result.status, 'error');
    assert.equal(storage.values.get(FINANCE_STORAGE_KEY), raw);
    assert.deepEqual(storage.writes, []);
  }
});
