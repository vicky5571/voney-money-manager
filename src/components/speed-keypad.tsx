'use client';

import { Delete, Plus, Minus, Check, RotateCcw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface SpeedKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onDone?: () => void;
}

export function SpeedKeypad({ value, onChange, onDone }: SpeedKeypadProps) {
  // Helper to safely evaluate simple addition/subtraction
  const evaluateExpression = (expr: string): string => {
    try {
      // Remove trailing operators or decimal points before evaluation
      const cleaned = expr.replace(/[+\-\.]$/, '').trim();
      if (!cleaned) return '';
      
      // Match numbers and + or - operators
      const tokens = cleaned.match(/(\d+(\.\d+)?|[+\-])/g);
      if (!tokens || tokens.length === 0) return '';
      
      let total = 0;
      let currentOp = '+';
      
      for (const token of tokens) {
        if (token === '+' || token === '-') {
          currentOp = token;
        } else {
          const num = parseFloat(token);
          if (!isNaN(num)) {
            if (currentOp === '+') total += num;
            else if (currentOp === '-') total -= num;
          }
        }
      }
      
      return total >= 0 ? total.toString() : '0';
    } catch {
      return value;
    }
  };

  const handleKeyPress = (key: string) => {
    if (key === 'C') {
      onChange('');
      return;
    }

    if (key === 'BACKSPACE') {
      if (value.length <= 1) {
        onChange('');
      } else {
        onChange(value.slice(0, -1));
      }
      return;
    }

    if (key === '=') {
      onChange(evaluateExpression(value));
      return;
    }

    if (key === '+' || key === '-') {
      // Prevent consecutive operators
      if (!value) return;
      if (['+', '-'].includes(value.slice(-1))) {
        onChange(value.slice(0, -1) + key);
      } else {
        // Evaluate previous expression if already has an operator
        if (value.includes('+') || value.includes('-')) {
          const evaluated = evaluateExpression(value);
          onChange(evaluated + key);
        } else {
          onChange(value + key);
        }
      }
      return;
    }

    if (key === '.') {
      const parts = value.split(/[+\-]/);
      const currentSegment = parts[parts.length - 1];
      if (currentSegment.includes('.')) return;
      onChange(value + (value === '' || ['+', '-'].includes(value.slice(-1)) ? '0.' : '.'));
      return;
    }

    if (key === '000') {
      if (!value || ['+', '-'].includes(value.slice(-1))) return;
      onChange(value + '000');
      return;
    }

    // Default digit
    if (value === '0') {
      onChange(key);
    } else {
      onChange(value + key);
    }
  };

  const addQuickAmount = (amount: number) => {
    const currentNum = parseFloat(evaluateExpression(value)) || 0;
    const newTotal = currentNum + amount;
    onChange(newTotal.toString());
  };

  const isMathActive = value.includes('+') || value.includes('-');

  return (
    <div className="space-y-3 pt-2">
      {/* Quick Increment Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[10000, 50000, 100000, 500000].map((inc) => (
          <button
            key={inc}
            type="button"
            onClick={() => addQuickAmount(inc)}
            className="min-h-[44px] px-3 py-2 bg-indigo-50/80 hover:bg-indigo-100/90 text-indigo-700 rounded-xl text-xs font-bold shrink-0 active:scale-95 transition-all border border-indigo-100/50"
          >
            +{formatCurrency(inc).replace(/\.00$/, '')}
          </button>
        ))}
      </div>

      {/* Keypad Grid */}
      <div className="grid grid-cols-4 gap-2 bg-gray-50/80 p-2.5 rounded-2xl border border-gray-200/80">
        {/* Row 1 */}
        <button
          type="button"
          onClick={() => handleKeyPress('7')}
          className="min-h-[48px] bg-white rounded-xl font-bold text-gray-900 text-lg shadow-xs hover:bg-gray-100 active:scale-95 transition-all"
        >
          7
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress('8')}
          className="min-h-[48px] bg-white rounded-xl font-bold text-gray-900 text-lg shadow-xs hover:bg-gray-100 active:scale-95 transition-all"
        >
          8
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress('9')}
          className="min-h-[48px] bg-white rounded-xl font-bold text-gray-900 text-lg shadow-xs hover:bg-gray-100 active:scale-95 transition-all"
        >
          9
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress('C')}
          className="min-h-[48px] bg-amber-50 text-amber-700 rounded-xl font-bold text-sm shadow-xs hover:bg-amber-100 active:scale-95 transition-all flex items-center justify-center gap-1"
          aria-label="Clear"
        >
          <RotateCcw size={16} /> C
        </button>

        {/* Row 2 */}
        <button
          type="button"
          onClick={() => handleKeyPress('4')}
          className="min-h-[48px] bg-white rounded-xl font-bold text-gray-900 text-lg shadow-xs hover:bg-gray-100 active:scale-95 transition-all"
        >
          4
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress('5')}
          className="min-h-[48px] bg-white rounded-xl font-bold text-gray-900 text-lg shadow-xs hover:bg-gray-100 active:scale-95 transition-all"
        >
          5
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress('6')}
          className="min-h-[48px] bg-white rounded-xl font-bold text-gray-900 text-lg shadow-xs hover:bg-gray-100 active:scale-95 transition-all"
        >
          6
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress('+')}
          className="min-h-[48px] bg-indigo-50 text-indigo-700 rounded-xl font-bold text-lg shadow-xs hover:bg-indigo-100 active:scale-95 transition-all flex items-center justify-center"
          aria-label="Add operator"
        >
          <Plus size={18} />
        </button>

        {/* Row 3 */}
        <button
          type="button"
          onClick={() => handleKeyPress('1')}
          className="min-h-[48px] bg-white rounded-xl font-bold text-gray-900 text-lg shadow-xs hover:bg-gray-100 active:scale-95 transition-all"
        >
          1
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress('2')}
          className="min-h-[48px] bg-white rounded-xl font-bold text-gray-900 text-lg shadow-xs hover:bg-gray-100 active:scale-95 transition-all"
        >
          2
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress('3')}
          className="min-h-[48px] bg-white rounded-xl font-bold text-gray-900 text-lg shadow-xs hover:bg-gray-100 active:scale-95 transition-all"
        >
          3
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress('-')}
          className="min-h-[48px] bg-indigo-50 text-indigo-700 rounded-xl font-bold text-lg shadow-xs hover:bg-indigo-100 active:scale-95 transition-all flex items-center justify-center"
          aria-label="Subtract operator"
        >
          <Minus size={18} />
        </button>

        {/* Row 4 */}
        <button
          type="button"
          onClick={() => handleKeyPress('.')}
          className="min-h-[48px] bg-white rounded-xl font-bold text-gray-900 text-lg shadow-xs hover:bg-gray-100 active:scale-95 transition-all"
        >
          .
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress('0')}
          className="min-h-[48px] bg-white rounded-xl font-bold text-gray-900 text-lg shadow-xs hover:bg-gray-100 active:scale-95 transition-all"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress('000')}
          className="min-h-[48px] bg-white rounded-xl font-bold text-gray-800 text-sm shadow-xs hover:bg-gray-100 active:scale-95 transition-all"
        >
          000
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress('BACKSPACE')}
          className="min-h-[48px] bg-red-50 text-red-600 rounded-xl font-bold shadow-xs hover:bg-red-100 active:scale-95 transition-all flex items-center justify-center"
          aria-label="Backspace"
        >
          <Delete size={18} />
        </button>
      </div>

      {/* Done / Calculate Button */}
      {isMathActive ? (
        <button
          type="button"
          onClick={() => handleKeyPress('=')}
          className="w-full min-h-[44px] py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-xs shadow-sm hover:bg-indigo-700 active:scale-98 transition-all flex items-center justify-center gap-1.5"
        >
          <Check size={16} /> Calculate Total ({evaluateExpression(value)})
        </button>
      ) : onDone ? (
        <button
          type="button"
          onClick={onDone}
          className="w-full min-h-[44px] py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
        >
          <Check size={16} /> Done Entering Amount
        </button>
      ) : null}
    </div>
  );
}
