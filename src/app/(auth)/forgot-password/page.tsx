"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Mail,
  Loader2,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { forgotPasswordSchema } from "@/lib/validations/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = forgotPasswordSchema.safeParse({ email: email.trim() });
    if (!validation.success) {
      setErrorMessage(
        validation.error.issues[0]?.message ||
          "Please enter a valid email address",
      );
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(
        validation.data.email,
        {
          redirectTo: `${origin}/auth/callback?next=/reset-password`,
        },
      );

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Brand & Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-200 dark:shadow-none mb-3">
          <KeyRound className="w-7 h-7" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Reset Password
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Enter your email to receive a password reset link
        </p>
      </div>

      {/* Card Form or Success Confirmation */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-sm p-6 sm:p-8">
        {isSuccess ? (
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-50/50 dark:ring-emerald-950/20">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Check your inbox
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                We sent a password reset link to:
              </p>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 break-all">
                {email}
              </p>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">
              Click the link inside the email to set a new password. If you
              don&apos;t see it, be sure to check your spam folder.
            </p>

            <div className="pt-3 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsSuccess(false);
                  setEmail("");
                }}
                className="w-full h-11 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors cursor-pointer"
              >
                Send to a different email
              </button>
              <Link
                href="/login"
                className="w-full h-12 flex items-center justify-center font-semibold bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 rounded-xl transition-colors min-h-[44px]"
              >
                Return to Login
              </Link>
            </div>
          </div>
        ) : (
          <>
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2 p-3 mb-5 text-sm text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 rounded-xl"
              >
                <AlertCircle
                  className="w-5 h-5 flex-shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="reset-email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    autoComplete="email"
                    disabled={isLoading}
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 mt-2 flex items-center justify-center font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2
                      className="w-5 h-5 animate-spin"
                      aria-hidden="true"
                    />
                    <span>Sending Link...</span>
                  </span>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Return to Login */}
      <div className="text-center mt-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Login</span>
        </Link>
      </div>
    </div>
  );
}
