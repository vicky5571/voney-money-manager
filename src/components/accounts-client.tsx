'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { createAccount } from '@/app/actions/accounts';
import { useTransition } from 'react';

export function AccountsClient({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<{ name: string; type: 'cash' | 'bank' | 'e-wallet' }>({
    name: '',
    type: 'cash'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await createAccount(formData);
        setIsOpen(false);
        setFormData({ name: '', type: 'cash' });
      } catch (error) {
        console.error(error);
      }
    });
  };

  return (
    <div className="min-h-screen pb-24 relative">
      {children}

      {/* Add Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-colors z-40"
      >
        <Plus size={24} />
      </button>

      {/* Bottom Sheet Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div 
            className="w-full max-w-md bg-white rounded-t-3xl p-6 pb-safe animate-in slide-in-from-bottom duration-300"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Add Account</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Main Wallet"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
                <div className="flex gap-2">
                  {(['cash', 'bank', 'e-wallet'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, type })}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium capitalize transition-all ${
                        formData.type === type 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending || !formData.name}
                className="w-full bg-indigo-600 text-white font-medium py-3.5 rounded-xl mt-4 disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                {isPending ? 'Saving...' : 'Save Account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
