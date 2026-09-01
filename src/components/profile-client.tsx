'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { updateUserProfile, signOutAction, type UserProfileData } from '@/app/actions/auth';
import { createClient } from '@/lib/supabase/client';
import { getOfflineQueueCount } from '@/lib/offline-sync';

interface ProfileClientProps {
  initialProfile: UserProfileData;
}

export function ProfileClient({ initialProfile }: ProfileClientProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileData>(initialProfile);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(initialProfile.displayName);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const offlineCount = typeof window !== 'undefined' ? getOfflineQueueCount() : 0;

  const handleSaveName = async () => {
    if (!nameInput.trim()) {
      setNameError('Name cannot be empty');
      return;
    }
    setSavingName(true);
    setNameError('');

    try {
      const res = await updateUserProfile(nameInput.trim());
      if (res.success) {
        setProfile((prev) => ({ ...prev, displayName: nameInput.trim() }));
        setIsEditingName(false);
        router.refresh();
      } else {
        setNameError(res.error || 'Failed to update profile');
      }
    } catch {
      setNameError('Failed to update profile');
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
      router.push('/login');
    }
  };

  const joinedDate = new Date(profile.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return (name[0] || 'U').toUpperCase();
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
                {savingName ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setNameInput(profile.displayName);
                  setIsEditingName(false);
                  setNameError('');
                }}
                className="min-h-[44px] min-w-[44px] bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl flex items-center justify-center transition-all"
                aria-label="Cancel editing"
              >
                <X size={16} />
              </button>
            </div>
            {nameError && <p className="text-xs text-red-500 font-medium">{nameError}</p>}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 mt-1">
            <h2 className="text-lg font-bold text-gray-900">{profile.displayName}</h2>
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
              <p className="text-sm font-bold text-gray-900">Manage Wallets & Accounts</p>
              <p className="text-xs text-gray-500">Add, edit, or adjust balances</p>
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
              <p className="text-sm font-bold text-gray-900">Recurring Bills & Subscriptions</p>
              <p className="text-xs text-gray-500">Track renewals & auto due alerts</p>
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
              <p className="text-sm font-bold text-gray-900">Budgets & Savings Goals</p>
              <p className="text-xs text-gray-500">Category spending limits & pacing</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </Link>
      </div>

      {/* App & Security Info */}
      <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm space-y-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-3 py-1">
          App & System
        </h3>

        <div className="flex items-center justify-between p-3 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center shrink-0">
              <Smartphone size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Offline Queue</p>
              <p className="text-xs text-gray-500">
                {offlineCount > 0 ? `${offlineCount} items waiting to sync` : 'All items synchronized'}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-500">
            {offlineCount > 0 ? `${offlineCount} Queued` : 'Active'}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Security</p>
              <p className="text-xs text-gray-500">Supabase Row-Level-Security (RLS)</p>
            </div>
          </div>
          <span className="text-xs font-bold text-gray-400">v1.0.0</span>
        </div>
      </div>

      {/* Log Out Button */}
      <button
        type="button"
        onClick={() => setShowLogoutConfirm(true)}
        className="w-full min-h-[48px] py-3.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer border border-red-100"
      >
        <LogOut size={17} />
        <span>Log Out</span>
      </button>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <LogOut size={24} />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-gray-900">Log out of Voney?</h3>
              <p className="text-xs text-gray-500">
                You will need to enter your email and password to sign back in.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
                className="flex-1 min-h-[44px] py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1 min-h-[44px] py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isLoggingOut ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  'Log Out'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
