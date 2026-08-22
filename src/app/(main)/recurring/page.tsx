import { getRecurringBills } from '@/app/actions/recurring';
import { getAccounts } from '@/app/actions/accounts';
import { getCategories } from '@/app/actions/categories';
import {
  RecurringBillsClient,
  type RecurringAccountItem,
  type RecurringCategoryItem,
} from '@/components/recurring-bills-client';

export default async function RecurringPage() {
  const [bills, rawAccounts, rawCategories] = await Promise.all([
    getRecurringBills(),
    getAccounts(),
    getCategories(),
  ]);

  const accounts: RecurringAccountItem[] = (rawAccounts ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    balance: Number(a.balance || 0),
  }));

  const categories: RecurringCategoryItem[] = (rawCategories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    type: c.type,
  }));

  return (
    <RecurringBillsClient
      bills={bills}
      accounts={accounts}
      categories={categories}
    />
  );
}
