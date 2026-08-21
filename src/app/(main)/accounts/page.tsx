import { getAccounts } from '@/app/actions/accounts';
import { AccountsClient } from '@/components/accounts-client';
import { formatCurrency } from '@/lib/utils';
import { AccountCard } from '@/components/account-card';
import { AnimatedPage } from '@/components/animated-page';

export default async function AccountsPage() {
  const accounts = await getAccounts();
  const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);

  return (
    <AccountsClient>
      <div className="p-4 space-y-6">
        <div className="bg-indigo-600 text-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-medium opacity-80">Total Balance</h2>
          <p className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
        </div>

        <AnimatedPage className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Your Accounts</h3>
          </div>
          
          {accounts.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-gray-500 text-sm">No accounts yet. Add your first account.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {accounts.map((account) => (
                <div key={account.id} data-animate className="opacity-0 translate-y-4">
                  <AccountCard
                    id={account.id}
                    name={account.name}
                    type={account.type as 'cash' | 'bank' | 'e-wallet'}
                    balance={Number(account.balance)}
                  />
                </div>
              ))}
            </div>
          )}
        </AnimatedPage>
      </div>
    </AccountsClient>
  );
}
