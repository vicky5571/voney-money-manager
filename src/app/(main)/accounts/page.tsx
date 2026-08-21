import { Suspense } from 'react';
import { getAccounts } from '@/app/actions/accounts';
import { AccountsClient, type AccountData } from '@/components/accounts-client';

async function AccountsContent() {
  const data = await getAccounts();
  const accounts: AccountData[] = data.map((acc) => ({
    id: acc.id,
    name: acc.name,
    type: acc.type as 'cash' | 'bank' | 'e-wallet',
    icon: acc.icon || 'wallet',
    balance: Number(acc.balance || 0),
  }));

  return <AccountsClient accounts={accounts} />;
}

function AccountsSkeleton() {
  return (
    <div className="p-4 space-y-6 pb-24 animate-pulse">
      <div className="bg-indigo-600/70 rounded-2xl p-6 h-28" />
      <div className="space-y-4">
        <div className="h-6 bg-gray-200 rounded w-32" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl border border-gray-100" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<AccountsSkeleton />}>
      <AccountsContent />
    </Suspense>
  );
}
