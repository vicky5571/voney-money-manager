"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, LayoutGroup } from "motion/react";
import {
  House,
  ArrowLeftRight,
  Plus,
  PieChart,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemDef {
  id: string;
  name: string;
  href: string;
  icon: LucideIcon;
  isAction?: boolean;
}

const navItems: NavItemDef[] = [
  { id: "home", name: "Home", href: "/", icon: House },
  {
    id: "transactions",
    name: "Transactions",
    href: "/transactions",
    icon: ArrowLeftRight,
  },
  { id: "add", name: "Add", href: "/add", icon: Plus, isAction: true },
  { id: "budgets", name: "Budgets", href: "/budgets", icon: PieChart },
  { id: "wallets", name: "Wallets", href: "/accounts", icon: Wallet },
];

export function BottomNav() {
  const pathname = usePathname();

  const getActiveId = () => {
    if (pathname === "/") return "home";
    if (pathname.startsWith("/transactions")) return "transactions";
    if (pathname.startsWith("/add")) return "add";
    if (pathname.startsWith("/budgets")) return "budgets";
    if (pathname.startsWith("/accounts") || pathname.startsWith("/account"))
      return "wallets";
    return "";
  };

  const activeId = getActiveId();

  return (
    <LayoutGroup id="bottom-navigation-bar">
      <nav
        aria-label="Bottom Navigation"
        className="fixed bottom-2.5 left-0 right-0 z-50 mx-auto max-w-[430px] px-3 pointer-events-none flex justify-center pb-[max(env(safe-area-inset-bottom,0px),0.25rem)]"
      >
        <div className="relative inline-flex items-center gap-1 rounded-[28px] p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.14)] backdrop-blur-xl pointer-events-auto bg-white/95 border border-black/5">
          {navItems.map((item) => {
            const isActive = activeId === item.id;
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                prefetch={true}
                className={cn(
                  "group/nav relative flex flex-col items-center justify-center h-[62px] w-[62px] aspect-square shrink-0 rounded-[20px] transition-colors duration-200 min-h-[44px] min-w-[44px] cursor-pointer",
                  isActive
                    ? "text-emerald-500"
                    : "text-gray-400 hover:text-gray-600",
                )}
                aria-label={item.name}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Layered inset effect for active state animated with layoutId - strict 1:1 aspect ratio with bolder border */}
                {isActive && (
                  <>
                    {/* Inset well/channel */}
                    <motion.span
                      layoutId="active-nav-well"
                      initial={false}
                      className="absolute inset-0 aspect-square rounded-[20px]"
                      style={{
                        background:
                          "linear-gradient(180deg, #f1f2f6 0%, #e5e7eb 100%)",
                        boxShadow:
                          "inset 0 2px 6px rgba(0,0,0,0.14), inset 0 0 3px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.9)",
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 32,
                        y: { duration: 0 },
                      }}
                    />

                    {/* Gradient ring container with thicker spinning gradient stroke */}
                    <motion.span
                      layoutId="active-nav-gradient-ring"
                      initial={false}
                      className="absolute inset-[2px] aspect-square overflow-hidden rounded-[18px]"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 32,
                        y: { duration: 0 },
                      }}
                    >
                      <span
                        className="absolute inset-[-60%] origin-center will-change-transform animate-gold-spin"
                        style={{
                          background:
                            "conic-gradient(from 220deg, #6FF7CC 0%, #44EBCF 16%, #ADFA1F 33%, #C8FF5A 50%, #89F5A0 66%, #37D8C5 82%, #6FF7CC 100%)",
                        }}
                      />
                    </motion.span>

                    {/* Inner ring gap */}
                    <motion.span
                      layoutId="active-nav-inner-ring"
                      initial={false}
                      className="absolute inset-[5.5px] aspect-square rounded-[14.5px] bg-white shadow-xs"
                      style={{
                        boxShadow:
                          "inset 0 1px 3px rgba(0,0,0,0.12), inset 0 0 2px rgba(0,0,0,0.06)",
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 32,
                        y: { duration: 0 },
                      }}
                    />
                  </>
                )}

                {/* Inner button content - confined strictly within 1:1 border without ellipsis truncation */}
                <span className="relative z-10 flex flex-col items-center justify-center w-full px-0.5">
                  {item.isAction ? (
                    <motion.div
                      whileTap={{ rotate: 180, scale: 0.9 }}
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 22,
                      }}
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-xl transition-colors",
                        isActive
                          ? "bg-emerald-500 text-white shadow-xs"
                          : "bg-emerald-50 text-emerald-500",
                      )}
                    >
                      <Icon size={20} strokeWidth={2.8} />
                    </motion.div>
                  ) : (
                    <>
                      <Icon
                        size={19}
                        strokeWidth={isActive ? 2.5 : 2}
                        className="shrink-0"
                      />
                      <span
                        className={cn(
                          "text-[7.5px] sm:text-[8px] mt-0.5 leading-none tracking-tight whitespace-nowrap text-center select-none",
                          isActive
                            ? "font-bold text-emerald-500"
                            : "font-medium text-gray-500",
                        )}
                      >
                        {item.name}
                      </span>
                    </>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </LayoutGroup>
  );
}
