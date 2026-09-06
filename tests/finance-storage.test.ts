import assert from 'node:assert/strict';
import test from 'node:test';

import { createEmptyData as createLegacyData } from '../app/finance-domain.ts';
import {
  FINANCE_STORAGE_KEY,
  LEGACY_FINANCE_STORAGE_KEY,
  createEmptyData,
  serializeFinanceData,
  type FinanceData,
} from '../app/finance-v4.ts';
import {
  FINANCE_STORAGE_LOCK,
  LEGACY_FINANCE_BACKUP_KEY,
  commitFinanceData,
  createFinanceStorageController,
  loadFinanceStorage,
  type FinanceLockManager,
} from '../app/finance-storage.ts';

const reference = new Date('2026-09-06T12:00:00+07:00');

class MemoryStorage {
  values = new Map<string, string>();
  writes: string[] = [];
  failOnWrite?: string;
  failOnRead = false;
  afterWrite?: (key: string) => void;
  getItem(key: string) {
    if (this.failOnRead) throw new Error('Storage is disabled');
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failOnWrite === key) throw new Error('Quota exceeded');
    this.values.set(key, value);
    this.writes.push(key);
    this.afterWrite?.(key);
  }
}

class SerialLocks implements FinanceLockManager {
  private tail: Promise<unknown> = Promise.resolve();
  names: string[] = [];
  request<T>(name: string, callback: () => T | Promise<T>): Promise<T> {
    this.names.push(name);
    const result = this.tail.then(callback);
    this.tail = result.catch(() => undefined);
    return result;
  }
}

function seededStorage() {
  const storage = new MemoryStorage();
  const data = createEmptyData(1_000_000, reference);
  storage.values.set(FINANCE_STORAGE_KEY, serializeFinanceData(data));
  return { storage, data };
}

test('reading missing or legacy data makes no writes, and successful migration backs up exact bytes first', async () => {
  const storage = new MemoryStorage();
  assert.equal(loadFinanceStorage(storage).status, 'missing');
  const raw = JSON.stringify(createLegacyData(7_000_000, reference), null, 2);
  storage.values.set(LEGACY_FINANCE_STORAGE_KEY, raw);
  const controller = createFinanceStorageController(storage, null);
  const loaded = controller.load();
  assert.equal(loaded.status, 'ok');
  if (loaded.status !== 'ok') return;
  assert.equal(loaded.source, 'legacy');
  assert.equal(loaded.migrated, true);
  assert.deepEqual(storage.writes, []);

  const result = await controller.commit(loaded.data, loaded.data.revision);
  assert.equal(result.status, 'saved');
  if (result.status !== 'saved') return;
  assert.equal(result.data.revision, 1);
  assert.deepEqual(storage.writes, [LEGACY_FINANCE_BACKUP_KEY, FINANCE_STORAGE_KEY]);
  assert.equal(storage.getItem(LEGACY_FINANCE_STORAGE_KEY), raw);
  assert.equal(storage.getItem(LEGACY_FINANCE_BACKUP_KEY), raw);
  assert.equal(controller.load().status, 'ok');

  await controller.commit({ ...result.data, mode: 'personal' }, result.data.revision);
  assert.equal(storage.writes.filter((key) => key === LEGACY_FINANCE_BACKUP_KEY).length, 1);
  assert.equal(storage.getItem(LEGACY_FINANCE_STORAGE_KEY), raw);
});

test('invalid and newer stored payloads stay read-only even when a usable legacy ledger exists', async () => {
  for (const raw of ['', '  ', '{invalid', JSON.stringify({ version: 99 })]) {
    const storage = new MemoryStorage();
    storage.values.set(FINANCE_STORAGE_KEY, raw);
    storage.values.set(LEGACY_FINANCE_STORAGE_KEY, JSON.stringify(createLegacyData(123, reference)));
    const result = loadFinanceStorage(storage);
    assert.equal(result.status, raw.includes('99') ? 'future' : 'corrupt');
    const save = await commitFinanceData(createEmptyData(0, reference), 0, storage, { locks: null });
    assert.equal(save.status, 'blocked');
    assert.equal(storage.getItem(FINANCE_STORAGE_KEY), raw);
    assert.deepEqual(storage.writes, []);
  }
});

test('storage errors are reported and never treated as an empty ledger', async () => {
  const { storage, data } = seededStorage();
  storage.failOnRead = true;
  assert.equal(loadFinanceStorage(storage).status, 'error');
  const result = await commitFinanceData(data, 0, storage, { locks: null });
  assert.equal(result.status, 'error');
  assert.deepEqual(storage.writes, []);
});

test('migration fails safely if exact raw backup cannot be written or already represents different data', async () => {
  for (const mode of ['quota', 'different-backup'] as const) {
    const storage = new MemoryStorage();
    const raw = JSON.stringify(createLegacyData(7_000_000, reference));
    storage.values.set(LEGACY_FINANCE_STORAGE_KEY, raw);
    if (mode === 'quota') storage.failOnWrite = LEGACY_FINANCE_BACKUP_KEY;
    else storage.values.set(LEGACY_FINANCE_BACKUP_KEY, 'original older backup');
    const controller = createFinanceStorageController(storage, null);
    const loaded = controller.load();
    assert.equal(loaded.status, 'ok');
    if (loaded.status !== 'ok') return;
    const result = await controller.commit(loaded.data, 0);
    assert.equal(result.status, mode === 'quota' ? 'error' : 'blocked');
    assert.equal(storage.getItem(FINANCE_STORAGE_KEY), null);
    assert.equal(storage.getItem(LEGACY_FINANCE_STORAGE_KEY), raw);
    if (mode === 'different-backup') assert.equal(storage.getItem(LEGACY_FINANCE_BACKUP_KEY), 'original older backup');
  }
});

test('a failed V4 write leaves the original and its backup intact and does not advance observed revision', async () => {
  const storage = new MemoryStorage();
  const raw = JSON.stringify(createLegacyData(7_000_000, reference));
  storage.values.set(LEGACY_FINANCE_STORAGE_KEY, raw);
  storage.failOnWrite = FINANCE_STORAGE_KEY;
  const controller = createFinanceStorageController(storage, null);
  const loaded = controller.load();
  if (loaded.status !== 'ok') return assert.fail('Expected legacy data');
  assert.equal((await controller.commit(loaded.data, 0)).status, 'error');
  assert.equal(storage.getItem(LEGACY_FINANCE_STORAGE_KEY), raw);
  assert.equal(storage.getItem(LEGACY_FINANCE_BACKUP_KEY), raw);
  storage.failOnWrite = undefined;
  const retried = await controller.commit(loaded.data, 0);
  assert.equal(retried.status, 'saved');
  if (retried.status === 'saved') assert.equal(retried.data.revision, 1);
});

test('two tabs saving the same revision under Web Locks preserve only the winning update', async () => {
  const { storage, data } = seededStorage();
  const locks = new SerialLocks();
  const first = createFinanceStorageController(storage, locks);
  const second = createFinanceStorageController(storage, locks);
  first.load();
  second.load();
  const [a, b] = await Promise.all([
    first.commit({ ...data, mode: 'personal' }, 0),
    second.commit({ ...data, mode: 'demo' }, 0),
  ]);
  assert.equal(a.status, 'saved');
  assert.equal(b.status, 'conflict');
  assert.equal(a.protection, 'web-locks');
  assert.deepEqual(locks.names, [FINANCE_STORAGE_LOCK, FINANCE_STORAGE_LOCK]);
  assert.equal(storage.writes.length, 1);
  const persisted = loadFinanceStorage(storage);
  if (persisted.status !== 'ok') return assert.fail('Winning data must be readable');
  assert.equal(persisted.data.mode, 'personal');
  assert.equal(persisted.data.revision, 1);
});

test('raw snapshots catch replacement with the same revision, deletion, and legacy edits before migration', async () => {
  for (const change of ['same-revision', 'removed', 'legacy'] as const) {
    const { storage, data } = seededStorage();
    if (change === 'legacy') {
      storage.values.delete(FINANCE_STORAGE_KEY);
      storage.values.set(LEGACY_FINANCE_STORAGE_KEY, JSON.stringify(createLegacyData(1_000, reference)));
    }
    const controller = createFinanceStorageController(storage, null);
    const loaded = controller.load();
    if (loaded.status !== 'ok') return assert.fail('Expected original data');
    if (change === 'same-revision') storage.values.set(FINANCE_STORAGE_KEY, serializeFinanceData({ ...data, mode: 'demo' }));
    else if (change === 'removed') storage.values.delete(FINANCE_STORAGE_KEY);
    else storage.values.set(LEGACY_FINANCE_STORAGE_KEY, JSON.stringify(createLegacyData(2_000, reference)));
    const result = await controller.commit(loaded.data, loaded.data.revision);
    assert.equal(result.status, 'conflict', change);
    assert.equal(result.protection, 'revision-check');
    assert.deepEqual(storage.writes, []);
  }
});

test('newer or corrupt data arriving after hydration blocks saving the previous valid snapshot', async () => {
  for (const incoming of ['{broken', JSON.stringify({ version: 42 })]) {
    const { storage, data } = seededStorage();
    const controller = createFinanceStorageController(storage, new SerialLocks());
    controller.load();
    storage.values.set(FINANCE_STORAGE_KEY, incoming);
    assert.equal((await controller.commit(data, 0)).status, 'blocked');
    assert.equal(storage.getItem(FINANCE_STORAGE_KEY), incoming);
    assert.deepEqual(storage.writes, []);
    assert.ok(['corrupt', 'future'].includes(controller.load().status));
    assert.equal((await controller.commit(data, 0)).status, 'blocked');
  }
});

test('failed lock acquisition never silently falls back to localStorage writes', async () => {
  const { storage, data } = seededStorage();
  const locks: FinanceLockManager = { async request() { throw new Error('Lock denied'); } };
  const controller = createFinanceStorageController(storage, locks);
  controller.load();
  const result = await controller.commit(data, 0);
  assert.equal(result.status, 'error');
  assert.equal(result.protection, 'web-locks');
  assert.deepEqual(storage.writes, []);
});

test('invalid candidates and unsafe revisions cannot replace valid personal data', async () => {
  const { storage, data } = seededStorage();
  const original = storage.getItem(FINANCE_STORAGE_KEY);
  const invalid = { ...data, accounts: [] } as FinanceData;
  assert.equal((await commitFinanceData(invalid, 0, storage, { locks: null })).status, 'blocked');
  for (const revision of [-1, 0.1, Number.MAX_SAFE_INTEGER, Number.POSITIVE_INFINITY]) {
    assert.equal((await commitFinanceData(data, revision, storage, { locks: null })).status, 'blocked');
  }
  assert.equal(storage.getItem(FINANCE_STORAGE_KEY), original);
  assert.deepEqual(storage.writes, []);
});

test('a controller must load before creating data and advances revisions only on successful saves', async () => {
  const storage = new MemoryStorage();
  const data = createEmptyData(0, reference);
  const controller = createFinanceStorageController(storage, null);
  assert.equal((await controller.commit(data, 0)).status, 'blocked');
  assert.equal(controller.load().status, 'missing');
  const first = await controller.commit(data, 0);
  assert.equal(first.status, 'saved');
  if (first.status !== 'saved') return;
  const second = await controller.commit({ ...first.data, revision: 1000 }, first.data.revision);
  assert.equal(second.status, 'saved');
  if (second.status === 'saved') assert.equal(second.data.revision, 2);
});

test('fallback detects an observed competing write after setItem and reports conflict', async () => {
  const { storage, data } = seededStorage();
  const replacement = serializeFinanceData({ ...data, revision: 2, mode: 'demo' });
  storage.afterWrite = (key) => {
    if (key === FINANCE_STORAGE_KEY) storage.values.set(key, replacement);
  };
  const result = await commitFinanceData(data, 0, storage, { locks: null });
  assert.equal(result.status, 'conflict');
  assert.equal(result.protection, 'revision-check');
  assert.equal(storage.getItem(FINANCE_STORAGE_KEY), replacement);
});

test('an old tab changing legacy data during backup prevents migration from silently discarding that edit', async () => {
  const storage = new MemoryStorage();
  const original = JSON.stringify(createLegacyData(1_000_000, reference));
  const updated = JSON.stringify(createLegacyData(2_000_000, reference));
  storage.values.set(LEGACY_FINANCE_STORAGE_KEY, original);
  const controller = createFinanceStorageController(storage, new SerialLocks());
  const loaded = controller.load();
  if (loaded.status !== 'ok') return assert.fail('Expected legacy ledger');
  storage.afterWrite = (key) => {
    if (key === LEGACY_FINANCE_BACKUP_KEY) storage.values.set(LEGACY_FINANCE_STORAGE_KEY, updated);
  };
  assert.equal((await controller.commit(loaded.data, 0)).status, 'conflict');
  assert.equal(storage.getItem(FINANCE_STORAGE_KEY), null);
  assert.equal(storage.getItem(LEGACY_FINANCE_STORAGE_KEY), updated);
  assert.equal(storage.getItem(LEGACY_FINANCE_BACKUP_KEY), original);
});

test('a V4 ledger arriving during migration keeps priority over the legacy migration candidate', async () => {
  const storage = new MemoryStorage();
  storage.values.set(LEGACY_FINANCE_STORAGE_KEY, JSON.stringify(createLegacyData(1_000_000, reference)));
  const replacement = serializeFinanceData({ ...createEmptyData(3_000_000, reference), revision: 1 });
  const controller = createFinanceStorageController(storage, null);
  const loaded = controller.load();
  if (loaded.status !== 'ok') return assert.fail('Expected legacy ledger');
  storage.afterWrite = (key) => {
    if (key === LEGACY_FINANCE_BACKUP_KEY) storage.values.set(FINANCE_STORAGE_KEY, replacement);
  };
  assert.equal((await controller.commit(loaded.data, 0)).status, 'conflict');
  assert.equal(storage.getItem(FINANCE_STORAGE_KEY), replacement);
  assert.equal(storage.writes.includes(FINANCE_STORAGE_KEY), false);
});

test('after migration an old app can change only its legacy key and cannot replace the V4 ledger or immutable backup', async () => {
  const storage = new MemoryStorage();
  const original = JSON.stringify(createLegacyData(1_000_000, reference));
  storage.values.set(LEGACY_FINANCE_STORAGE_KEY, original);
  const controller = createFinanceStorageController(storage, null);
  const loaded = controller.load();
  if (loaded.status !== 'ok') return assert.fail('Expected legacy ledger');
  const saved = await controller.commit(loaded.data, 0);
  if (saved.status !== 'saved') return assert.fail('Expected migration');
  const payload = storage.getItem(FINANCE_STORAGE_KEY);
  storage.values.set(LEGACY_FINANCE_STORAGE_KEY, JSON.stringify(createLegacyData(9_000_000, reference)));
  const reloaded = controller.load();
  assert.equal(reloaded.status, 'ok');
  if (reloaded.status === 'ok') {
    assert.equal(reloaded.source, 'v4');
    assert.equal(reloaded.migrated, false);
    assert.deepEqual(reloaded.data, saved.data);
  }
  assert.equal(storage.getItem(FINANCE_STORAGE_KEY), payload);
  assert.equal(storage.getItem(LEGACY_FINANCE_BACKUP_KEY), original);
});
