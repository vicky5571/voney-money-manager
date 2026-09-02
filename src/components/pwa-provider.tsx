"use client";

import { useState, useEffect, useCallback } from "react";
import {
  WifiOff,
  Download,
  X,
  Share2,
  PlusSquare,
  CheckCircle2,
} from "lucide-react";
import { syncOfflineQueue, getOfflineQueueCount } from "@/lib/offline-sync";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlineCount, setOfflineCount] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  const checkQueue = useCallback(() => {
    setOfflineCount(getOfflineQueueCount());
  }, []);

  const handleSync = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.onLine) return;
    const { syncedCount } = await syncOfflineQueue();
    checkQueue();
    if (syncedCount > 0) {
      setSyncStatus(
        `Synced ${syncedCount} offline ${syncedCount === 1 ? "transaction" : "transactions"}!`,
      );
      setTimeout(() => setSyncStatus(null), 4500);
    }
  }, [checkQueue]);

  useEffect(() => {
    // Hydrate client-only values after mount to avoid blocking first paint and hydration mismatches
    setIsOnline(navigator.onLine);
    setIsIOS(/iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()));
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        Boolean(
          (window.navigator as unknown as { standalone?: boolean }).standalone,
        ),
    );
    setOfflineCount(getOfflineQueueCount());

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.error("SW registration failed:", err));
    }

    const hasDismissed = localStorage.getItem("voney_pwa_dismissed");

    // 1. Listen for BeforeInstallPrompt event
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      if (!isStandalone && !hasDismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    // 2. Online / Offline listeners
    const handleOnline = () => {
      setIsOnline(true);
      handleSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleQueueUpdated = () => {
      checkQueue();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("voney:offline-queue-updated", handleQueueUpdated);

    // If online on mount, attempt sync in next tick
    const syncTimer = setTimeout(() => {
      if (typeof window !== "undefined" && navigator.onLine) {
        handleSync();
      }
    }, 500);

    return () => {
      clearTimeout(syncTimer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "voney:offline-queue-updated",
        handleQueueUpdated,
      );
    };
  }, [checkQueue, handleSync, isStandalone]);

  const handleInstallClick = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setShowInstallBanner(false);
      }
    }
  };

  const handleDismissBanner = () => {
    setShowInstallBanner(false);
    try {
      localStorage.setItem("voney_pwa_dismissed", "true");
    } catch {
      // Ignore
    }
  };

  return (
    <>
      {/* Offline Status Top Alert */}
      {!isOnline && (
        <div className="sticky top-0 z-50 bg-amber-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <WifiOff size={15} />
            <span>
              Offline Mode — transactions save locally and sync when back
              online.
            </span>
          </div>
          {offlineCount > 0 && (
            <span className="bg-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {offlineCount} queued
            </span>
          )}
        </div>
      )}

      {/* Sync Success Toast Banner */}
      {syncStatus && (
        <div className="sticky top-0 z-50 bg-emerald-500 text-white px-4 py-2 pt-[max(env(safe-area-inset-top,0px),0.5rem)] text-xs font-semibold flex items-center justify-between shadow-md animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} />
            <span>{syncStatus}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncStatus(null)}
            className="p-1 text-white/80 hover:text-white"
            aria-label="Dismiss sync banner"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main App content */}
      {children}

      {/* PWA Install Banner */}
      {showInstallBanner && !isStandalone && (
        <div className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto bg-white rounded-2xl p-4 shadow-xl border border-emerald-100 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-500 text-white flex items-center justify-center font-extrabold text-base shadow-sm shrink-0">
                V
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">
                  Install Voney App
                </h4>
                <p className="text-[11px] text-gray-500 font-medium">
                  {isIOS
                    ? "Install to home screen for 1-tap offline tracking."
                    : "Fast offline access & home screen shortcut."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismissBanner}
              className="min-h-[44px] min-w-[44px] -mr-3 -mt-3 text-gray-400 hover:text-gray-600 flex items-center justify-center"
              aria-label="Dismiss banner"
            >
              <X size={16} />
            </button>
          </div>

          {isIOS ? (
            <div className="mt-3 p-2.5 bg-gray-50 rounded-xl text-[11px] text-gray-600 flex items-center gap-2 font-medium">
              <span>Tap</span>
              <Share2 size={14} className="text-emerald-500 shrink-0" />
              <span>then select</span>
              <span className="font-bold text-gray-900 flex items-center gap-1">
                <PlusSquare size={13} /> Add to Home Screen
              </span>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleDismissBanner}
                className="flex-1 min-h-[44px] py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
              >
                Not Now
              </button>
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex-1 min-h-[44px] py-2 bg-emerald-500 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              >
                <Download size={14} /> Install App
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
