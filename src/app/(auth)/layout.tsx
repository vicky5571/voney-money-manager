import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Voney - Authentication',
  description: 'Sign in or create an account for Voney Money Manager',
};

/**
 * Centered auth layout without navigation elements for login and signup flows.
 *
 * @param props - Layout props containing child nodes.
 * @returns Mobile-first centered layout container.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[400px]">
        {children}
      </div>
    </div>
  );
}
