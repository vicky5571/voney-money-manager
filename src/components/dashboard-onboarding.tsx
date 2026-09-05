'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, CircleDollarSign, Landmark, PiggyBank } from 'lucide-react';

/**
 * Dashboard Onboarding ("Get Started" banner)
 *
 * 💡 Development Testing / Preview:
 * You can preview or test any step of this onboarding banner at any time without
 * creating a new user account by passing the `?onboarding=` URL query parameter:
 * - `/?onboarding=step1` or `preview`: simulates brand new user (all steps pending)
 * - `/?onboarding=step2`: simulates wallet created (Step 2 active)
 * - `/?onboarding=step3`: simulates wallet & transaction created (Step 3 active)
 * - `/?onboarding=done`: simulates all steps completed (hides banner)
 */
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
  const [devOverride, setDevOverride] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const onboardingParam = params.get('onboarding') || params.get('preview_onboarding');
      if (onboardingParam) {
        setDevOverride(onboardingParam.toLowerCase());
      }
    }
  }, []);

  let accountDone = hasAccount;
  let transactionDone = hasTransaction;
  let budgetDone = hasBudget;

  if (devOverride) {
    if (devOverride === 'true' || devOverride === 'preview' || devOverride === 'step1' || devOverride === 'reset') {
      accountDone = false;
      transactionDone = false;
      budgetDone = false;
    } else if (devOverride === 'step2') {
      accountDone = true;
      transactionDone = false;
      budgetDone = false;
    } else if (devOverride === 'step3') {
      accountDone = true;
      transactionDone = true;
      budgetDone = false;
    } else if (devOverride === 'done' || devOverride === 'complete') {
      accountDone = true;
      transactionDone = true;
      budgetDone = true;
    }
  }

  const complete = { account: accountDone, transaction: transactionDone, budget: budgetDone };
  const nextStep = steps.find((step) => !complete[step.key]);

  if (!nextStep) return null;

  return (
    <section className="relative rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
      {devOverride && (
        <span className="absolute top-3 right-3 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-800 font-semibold tracking-wide">
          DEV PREVIEW ({devOverride})
        </span>
      )}
      <h2 className="text-base font-bold text-gray-900">Get started</h2>
      <p className="mt-0.5 text-xs text-gray-500">Finish these steps to make Voney useful.</p>
      <div className="mt-4 space-y-3">
        {steps.map(({ key, title, detail, href, Icon }, index) => {
          const done = complete[key];
          const available = index === 0 || complete[steps[index - 1].key];
          const content = (
            <>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${done ? 'bg-emerald-100 text-emerald-500' : available ? 'bg-white text-emerald-500 shadow-sm' : 'bg-emerald-100 text-emerald-300'}`}>
                {done ? <Check size={17} strokeWidth={3} /> : <Icon size={17} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold ${done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{title}</span>
                <span className="block text-xs text-gray-500">{detail}</span>
              </span>
              {!done && available && <span className="text-xs font-semibold text-emerald-500">Start</span>}
            </>
          );

          return done || !available ? (
            <div key={key} className="flex items-center gap-3">{content}</div>
          ) : (
            <Link key={key} href={href} className="flex items-center gap-3 rounded-xl outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-emerald-500">
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
