import { getBudgets } from '@/app/actions/budgets';
import { getCategories } from '@/app/actions/categories';
import { BudgetsClient, type BudgetCategory } from '@/components/budgets-client';

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const month = params.month ? parseInt(params.month, 10) : now.getMonth() + 1;
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear();

  const [budgets, rawCategories] = await Promise.all([
    getBudgets(month, year),
    getCategories(),
  ]);

  const categories: BudgetCategory[] = rawCategories
    .filter((c) => c.type === 'expense')
    .map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
    }));

  return (
    <BudgetsClient 
      initialBudgets={budgets} 
      categories={categories}
      initialMonth={month}
      initialYear={year}
    />
  );
}
