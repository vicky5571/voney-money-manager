import { getAccounts } from '@/app/actions/accounts';
import { AccountsClient } from '@/components/accounts-client';

export default async function AccountsPage() {
  const data = await getAccounts();
  const accounts = data.map((acc: any) => ({
    id: acc.id,
    name: acc.name,
    type: acc.type,
    icon: acc.icon || 'wallet',
    balance: Number(acc.balance || 0)
  }));

  return (
    <AccountsClient accounts={accounts} />
  );
}
