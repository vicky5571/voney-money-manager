import assert from 'node:assert/strict';
import { calculateFinancialHealth } from '../financial-health';

// Run: npx tsx src/lib/__tests__/financial-health.test.ts
function test(name: string, fn: () => void) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { console.error(`✗ ${name}`, e); process.exitCode = 1; }
}

test('excellent score when savings 30% + under budget + runway 60d + no overdue', () => {
  const r = calculateFinancialHealth({ income: 10000, expense: 7000, totalBalance: 30000, totalBudget: 8000, totalBudgetSpent: 5000, hasOverdueBills: false, month: 8, year: 2026 });
  assert.ok(r.score >= 70);
  assert.equal(r.isPastMonth, false);
});

test('zero income -> savingsRate 0', () => {
  const r = calculateFinancialHealth({ income: 0, expense: 500, totalBalance: 1000, totalBudget: 0, totalBudgetSpent: 500, month: 8, year: 2026 });
  assert.equal(r.savingsRate, 0);
});

test('overdue bills penalize punctuality', () => {
  const a = calculateFinancialHealth({ income: 5000, expense: 3000, totalBalance: 10000, totalBudget: 4000, totalBudgetSpent: 3000, hasOverdueBills: false, month: 8, year: 2026 });
  const b = calculateFinancialHealth({ income: 5000, expense: 3000, totalBalance: 10000, totalBudget: 4000, totalBudgetSpent: 3000, hasOverdueBills: true, month: 8, year: 2026 });
  assert.ok(a.factors.punctualityScore > b.factors.punctualityScore);
});

test('past month forecast = actual expense', () => {
  const r = calculateFinancialHealth({ income: 5000, expense: 2000, totalBalance: 5000, totalBudget: 2500, totalBudgetSpent: 2000, month: 1, year: 2020 });
  assert.equal(r.forecast.projectedMonthEndSpend, 2000);
  assert.equal(r.isPastMonth, true);
});

console.log('FinancialHealth tests done');
