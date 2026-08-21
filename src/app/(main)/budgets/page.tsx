import { Suspense } from 'react';
import { getBudgets } from '@/app/actions/budgets';
import { getCategories } from '@/app/actions/categories';
import { BudgetsClient, type BudgetCategory } from '@/components/budgets-client';

async function BudgetsContent({ month, year }: { month: number; year: number }) {
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

function BudgetsSkeleton() {
  return (
    <div className="p-4 space-y-6 pb-24 animate-pulse">
      <div className="bg-white rounded-2xl p-4 h-14 shadow-sm" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-white rounded-xl shadow-sm border border-gray-100 p-4" />
        ))}
      </div>
    </div>
  );
}

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const month = params.month ? parseInt(params.month, 10) : now.getMonth() + 1;
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear();

  return (
    <Suspense fallback={<BudgetsSkeleton />}>
      <BudgetsContent month={month} year={year} />
    </Suspense>
  );
}
