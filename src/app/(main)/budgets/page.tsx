import { getBudgets } from '@/app/actions/budgets';
import { getCategories } from '@/app/actions/categories';
import { BudgetsClient } from '@/components/budgets-client';

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1;
  const year = params.year ? parseInt(params.year) : now.getFullYear();

  const [budgets, categories] = await Promise.all([
    getBudgets(month, year),
    getCategories(),
  ]);

  const expenseCategories = categories.filter(c => c.type === 'expense');

  return (
    <BudgetsClient 
      initialBudgets={budgets} 
      categories={expenseCategories}
      initialMonth={month}
      initialYear={year}
    />
  );
}
