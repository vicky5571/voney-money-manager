import { getAccounts } from '@/app/actions/accounts';
import { AccountsClient, type AccountData } from '@/components/accounts-client';

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const params = await searchParams;
  const data = await getAccounts();
  const accounts: AccountData[] = data.map((acc) => ({
    id: acc.id,
    name: acc.name,
    type: acc.type as 'cash' | 'bank' | 'e-wallet',
    icon: acc.icon || 'wallet',
    balance: Number(acc.balance || 0),
  }));

  return <AccountsClient accounts={accounts} initialEditId={params?.edit} />;
}
