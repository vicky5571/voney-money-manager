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

export function getOfflineTxQueue(): OfflineTransactionItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TX_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getOfflineTransferQueue(): OfflineTransferItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TRANSFER_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
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
  const newItem: OfflineTransactionItem = {
    ...item,
    id: `offline_tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at_local: new Date().toISOString(),
  };

  const queue = getOfflineTxQueue();
  queue.push(newItem);
  localStorage.setItem(TX_QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent('voney:offline-queue-updated'));
  return newItem;
}

export function saveOfflineTransfer(
  item: Omit<OfflineTransferItem, 'id' | 'created_at_local'>
): OfflineTransferItem {
  const newItem: OfflineTransferItem = {
    ...item,
    id: `offline_tr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at_local: new Date().toISOString(),
  };

  const queue = getOfflineTransferQueue();
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
