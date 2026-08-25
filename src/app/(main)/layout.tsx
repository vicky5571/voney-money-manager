import { BottomNav } from "@/components/bottom-nav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-dvh mx-auto w-full max-w-[430px] bg-background pt-[env(safe-area-inset-top,0px)]">
      {/* Main content area — scrollable, with bottom padding for nav */}
      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>

      {/* Fixed bottom navigation */}
      <BottomNav />
    </div>
  );
}
