import Link from 'next/link';
import { Check, CircleDollarSign, Landmark, PiggyBank } from 'lucide-react';

interface DashboardOnboardingProps {
  hasAccount: boolean;
  hasTransaction: boolean;
  hasBudget: boolean;
}

const steps = [
  { key: 'account', title: 'Create wallet', detail: 'Add cash, bank, or e-wallet balance.', href: '/accounts', Icon: Landmark },
  { key: 'transaction', title: 'Add transaction', detail: 'Record first income or expense.', href: '/add', Icon: CircleDollarSign },
  { key: 'budget', title: 'Set budget', detail: 'Plan spending by category.', href: '/budgets', Icon: PiggyBank },
] as const;

export function DashboardOnboarding({ hasAccount, hasTransaction, hasBudget }: DashboardOnboardingProps) {
  const complete = { account: hasAccount, transaction: hasTransaction, budget: hasBudget };
  const nextStep = steps.find((step) => !complete[step.key]);

  if (!nextStep) return null;

  return (
    <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
      <h2 className="text-base font-bold text-gray-900">Get started</h2>
      <p className="mt-0.5 text-xs text-gray-500">Finish these steps to make Voney useful.</p>
      <div className="mt-4 space-y-3">
        {steps.map(({ key, title, detail, href, Icon }, index) => {
          const done = complete[key];
          const available = index === 0 || complete[steps[index - 1].key];
          const content = (
            <>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${done ? 'bg-emerald-100 text-emerald-600' : available ? 'bg-white text-emerald-600 shadow-sm' : 'bg-emerald-100 text-emerald-300'}`}>
                {done ? <Check size={17} strokeWidth={3} /> : <Icon size={17} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold ${done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{title}</span>
                <span className="block text-xs text-gray-500">{detail}</span>
              </span>
              {!done && available && <span className="text-xs font-semibold text-emerald-600">Start</span>}
            </>
          );

          return done || !available ? (
            <div key={key} className="flex items-center gap-3">{content}</div>
          ) : (
            <Link key={key} href={href} className="flex items-center gap-3 rounded-xl outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-emerald-600">
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
