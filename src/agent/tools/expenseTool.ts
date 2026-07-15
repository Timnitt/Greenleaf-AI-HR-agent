import { tool } from 'ai';
import { z } from 'zod';
import { validateExpense } from '../expenses.js';

export const expenseTool = tool({
  description: `Validate whether a business expense is reimbursable under
    GreenLeaf Logistics policy. Use this tool when an employee asks about
    expensing a meal, lunch, dinner, receipt, or any business cost.`,
  parameters: z.object({
    amountChf: z.number().describe('The expense amount in Swiss Francs (CHF)'),
    hasExternalClient: z.boolean().describe('Whether at least one external client was present'),
    hasAlcohol: z.boolean().describe('Whether the receipt includes any alcohol'),
    submissionMethod: z.string().describe('How the employee plans to submit (e.g. ScanPro, photo, paper)')
  }),
  execute: async (input) => validateExpense(input)
});
