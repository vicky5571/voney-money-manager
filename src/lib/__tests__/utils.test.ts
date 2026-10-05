import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toCents,
  fromCents,
  sumAmounts,
  formatCurrency,
  getMonthKeyFromDateString,
  generateUuid,
  cn,
} from '../utils';

describe('Core Utility Functions Smoke Test', () => {
  it('toCents converts decimal strings and numbers to integer cents without floating drift', () => {
    assert.equal(toCents('12450.50'), 1245050);
    assert.equal(toCents(12450.5), 1245050);
    assert.equal(toCents('-350.25'), -35025);
    assert.equal(toCents('0'), 0);
  });

  it('fromCents converts integer cents back to two-decimal string format', () => {
    assert.equal(fromCents(1245050), '12450.50');
    assert.equal(fromCents(-35025), '-350.25');
    assert.equal(fromCents(0), '0.00');
  });

  it('sumAmounts accurately sums mixed numbers and decimal strings via cents', () => {
    const total = sumAmounts(['100.10', '200.20', 300.30, '-50.10']);
    assert.equal(total, 550.5);
  });

  it('formatCurrency formats Indonesian Rupiah correctly with fallback for NaN', () => {
    const formatted = formatCurrency(50000);
    assert.ok(formatted.includes('50.000'));
    assert.equal(formatCurrency(NaN), 'Rp 0');
  });

  it('getMonthKeyFromDateString extracts M-YYYY without timezone distortion', () => {
    assert.equal(getMonthKeyFromDateString('2026-10-06'), '10-2026');
    assert.equal(getMonthKeyFromDateString('2025-01-01'), '1-2025');
  });

  it('generateUuid creates valid RFC 4122 v4 UUID strings', () => {
    const id = generateUuid();
    assert.match(
      id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('cn properly merges and resolves conflicting Tailwind utility classes', () => {
    assert.equal(cn('px-2 py-1', 'px-4'), 'py-1 px-4');
    assert.equal(cn('text-red-500', undefined, null, false && 'hidden', 'text-green-500'), 'text-green-500');
  });
});
