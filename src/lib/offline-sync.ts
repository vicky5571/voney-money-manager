import { createTransaction, createTransfer } from '@/app/actions/transactions';
import { useAppStore } from '@/lib/store/use-app-store';
import { generateUuid, getMonthKeyFromDateString } from '@/lib/utils';

export interface OfflineTransactionItem {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category_id: string;
  account_id: string;
  transaction_date: string;
  note?: string;
  is_settled?: boolean;
  created_at_local: string;
  retry_count?: number;
  last_error?: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  account_name?: string;
}

export interface OfflineTransferItem {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  transaction_date: string;
  note?: string;
  created_at_local: string;
  retry_count?: number;
  last_error?: string;
  from_account_name?: string;
  to_account_name?: string;
}

export interface DeadLetterItem {
  id: string;
  kind: 'transaction' | 'transfer';
  item: OfflineTransactionItem | OfflineTransferItem;
  failed_at: string;
  error: string;
  retry_count: number;
}

const TX_QUEUE_KEY = 'voney_offline_transactions_queue';
const TRANSFER_QUEUE_KEY = 'voney_offline_transfers_queue';
const DEAD_LETTER_QUEUE_KEY = 'voney_offline_dead_letter_queue';
const MAX_QUEUE_SIZE = 50;
const MAX_NOTE_LEN = 200;
export const MAX_RETRY_COUNT = 3;

function isValidUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function isValidOfflineTx(item: unknown): item is OfflineTransactionItem {
  if (!item || typeof item !== 'object') return false;
  const o = item as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    (o.type === 'income' || o.type === 'expense') &&
    typeof o.amount === 'number' &&
    Number.isFinite(o.amount) &&
    o.amount > 0 &&
    o.amount <= 1e12 &&
    typeof o.category_id === 'string' &&
    isValidUuid(o.category_id) &&
    typeof o.account_id === 'string' &&
    isValidUuid(o.account_id) &&
    typeof o.transaction_date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(o.transaction_date) &&
    (o.note === undefined || (typeof o.note === 'string' && o.note.length <= MAX_NOTE_LEN)) &&
    (o.is_settled === undefined || typeof o.is_settled === 'boolean') &&
    (o.retry_count === undefined || typeof o.retry_count === 'number') &&
    (o.last_error === undefined || typeof o.last_error === 'string')
  );
}

function isValidOfflineTransfer(item: unknown): item is OfflineTransferItem {
  if (!item || typeof item !== 'object') return false;
  const o = item as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.from_account_id === 'string' &&
    isValidUuid(o.from_account_id) &&
    typeof o.to_account_id === 'string' &&
    isValidUuid(o.to_account_id) &&
    o.from_account_id !== o.to_account_id &&
    typeof o.amount === 'number' &&
    Number.isFinite(o.amount) &&
    o.amount > 0 &&
    o.amount <= 1e12 &&
    typeof o.transaction_date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(o.transaction_date) &&
    (o.note === undefined || (typeof o.note === 'string' && o.note.length <= MAX_NOTE_LEN)) &&
    (o.retry_count === undefined || typeof o.retry_count === 'number') &&
    (o.last_error === undefined || typeof o.last_error === 'string')
  );
}

export function getOfflineTxQueue(): OfflineTransactionItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TX_QUEUE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidOfflineTx).slice(0, MAX_QUEUE_SIZE);
  } catch {
    return [];
  }
}

export function getOfflineTransferQueue(): OfflineTransferItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TRANSFER_QUEUE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidOfflineTransfer).slice(0, MAX_QUEUE_SIZE);
  } catch {
    return [];
  }
}

let cachedOfflineCount: number | null = null;
let offlineListenersAttached = false;

function attachOfflineListeners() {
  if (offlineListenersAttached || typeof window === "undefined") return;
  offlineListenersAttached = true;
  const invalidate = () => { cachedOfflineCount = null; };
  window.addEventListener("voney:offline-queue-updated", invalidate);
  window.addEventListener("voney:offline-synced", invalidate);
  window.addEventListener("storage", (e) => {
    if (e.key === TX_QUEUE_KEY || e.key === TRANSFER_QUEUE_KEY) cachedOfflineCount = null;
  });
}

export function getOfflineQueueCount(): number {
  if (cachedOfflineCount !== null) return cachedOfflineCount;
  if (typeof window === "undefined") return 0;
  attachOfflineListeners();
  try {
    const rawTx = localStorage.getItem(TX_QUEUE_KEY);
    const rawTr = localStorage.getItem(TRANSFER_QUEUE_KEY);
    if (!rawTx && !rawTr) {
      cachedOfflineCount = 0;
      return 0;
    }
    const count = getOfflineTxQueue().length + getOfflineTransferQueue().length;
    cachedOfflineCount = count;
    return count;
  } catch {
    return 0;
  }
}

function invalidateOfflineCache() {
  cachedOfflineCount = null;
}

export function saveOfflineTransaction(
  item: Omit<OfflineTransactionItem, 'id' | 'created_at_local'> & { id?: string }
): OfflineTransactionItem {
  if (!isValidUuid(item.category_id) || !isValidUuid(item.account_id)) throw new Error('Invalid ID format');
  if (!Number.isFinite(item.amount) || item.amount <= 0 || item.amount > 1e12) throw new Error('Invalid amount');
  if (item.note && item.note.length > MAX_NOTE_LEN) throw new Error('Note too long');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.transaction_date)) throw new Error('Invalid date');

  const newItem: OfflineTransactionItem = {
    ...item,
    is_settled: item.is_settled !== undefined ? item.is_settled : true,
    note: item.note?.slice(0, MAX_NOTE_LEN),
    id: item.id && isValidUuid(item.id) ? item.id : generateUuid(),
    created_at_local: new Date().toISOString(),
  };

  const queue = getOfflineTxQueue();
  if (queue.length >= MAX_QUEUE_SIZE) throw new Error('Offline queue full (50 max) - sync or clear first');
  queue.push(newItem);
  localStorage.setItem(TX_QUEUE_KEY, JSON.stringify(queue));
  invalidateOfflineCache();
  window.dispatchEvent(new CustomEvent('voney:offline-queue-updated'));
  return newItem;
}

export function saveOfflineTransfer(
  item: Omit<OfflineTransferItem, 'id' | 'created_at_local'> & { id?: string }
): OfflineTransferItem {
  if (!isValidUuid(item.from_account_id) || !isValidUuid(item.to_account_id)) throw new Error('Invalid ID format');
  if (item.from_account_id === item.to_account_id) throw new Error('Source/dest must differ');
  if (!Number.isFinite(item.amount) || item.amount <= 0 || item.amount > 1e12) throw new Error('Invalid amount');
  if (item.note && item.note.length > MAX_NOTE_LEN) throw new Error('Note too long');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.transaction_date)) throw new Error('Invalid date');

  const newItem: OfflineTransferItem = {
    ...item,
    note: item.note?.slice(0, MAX_NOTE_LEN),
    id: item.id || `offline_tr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at_local: new Date().toISOString(),
  };

  const queue = getOfflineTransferQueue();
  if (queue.length >= MAX_QUEUE_SIZE) throw new Error('Offline queue full (50 max)');
  queue.push(newItem);
  localStorage.setItem(TRANSFER_QUEUE_KEY, JSON.stringify(queue));
  invalidateOfflineCache();
  window.dispatchEvent(new CustomEvent('voney:offline-queue-updated'));
  return newItem;
}

export function removeOfflineTx(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getOfflineTxQueue();
    const filtered = current.filter((item) => item.id !== id);
    localStorage.setItem(TX_QUEUE_KEY, JSON.stringify(filtered));
    invalidateOfflineCache();
    window.dispatchEvent(new CustomEvent('voney:offline-queue-updated'));
  } catch (err) {
    console.error('Failed to remove tx from offline queue:', err);
  }
}

export function removeOfflineTransfer(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getOfflineTransferQueue();
    const rootId = id.replace(/_(out|in)$/, '');
    const filtered = current.filter((item) => item.id !== rootId && item.id !== id);
    localStorage.setItem(TRANSFER_QUEUE_KEY, JSON.stringify(filtered));
    invalidateOfflineCache();
    window.dispatchEvent(new CustomEvent('voney:offline-queue-updated'));
  } catch (err) {
    console.error('Failed to remove transfer from offline queue:', err);
  }
}

/**
 * Rehydrates pending transactions and transfers from localStorage offline queues into Zustand txCache.
 * Ensures offline transactions remain visible in the UI after browser reload or tab restart.
 */
export function rehydrateOfflineQueueIntoStore(): void {
  if (typeof window === 'undefined') return;
  try {
    const txQueue = getOfflineTxQueue();
    const trQueue = getOfflineTransferQueue();
    if (txQueue.length > 0 || trQueue.length > 0) {
      useAppStore.getState().rehydrateOfflineQueue(txQueue, trQueue);
    }
  } catch (err) {
    console.error('Failed to rehydrate offline queue into store:', err);
  }
}

/** Check if an error is permanent (un-syncable) vs transient network drop */
export function isPermanentError(message: string): boolean {
  if (!message || typeof message !== 'string') return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('account not found') ||
    lower.includes('category not found') ||
    lower.includes('not authenticated') ||
    lower.includes('unauthorized') ||
    lower.includes('invalid input') ||
    lower.includes('foreign key') ||
    lower.includes('violates foreign key') ||
    lower.includes('23503') ||
    lower.includes('invalid id format') ||
    lower.includes('source and destination accounts must be different') ||
    lower.includes('amount must be greater than 0')
  );
}

export function getDeadLetterQueue(): DeadLetterItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DEAD_LETTER_QUEUE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 50);
  } catch {
    return [];
  }
}

export function getDeadLetterCount(): number {
  return getDeadLetterQueue().length;
}

export function saveToDeadLetterQueue(deadItem: DeadLetterItem) {
  if (typeof window === 'undefined') return;
  try {
    const queue = getDeadLetterQueue();
    const updated = [deadItem, ...queue.filter((d) => d.id !== deadItem.id)].slice(0, 50);
    localStorage.setItem(DEAD_LETTER_QUEUE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('voney:dead-letter-updated', { detail: { count: updated.length } }));
  } catch (err) {
    console.error('Failed to save to dead-letter queue:', err);
  }
}

export function dismissDeadLetterItem(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const queue = getDeadLetterQueue();
    const updated = queue.filter((d) => d.id !== id);
    localStorage.setItem(DEAD_LETTER_QUEUE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('voney:dead-letter-updated', { detail: { count: updated.length } }));
  } catch (err) {
    console.error('Failed to dismiss dead-letter item:', err);
  }
}

export function clearDeadLetterQueue() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DEAD_LETTER_QUEUE_KEY);
    window.dispatchEvent(new CustomEvent('voney:dead-letter-updated', { detail: { count: 0 } }));
  } catch (err) {
    console.error('Failed to clear dead-letter queue:', err);
  }
}

function updateOfflineTxRetry(id: string, retryCount: number, errorMsg: string) {
  try {
    const current = getOfflineTxQueue();
    const updated = current.map((item) =>
      item.id === id ? { ...item, retry_count: retryCount, last_error: errorMsg } : item
    );
    localStorage.setItem(TX_QUEUE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to update tx retry count:', err);
  }
}

function updateOfflineTransferRetry(id: string, retryCount: number, errorMsg: string) {
  try {
    const current = getOfflineTransferQueue();
    const updated = current.map((item) =>
      item.id === id ? { ...item, retry_count: retryCount, last_error: errorMsg } : item
    );
    localStorage.setItem(TRANSFER_QUEUE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to update transfer retry count:', err);
  }
}

let activeSyncPromise: Promise<{ syncedCount: number; errors: string[] }> | null = null;

export async function syncOfflineQueue(): Promise<{ syncedCount: number; errors: string[] }> {
  if (typeof window === 'undefined') return { syncedCount: 0, errors: [] };
  if (!navigator.onLine) return { syncedCount: 0, errors: ['Device is offline'] };

  // Mutex lock: If sync is already running, reuse the in-flight Promise to prevent duplicate sync executions
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = (async () => {
    let syncedCount = 0;
    const errors: string[] = [];

    try {
      const txQueue = getOfflineTxQueue();
      const transferQueue = getOfflineTransferQueue();
      if (txQueue.length === 0 && transferQueue.length === 0) {
        return { syncedCount: 0, errors: [] };
      }

      for (const tx of txQueue) {
        try {
          const res = await createTransaction({
            id: isValidUuid(tx.id) ? tx.id : undefined,
            type: tx.type,
            amount: tx.amount,
            category_id: tx.category_id,
            account_id: tx.account_id,
            transaction_date: tx.transaction_date,
            note: tx.note || undefined,
            is_settled: tx.is_settled,
          });
          // Mark store item as synced
          useAppStore.getState().markTransactionSynced(tx.id, res?.id);
          // Remove immediately from queue upon success so intermediate failures/reloads don't duplicate it
          removeOfflineTx(tx.id);
          syncedCount++;
        } catch (err) {
          // If connection dropped during sync, break early without burning retries on remaining items
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            errors.push('Network connection lost during sync');
            break;
          }

          const errorMsg = err instanceof Error ? err.message : 'Failed to sync transaction';
          const nextRetryCount = (tx.retry_count ?? 0) + 1;
          const permanent = isPermanentError(errorMsg) || nextRetryCount >= MAX_RETRY_COUNT;

          if (permanent) {
            // Poison pill detected: Quarantine un-syncable item to avoid blocking the queue forever
            removeOfflineTx(tx.id);
            saveToDeadLetterQueue({
              id: tx.id,
              kind: 'transaction',
              item: { ...tx, retry_count: nextRetryCount, last_error: errorMsg },
              failed_at: new Date().toISOString(),
              error: errorMsg,
              retry_count: nextRetryCount,
            });

            // Revert optimistic store mutation so ghost pending items don't remain in UI
            try {
              const monthKey = getMonthKeyFromDateString(tx.transaction_date);
              useAppStore.getState().optimisticDeleteTransaction(tx.id, monthKey);
            } catch {
              // Ignore store revert failure
            }

            errors.push(`Quarantined un-syncable transaction (${errorMsg})`);
          } else {
            // Transient error: increment retry count and retain in queue for next sync pass
            updateOfflineTxRetry(tx.id, nextRetryCount, errorMsg);
            errors.push(errorMsg);
          }
        }
      }

      for (const tr of transferQueue) {
        try {
          await createTransfer({
            id: tr.id,
            from_account_id: tr.from_account_id,
            to_account_id: tr.to_account_id,
            amount: tr.amount,
            transaction_date: tr.transaction_date,
            note: tr.note || undefined,
          });
          useAppStore.getState().markTransactionSynced(tr.id);
          removeOfflineTransfer(tr.id);
          syncedCount++;
        } catch (err) {
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            errors.push('Network connection lost during sync');
            break;
          }

          const errorMsg = err instanceof Error ? err.message : 'Failed to sync transfer';
          const nextRetryCount = (tr.retry_count ?? 0) + 1;
          const permanent = isPermanentError(errorMsg) || nextRetryCount >= MAX_RETRY_COUNT;

          if (permanent) {
            removeOfflineTransfer(tr.id);
            saveToDeadLetterQueue({
              id: tr.id,
              kind: 'transfer',
              item: { ...tr, retry_count: nextRetryCount, last_error: errorMsg },
              failed_at: new Date().toISOString(),
              error: errorMsg,
              retry_count: nextRetryCount,
            });

            // Revert optimistic store mutation for transfer
            try {
              const monthKey = getMonthKeyFromDateString(tr.transaction_date);
              useAppStore.getState().optimisticDeleteTransfer(tr.id, monthKey);
            } catch {
              // Ignore store revert failure
            }

            errors.push(`Quarantined un-syncable transfer (${errorMsg})`);
          } else {
            updateOfflineTransferRetry(tr.id, nextRetryCount, errorMsg);
            errors.push(errorMsg);
          }
        }
      }

      window.dispatchEvent(
        new CustomEvent('voney:offline-synced', {
          detail: { syncedCount, hasErrors: errors.length > 0, errors },
        })
      );

      return { syncedCount, errors };
    } finally {
      activeSyncPromise = null;
    }
  })();

  const result = await activeSyncPromise;

  // If new items were queued while sync was in flight, trigger a follow-up background sync
  if (typeof window !== 'undefined' && navigator.onLine && getOfflineQueueCount() > 0 && result.syncedCount > 0) {
    triggerBackgroundSync();
  }

  return result;
}

/** Non-blocking trigger for background queue synchronization */
export function triggerBackgroundSync() {
  if (typeof window === 'undefined' || !navigator.onLine || activeSyncPromise) return;
  syncOfflineQueue().catch((err) => {
    console.warn('Background sync encountered an error:', err);
  });
}
