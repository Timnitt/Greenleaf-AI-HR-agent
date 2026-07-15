import { describe, it, expect, beforeAll } from 'vitest';
import { checkHoliday, listHolidaysInMonth, initHolidays } from '../src/agent/holidays.js';

beforeAll(async () => { await initHolidays(); });

describe('Holiday Lookup', () => {
  it('recognises Labour Day (1 May) in Basel', () => {
    const result = checkHoliday('2026-05-01');
    expect(result.isHoliday).toBe(true);
    expect(result.name).toBe('Labour Day');
  });
  it('recognises New Year', () => expect(checkHoliday('2026-01-01').isHoliday).toBe(true));
  it('recognises Good Friday', () => expect(checkHoliday('2026-04-03').isHoliday).toBe(true));
  it('returns false for a normal Tuesday', () => expect(checkHoliday('2026-03-15').isHoliday).toBe(false));
  it('lists holidays in May', () => {
    const may = listHolidaysInMonth(2026, 5);
    expect(may.some(h => h.name === 'Labour Day')).toBe(true);
  });
});
