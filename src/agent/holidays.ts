import { readFileSync, writeFileSync, existsSync } from 'fs';
import type { Holiday, HolidayCheckResult } from '../types.js';

export async function loadHolidays(): Promise<Holiday[]> {
  const year = new Date().getFullYear();
  const cachePath = process.env.HOLIDAYS_CACHE_PATH ?? './data/holidays_cache.json';

  if (existsSync(cachePath)) {
    const cached = JSON.parse(readFileSync(cachePath, 'utf-8')) as { year: number; data: Holiday[] };
    if (cached.year === year) return cached.data;
  }

  // the API is the single source of truth for every holiday, every year.
  const url = new URL('https://openholidaysapi.org/PublicHolidays');
  url.searchParams.set('countryIsoCode', 'CH');
  url.searchParams.set('subdivisionCode', process.env.HOLIDAY_SUBDIVISION ?? 'CH-BS');
  url.searchParams.set('languageIsoCode', 'EN');
  url.searchParams.set('validFrom', `${year}-01-01`);
  url.searchParams.set('validTo', `${year}-12-31`);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`OpenHolidays API error: ${res.status}`);

  const raw = await res.json() as Array<{ startDate: string; name: Array<{ text: string }>; nationwide: boolean }>;

  const holidays = raw.map<Holiday>(h => ({
      date: h.startDate,
      name: h.name[0]?.text ?? 'Unknown',
      type: h.nationwide ? 'National' : 'Cantonal',
      region: 'CH-BS',
      source: 'OpenHolidays API'
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  writeFileSync(cachePath, JSON.stringify({ year, data: holidays }, null, 2));
  return holidays;
}

export function checkHoliday(date: string): HolidayCheckResult {

  const monthDay = date.slice(-5);
  const holiday = holidayCache.find(h => h.date.slice(-5) === monthDay);
  return {
    isHoliday: !!holiday,
    name: holiday?.name ?? null,
    type: holiday?.type ?? null,
    source: holiday?.source ?? 'OpenHolidays API · Basel-Stadt (CH-BS)'
  };
}

export function listHolidaysInMonth(year: number, month: number): Holiday[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return holidayCache.filter(h => h.date.startsWith(prefix));
}

// Module-level cache, populated once on startup
export let holidayCache: Holiday[] = [];
export async function initHolidays(): Promise<void> {
  holidayCache = await loadHolidays();
  console.log(`✅ Holidays loaded (${holidayCache.length} entries)`);
}
