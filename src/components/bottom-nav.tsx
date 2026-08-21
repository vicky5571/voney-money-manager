'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, ArrowLeftRight, Plus, PieChart, User, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full bg-white border-t border-gray-200 shadow-lg pb-[env(safe-area-inset-bottom)] z-50">
      <div className="flex flex-row justify-evenly items-center h-16 relative px-2 max-w-md mx-auto">
        <NavItem name="Home" href="/" icon={House} isActive={pathname === '/'} />
        <NavItem name="Transactions" href="/transactions" icon={ArrowLeftRight} isActive={pathname === '/transactions'} />

        {/* Center '+' button */}
        <div className="flex flex-col items-center justify-center -mt-6 z-10">
          <Link
            href="/add"
            className="flex items-center justify-center w-14 h-14 bg-indigo-600 text-white rounded-full shadow-xl ring-4 ring-white active:scale-95 transition-transform"
            aria-label="Add Transaction"
          >
            <Plus size={28} />
          </Link>
        </div>

        <NavItem name="Budgets" href="/budgets" icon={PieChart} isActive={pathname === '/budgets'} />
        <NavItem name="Account" href="/accounts" icon={User} isActive={pathname === '/accounts' || pathname === '/account'} />
      </div>
    </div>
  );
}

function NavItem({ 
  name, 
  href, 
  icon: Icon, 
  isActive 
}: { 
  name: string; 
  href: string; 
  icon: LucideIcon; 
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center w-16 h-full transition-colors",
        isActive ? "text-indigo-600" : "text-gray-400"
      )}
    >
      <Icon size={24} className="mb-1" />
      <span className="text-[10px] font-medium">{name}</span>
    </Link>
  );
}
