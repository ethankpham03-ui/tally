import {
  FINANCE_STORAGE_KEY,
  LEGACY_FINANCE_STORAGE_KEY,
  parseFinanceData,
  serializeFinanceData,
  validateFinanceData,
  type FinanceData,
} from './finance-v4.ts';

export const LEGACY_FINANCE_BACKUP_KEY = 'tally-finance-v1-backup-before-v4';
export const FINANCE_STORAGE_LOCK = 'tally-finance-v4-write';

export type FinanceStorageAdapter = Pick<Storage, 'getItem' | 'setItem'>;
export type FinanceLockManager = {
  request<T>(name: string, callback: () => T | Promise<T>): Promise<T>;
};
export type FinanceWriteProtection = 'web-locks' | 'revision-check';
export type FinanceStorageSnapshot = { raw: string | null; legacyRaw: string | null };

export type FinanceStorageLoadResult =
  | { status: 'ok'; data: FinanceData; source: 'v4' | 'legacy'; migrated: boolean; snapshot: FinanceStorageSnapshot }
  | { status: 'missing'; snapshot: FinanceStorageSnapshot }
  | { status: 'corrupt'; reason: string; issues: string[]; snapshot: FinanceStorageSnapshot }
  | { status: 'future'; version: number; reason: string; snapshot: FinanceStorageSnapshot }
  | { status: 'error'; reason: string };

export type FinanceStorageCommitResult = (
  | { status: 'saved'; data: FinanceData; snapshot: FinanceStorageSnapshot }
  | { status: 'conflict'; reason: string; data?: FinanceData }
  | { status: 'blocked'; reason: string }
  | { status: 'error'; reason: string }
) & { protection: FinanceWriteProtection };

function resolveStorage(storage?: FinanceStorageAdapter): FinanceStorageAdapter {
  if (storage) return storage;
  if (typeof window === 'undefined') throw new Error('Local storage is unavailable.');
  return window.localStorage;
}

function browserLocks(): FinanceLockManager | null {
  if (typeof navigator === 'undefined' || !navigator.locks) return null;
  return {
    async request<T>(name: string, callback: () => T | Promise<T>): Promise<T> {
      return await navigator.locks.request(name, () => callback());
    },
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Local storage could not be accessed.';
}

/** Reads are deliberately side-effect free. Invalid existing data is never replaced with demo data. */
export function loadFinanceStorage(storage?: FinanceStorageAdapter): FinanceStorageLoadResult {
  try {
    const adapter = resolveStorage(storage);
    const raw = adapter.getItem(FINANCE_STORAGE_KEY);
    const legacyRaw = raw === null ? adapter.getItem(LEGACY_FINANCE_STORAGE_KEY) : null;
    const snapshot = { raw, legacyRaw };
    const source = raw === null ? 'legacy' : 'v4';
    const payload = raw ?? legacyRaw;
    if (payload === null) return { status: 'missing', snapshot };
    // Empty/whitespace stored values are damaged payloads, not permission to initialize a new ledger.
    if (!payload.trim()) return { status: 'corrupt', reason: 'The saved ledger is empty.', issues: ['Empty saved payload'], snapshot };
    const parsed = parseFinanceData(payload);
    if (parsed.status === 'ok') {
      return { status: 'ok', data: parsed.data, source, migrated: source === 'legacy' || !!parsed.migrated, snapshot };
    }
    if (parsed.status === 'future-version') {
      return { status: 'future', version: parsed.version, reason: 'This ledger was saved by a newer version of Tally.', snapshot };
    }
    return {
      status: 'corrupt', reason: 'The saved ledger could not be validated.',
      issues: parsed.status === 'corrupt' ? parsed.issues : ['Invalid saved payload'], snapshot,
    };
  } catch (error) {
    return { status: 'error', reason: errorMessage(error) };
  }
}

function snapshotsEqual(a: FinanceStorageSnapshot, b: FinanceStorageSnapshot): boolean {
  return a.raw === b.raw && a.legacyRaw === b.legacyRaw;
}

export type FinanceCommitOptions = {
  /** null explicitly selects the fallback (useful in tests and browsers without Web Locks). */
  locks?: FinanceLockManager | null;
  expectedSnapshot?: FinanceStorageSnapshot;
};

/**
 * Compare-and-set under an origin-wide Web Lock. Without Web Locks the synchronous
 * revision/raw checks are best effort: localStorage has no cross-tab atomic CAS.
 * The result exposes this limitation so the UI can disclose it.
 */
export async function commitFinanceData(
  next: FinanceData,
  expectedRevision: number,
  storage?: FinanceStorageAdapter,
  options: FinanceCommitOptions = {},
): Promise<FinanceStorageCommitResult> {
  const locks = options.locks === undefined ? browserLocks() : options.locks;
  const protection: FinanceWriteProtection = locks ? 'web-locks' : 'revision-check';
  const commit = (): FinanceStorageCommitResult => {
    try {
      const adapter = resolveStorage(storage);
      const current = loadFinanceStorage(adapter);
      if (current.status === 'error') return { status: 'error', reason: current.reason, protection };
      if (current.status === 'corrupt' || current.status === 'future') return { status: 'blocked', reason: current.reason, protection };
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || expectedRevision >= Number.MAX_SAFE_INTEGER) {
        return { status: 'blocked', reason: 'The ledger revision is invalid.', protection };
      }
      const currentRevision = current.status === 'ok' ? current.data.revision : 0;
      if (currentRevision !== expectedRevision || (options.expectedSnapshot && !snapshotsEqual(current.snapshot, options.expectedSnapshot))) {
        return { status: 'conflict', reason: 'The ledger changed in another tab. Reload before saving.', ...(current.status === 'ok' ? { data: current.data } : {}), protection };
      }
      const candidate = { ...next, revision: expectedRevision + 1 };
      const validated = validateFinanceData(candidate);
      if (!validated.valid) return { status: 'blocked', reason: validated.issues.join('; '), protection };
      const payload = serializeFinanceData(validated.data);

      // Keep the exact bytes before migration, including fields normalized by a legacy parser.
      if (current.status === 'ok' && current.source === 'legacy' && current.snapshot.legacyRaw !== null) {
        const existingBackup = adapter.getItem(LEGACY_FINANCE_BACKUP_KEY);
        if (existingBackup !== null && existingBackup !== current.snapshot.legacyRaw) {
          return { status: 'blocked', reason: 'A different legacy backup already exists. Export both ledgers before replacing data.', protection };
        }
        if (existingBackup === null) adapter.setItem(LEGACY_FINANCE_BACKUP_KEY, current.snapshot.legacyRaw);
        if (adapter.getItem(LEGACY_FINANCE_BACKUP_KEY) !== current.snapshot.legacyRaw) {
          return { status: 'error', reason: 'The original ledger backup could not be verified.', protection };
        }
      }

      // An older tab may still update the legacy key without participating in Web Locks.
      const beforeWrite = loadFinanceStorage(adapter);
      if (beforeWrite.status === 'error') return { status: 'error', reason: beforeWrite.reason, protection };
      if (!snapshotsEqual(current.snapshot, beforeWrite.snapshot)) {
        return { status: 'conflict', reason: 'The ledger changed while saving. Reload before trying again.', ...(beforeWrite.status === 'ok' ? { data: beforeWrite.data } : {}), protection };
      }
      adapter.setItem(FINANCE_STORAGE_KEY, payload);
      if (adapter.getItem(FINANCE_STORAGE_KEY) !== payload) {
        return { status: 'conflict', reason: 'Another tab replaced this save. Reload to see the latest ledger.', protection };
      }
      return { status: 'saved', data: validated.data, snapshot: { raw: payload, legacyRaw: null }, protection };
    } catch (error) {
      return { status: 'error', reason: errorMessage(error), protection };
    }
  };
  try {
    return locks ? await locks.request(FINANCE_STORAGE_LOCK, commit) : commit();
  } catch (error) {
    // A failed lock request must not silently fall back to an unprotected write.
    return { status: 'error', reason: errorMessage(error), protection };
  }
}

export type FinanceStorageController = {
  readonly protection: FinanceWriteProtection;
  load(): FinanceStorageLoadResult;
  commit(next: FinanceData, expectedRevision: number): Promise<FinanceStorageCommitResult>;
};

export function createFinanceStorageController(
  storage?: FinanceStorageAdapter,
  locks: FinanceLockManager | null = browserLocks(),
): FinanceStorageController {
  let observed: FinanceStorageLoadResult | undefined;
  const protection: FinanceWriteProtection = locks ? 'web-locks' : 'revision-check';
  return {
    protection,
    load() {
      observed = loadFinanceStorage(storage);
      return observed;
    },
    async commit(next, expectedRevision) {
      if (!observed || (observed.status !== 'ok' && observed.status !== 'missing')) {
        return { status: 'blocked', reason: 'Load a valid ledger before saving.', protection };
      }
      const result = await commitFinanceData(next, expectedRevision, storage, { locks, expectedSnapshot: observed.snapshot });
      if (result.status === 'saved') {
        observed = { status: 'ok', data: result.data, source: 'v4', migrated: false, snapshot: result.snapshot };
      }
      return result;
    },
  };
}
