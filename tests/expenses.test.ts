import { describe, it, expect } from 'vitest';
import { validateExpense } from '../src/agent/expenses.js';

describe('Expense Validator', () => {
  it('approves valid expense at exact limit', () =>
    expect(validateExpense({ amountChf: 35, hasExternalClient: true, hasAlcohol: false, submissionMethod: 'ScanPro' }).approved).toBe(true));

  it('rejects amount over 35 CHF', () =>
    expect(validateExpense({ amountChf: 35.01, hasExternalClient: true, hasAlcohol: false, submissionMethod: 'ScanPro' }).approved).toBe(false));

  it('rejects alcohol regardless of amount', () =>
    expect(validateExpense({ amountChf: 10, hasExternalClient: true, hasAlcohol: true, submissionMethod: 'ScanPro' }).approved).toBe(false));

  it('rejects missing external client', () =>
    expect(validateExpense({ amountChf: 20, hasExternalClient: false, hasAlcohol: false, submissionMethod: 'ScanPro' }).approved).toBe(false));

  it('rejects wrong submission method', () =>
    expect(validateExpense({ amountChf: 20, hasExternalClient: true, hasAlcohol: false, submissionMethod: 'photo' }).approved).toBe(false));

  it('includes handbook section in every result', () => {
    const r = validateExpense({ amountChf: 20, hasExternalClient: true, hasAlcohol: false, submissionMethod: 'ScanPro' });
    expect(r.handbookSection).toContain('Section 7');
  });
});
