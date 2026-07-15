import { tool } from 'ai';
import { z } from 'zod';
import { checkHoliday, listHolidaysInMonth } from '../holidays.js';

export const holidayTool = tool({
  description: `Look up public holiday information for GreenLeaf Logistics
    employees based in Basel-Stadt (CH-BS), Switzerland. Use this tool when
    an employee asks about public holidays, days off, or whether a specific
    date is a working day.`,
  parameters: z.object({
    date: z.string().optional().describe('Specific date to check in YYYY-MM-DD format'),
    month: z.number().min(1).max(12).optional().describe('Month number (1-12) to list all holidays for'),
    year: z.number().optional().describe('Year (defaults to current year if omitted)')
  }),
  execute: async ({ date, month, year }) => {
    const y = year ?? new Date().getFullYear();
    if (date) return checkHoliday(date);
    if (month) return listHolidaysInMonth(y, month);
    return { error: 'Provide either a date or a month to check.' };
  }
});
