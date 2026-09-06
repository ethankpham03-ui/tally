import { createEmptyData } from './finance-v4.ts';
import type { FinanceStorageController, FinanceStorageLoadResult } from './finance-storage.ts';

/**
 * New installations stay unwritten until the user makes an onboarding choice.
 * Only a ledger explicitly marked as demo may be replaced automatically; edits
 * made in the old demo already changed its mode to personal and remain intact.
 */
export async function initializeFinanceStorage(
  controller: FinanceStorageController,
): Promise<FinanceStorageLoadResult> {
  const loaded = controller.load();
  if (loaded.status !== 'ok' || loaded.data.mode !== 'demo') return loaded;

  const result = await controller.commit(
    { ...createEmptyData(), revision: loaded.data.revision },
    loaded.data.revision,
  );
  if (result.status !== 'saved' && result.status !== 'conflict') {
    return { status: 'error', reason: `Sample data could not be cleared. ${result.reason}` };
  }

  // A competing tab may have saved real data while cleanup waited for its lock.
  // Read that result without retrying the destructive replacement automatically.
  const latest = controller.load();
  if (latest.status === 'ok' && latest.data.mode === 'demo') {
    return { status: 'error', reason: 'Sample data changed in another tab. Retry to start with an empty ledger.' };
  }
  return latest;
}
