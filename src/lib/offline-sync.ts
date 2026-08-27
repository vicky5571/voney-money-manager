import { createTransaction, createTransfer } from '@/app/actions/transactions';

export interface OfflineTransactionItem {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category_id: string;
  account_id: string;
  transaction_date: string;
  note?: string;
  created_at_local: string;
}

export interface OfflineTransferItem {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  transaction_date: string;
  note?: string;
  created_at_local: string;
}

const TX_QUEUE_KEY = 'voney_offline_transactions_queue';
const TRANSFER_QUEUE_KEY = 'voney_offline_transfers_queue';
const MAX_QUEUE_SIZE = 50;
const MAX_NOTE_LEN = 200;

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
    (o.note === undefined || (typeof o.note === 'string' && o.note.length <= MAX_NOTE_LEN))
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
    (o.note === undefined || (typeof o.note === 'string' && o.note.length <= MAX_NOTE_LEN))
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

export function getOfflineQueueCount(): number {
  return getOfflineTxQueue().length + getOfflineTransferQueue().length;
}

export function saveOfflineTransaction(
  item: Omit<OfflineTransactionItem, 'id' | 'created_at_local'>
): OfflineTransactionItem {
  // validate before queueing
  if (!isValidUuid(item.category_id) || !isValidUuid(item.account_id)) throw new Error('Invalid ID format');
  if (!Number.isFinite(item.amount) || item.amount <= 0 || item.amount > 1e12) throw new Error('Invalid amount');
  if (item.note && item.note.length > MAX_NOTE_LEN) throw new Error('Note too long');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.transaction_date)) throw new Error('Invalid date');

  const newItem: OfflineTransactionItem = {
    ...item,
    note: item.note?.slice(0, MAX_NOTE_LEN),
    id: `offline_tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at_local: new Date().toISOString(),
  };

  const queue = getOfflineTxQueue();
  if (queue.length >= MAX_QUEUE_SIZE) throw new Error('Offline queue full (50 max) - sync or clear first');
  queue.push(newItem);
  localStorage.setItem(TX_QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent('voney:offline-queue-updated'));
  return newItem;
}

export function saveOfflineTransfer(
  item: Omit<OfflineTransferItem, 'id' | 'created_at_local'>
): OfflineTransferItem {
  if (!isValidUuid(item.from_account_id) || !isValidUuid(item.to_account_id)) throw new Error('Invalid ID format');
  if (item.from_account_id === item.to_account_id) throw new Error('Source/dest must differ');
  if (!Number.isFinite(item.amount) || item.amount <= 0 || item.amount > 1e12) throw new Error('Invalid amount');
  if (item.note && item.note.length > MAX_NOTE_LEN) throw new Error('Note too long');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.transaction_date)) throw new Error('Invalid date');

  const newItem: OfflineTransferItem = {
    ...item,
    note: item.note?.slice(0, MAX_NOTE_LEN),
    id: `offline_tr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at_local: new Date().toISOString(),
  };

  const queue = getOfflineTransferQueue();
  if (queue.length >= MAX_QUEUE_SIZE) throw new Error('Offline queue full (50 max)');
  queue.push(newItem);
  localStorage.setItem(TRANSFER_QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent('voney:offline-queue-updated'));
  return newItem;
}

export async function syncOfflineQueue(): Promise<{ syncedCount: number; errors: string[] }> {
  if (typeof window === 'undefined') return { syncedCount: 0, errors: [] };
  if (!navigator.onLine) return { syncedCount: 0, errors: ['Device is offline'] };

  const txQueue = getOfflineTxQueue();
  const transferQueue = getOfflineTransferQueue();
  let syncedCount = 0;
  const errors: string[] = [];

  const remainingTxs: OfflineTransactionItem[] = [];
  for (const tx of txQueue) {
    try {
      await createTransaction({
        type: tx.type,
        amount: tx.amount,
        category_id: tx.category_id,
        account_id: tx.account_id,
        transaction_date: tx.transaction_date,
        note: tx.note ? `${tx.note} (Synced offline)` : '(Synced offline)',
      });
      syncedCount++;
    } catch (err) {
      remainingTxs.push(tx);
      errors.push(err instanceof Error ? err.message : 'Failed to sync transaction');
    }
  }
  localStorage.setItem(TX_QUEUE_KEY, JSON.stringify(remainingTxs));

  const remainingTransfers: OfflineTransferItem[] = [];
  for (const tr of transferQueue) {
    try {
      await createTransfer({
        from_account_id: tr.from_account_id,
        to_account_id: tr.to_account_id,
        amount: tr.amount,
        transaction_date: tr.transaction_date,
        note: tr.note ? `${tr.note} (Synced offline)` : '(Synced offline)',
      });
      syncedCount++;
    } catch (err) {
      remainingTransfers.push(tr);
      errors.push(err instanceof Error ? err.message : 'Failed to sync transfer');
    }
  }
  localStorage.setItem(TRANSFER_QUEUE_KEY, JSON.stringify(remainingTransfers));

  window.dispatchEvent(
    new CustomEvent('voney:offline-synced', {
      detail: { syncedCount, hasErrors: errors.length > 0 },
    })
  );

  return { syncedCount, errors };
}
