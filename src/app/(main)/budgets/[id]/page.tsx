import { getBudgetDetail, type BudgetDetailResult, type BudgetCategory } from '@/app/actions/budgets';
import { getCategories } from '@/app/actions/categories';
import { BudgetDetailClient } from '@/components/budget-detail-client';
import { notFound } from 'next/navigation';

export default async function BudgetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let budget: BudgetDetailResult | null = null;
  let categories: BudgetCategory[] = [];

  try {
    const [fetchedBudget, rawCategories] = await Promise.all([
      getBudgetDetail(id),
      getCategories(),
    ]);

    budget = fetchedBudget;
    categories = rawCategories
      .filter((c) => c.type === 'expense')
      .map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
      }));
  } catch (error) {
    console.error('Failed to load budget details:', error);
  }

  if (!budget) {
    notFound();
  }

  return <BudgetDetailClient budget={budget} categories={categories} />;
}
