import { tool } from 'ai';
import { z } from 'zod';
import { queryHandbook } from '../rag.js';

export const handbookTool = tool({
  description: `Search the GreenLeaf Logistics employee handbook for HR
    policies, rules, and procedures. Use this tool when an employee asks
    about vacation days, sick leave, bereavement leave, office rules,
    working hours, IT policies, safety procedures, or conduct guidelines.
    Do NOT use for expense validation or holiday lookups — use the
    dedicated tools for those.`,
  parameters: z.object({
    question: z.string().describe('The employee question to search the handbook for')
  }),
  execute: async ({ question }) => queryHandbook(question)
});
