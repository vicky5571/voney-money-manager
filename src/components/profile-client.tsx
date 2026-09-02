"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Calendar,
  Wallet,
  Repeat,
  HeartPulse,
  LogOut,
  ChevronRight,
  Edit2,
  Check,
  X,
  Loader2,
  ShieldCheck,
  Smartphone,
  ArrowLeft,
  Tags,
  KeyRound,
} from "lucide-react";
import {
  updateUserProfile,
  signOutAction,
  type UserProfileData,
} from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { getOfflineQueueCount } from "@/lib/offline-sync";
import {
  CategoryManagerSheet,
  type CategoryItem,
} from "@/components/category-manager-sheet";
import { ChangePasswordModal } from "@/components/change-password-modal";

interface ProfileClientProps {
  initialProfile: UserProfileData;
  categories?: CategoryItem[];
}

export function ProfileClient({
  initialProfile,
  categories = [],
}: ProfileClientProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileData>(initialProfile);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(initialProfile.displayName);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const [offlineCount, setOfflineCount] = useState(0);
  useEffect(() => {
    setOfflineCount(getOfflineQueueCount());
    const handler = () => setOfflineCount(getOfflineQueueCount());
    window.addEventListener("voney:offline-queue-updated", handler);
    window.addEventListener("voney:offline-synced", handler);
    return () => {
      window.removeEventListener("voney:offline-queue-updated", handler);
      window.removeEventListener("voney:offline-synced", handler);
    };
  }, []);

  const handleSaveName = async () => {
    if (!nameInput.trim()) {
      setNameError("Name cannot be empty");
      return;
    }
    setSavingName(true);
    setNameError("");

    try {
      const res = await updateUserProfile(nameInput.trim());
      if (res.success) {
        setProfile((prev) => ({ ...prev, displayName: nameInput.trim() }));
        setIsEditingName(false);
        router.refresh();
      } else {
        setNameError(res.error || "Failed to update profile");
      }
    } catch {
      setNameError("Failed to update profile");
    } finally {
      setSavingName(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Clear Supabase client session
      const supabase = createClient();
      await supabase.auth.signOut();
      // Server-side cleanup & redirect
      await signOutAction();
    } catch {
      router.push("/login");
    }
  };

  const joinedDate = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return (name[0] || "U").toUpperCase();
  };

  return (
    <div className="px-4 pt-6 pb-28 space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
            aria-label="Back to home"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
        </div>
      </div>

      {/* User Info Hero Card */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-500 text-white flex items-center justify-center text-2xl font-extrabold shadow-md mb-3 ring-4 ring-emerald-50">
          {getInitials(profile.displayName)}
        </div>

        {/* Display Name Row with Inline Edit */}
        {isEditingName ? (
          <div className="w-full max-w-xs space-y-2 mt-1">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your display name"
                className="flex-1 px-3 py-1.5 bg-gray-50 border border-emerald-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveName}
                disabled={savingName}
                className="min-h-[44px] min-w-[44px] bg-emerald-500 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center disabled:opacity-50 transition-all"
                aria-label="Save name"
              >
                {savingName ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setNameInput(profile.displayName);
                  setIsEditingName(false);
                  setNameError("");
                }}
                className="min-h-[44px] min-w-[44px] bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl flex items-center justify-center transition-all"
                aria-label="Cancel editing"
              >
                <X size={16} />
              </button>
            </div>
            {nameError && (
              <p className="text-xs text-red-500 font-medium">{nameError}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 mt-1">
            <h2 className="text-lg font-bold text-gray-900">
              {profile.displayName}
            </h2>
            <button
              type="button"
              onClick={() => setIsEditingName(true)}
              className="p-1 text-gray-400 hover:text-emerald-500 rounded-lg transition-colors"
              aria-label="Edit name"
            >
              <Edit2 size={14} />
            </button>
          </div>
        )}

        {/* Email & Joined date badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
          {profile.provider === "google" && (
            <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 font-medium px-2.5 py-1 rounded-full bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google Account</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-500 font-medium px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100">
            <Mail size={12} className="text-gray-400" />
            <span className="truncate max-w-[200px]">{profile.email}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 font-medium px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100">
            <Calendar size={12} className="text-gray-400" />
            <span>Member since {joinedDate}</span>
          </div>
        </div>
      </div>

      {/* Financial Hub Shortcuts */}
      <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm space-y-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-3 py-1">
          Financial Hub
        </h3>

        <Link
          href="/accounts"
          className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors min-h-[48px]"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
              <Wallet size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                Manage Wallets & Accounts
              </p>
              <p className="text-xs text-gray-500">
                Add, edit, or adjust balances
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </Link>

        <Link
          href="/recurring"
          className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors min-h-[48px]"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Repeat size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                Recurring Bills & Subscriptions
              </p>
              <p className="text-xs text-gray-500">
                Track renewals & auto due alerts
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </Link>

        <Link
          href="/budgets"
          className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors min-h-[48px]"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
              <HeartPulse size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                Budgets & Savings Goals
              </p>
              <p className="text-xs text-gray-500">
                Category spending limits & pacing
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </Link>

        <button
          type="button"
          onClick={() => setShowCategoryManager(true)}
          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors min-h-[48px] text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Tags size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                Manage Categories
              </p>
              <p className="text-xs text-gray-500">
                Add, rename, or customize spending tags
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      </div>

      {/* App & Security Info */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-gray-100 dark:border-zinc-800 shadow-sm space-y-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-3 py-1">
          Security & App
        </h3>

        <button
          type="button"
          onClick={() => setShowChangePassword(true)}
          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors min-h-[48px] text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <KeyRound size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {profile.hasPasswordAccount
                  ? "Change Password"
                  : "Set Account Password"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {profile.hasPasswordAccount
                  ? "Update account security credentials"
                  : "Enable email & password sign-in"}
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>

        <div className="flex items-center justify-between p-3 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 flex items-center justify-center shrink-0">
              <Smartphone size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                Offline Queue
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {offlineCount > 0
                  ? `${offlineCount} items waiting to sync`
                  : "All items synchronized"}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-400">
            {offlineCount > 0 ? `${offlineCount} Queued` : "Active"}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 flex items-center justify-center shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                Security
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Supabase Row-Level-Security (RLS)
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-gray-400">v1.0.0</span>
        </div>
      </div>

      {/* Log Out Button */}
      <button
        type="button"
        onClick={() => setShowLogoutConfirm(true)}
        className="w-full min-h-[48px] py-3.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer border border-red-100 dark:bg-red-950/30 dark:border-red-900/50 dark:hover:bg-red-950/50"
      >
        <LogOut size={17} />
        <span>Log Out</span>
      </button>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-2xl space-y-4 border border-gray-100 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <LogOut size={24} />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Log out of Voney?
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                You will need to enter your email and password to sign back in.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
                className="flex-1 min-h-[44px] py-2.5 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1 min-h-[44px] py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                {isLoggingOut ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Log Out"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Manager Sheet */}
      <CategoryManagerSheet
        isOpen={showCategoryManager}
        onClose={() => {
          setShowCategoryManager(false);
          router.refresh();
        }}
        categories={categories}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        isOAuthUser={!profile.hasPasswordAccount}
      />
    </div>
  );
}
