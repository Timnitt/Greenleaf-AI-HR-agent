import type { ExpenseInput, ExpenseResult } from '../types.js';

// Constants - source: GreenLeaf Handbook, Section 7 ────────────────────────
const EXPENSE_LIMIT_CHF = 35.0;
const ACCEPTED_METHOD_KEYWORD = 'scanpro';

export function validateExpense(input: ExpenseInput): ExpenseResult {
  if (input.hasAlcohol) {
    return {
      approved: false,
      reason: 'Alcohol is strictly non-reimbursable and must be paid on a separate personal receipt.',
      handbookSection: 'Section 7 - Expenses & Travel'
    };
  }
  if (input.amountChf > EXPENSE_LIMIT_CHF) {
    return {
      approved: false,
      reason: `Amount of ${input.amountChf} CHF exceeds the maximum of ${EXPENSE_LIMIT_CHF} CHF per person.`,
      handbookSection: 'Section 7 - Expenses & Travel'
    };
  }
  if (!input.hasExternalClient) {
    return {
      approved: false,
      reason: 'Client lunches are only reimbursable when at least one external client is present.',
      handbookSection: 'Section 7 - Expenses & Travel'
    };
  }
  if (!input.submissionMethod.toLowerCase().includes(ACCEPTED_METHOD_KEYWORD)) {
    return {
      approved: false,
      reason: 'Receipts must be scanned using the ScanPro app. Paper receipts and photos are not accepted.',
      handbookSection: 'Section 7 - Expenses & Travel'
    };
  }
  return {
    approved: true,
    reason: 'All conditions met: within the 35 CHF limit, external client present, no alcohol, submitted via ScanPro.',
    handbookSection: 'Section 7 - Expenses & Travel'
  };
}
