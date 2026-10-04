/**
 * Paws — payday date math (pure, no React Native imports so it can be tested with plain node).
 * A payday "day" is 1–31; months shorter than that clamp to their last day (31 → Feb 28/29).
 */

/** The payday date in a given month (month is 0-based like Date). */
export function paydayIn(year: number, month: number, day: number, hour = 9): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay), hour, 0, 0, 0);
}

/** All payday moments strictly after `from`, for the next `months` months, sorted. */
export function upcomingPaydays(days: number[], from: Date, months = 12, hour = 9): Date[] {
  const out: Date[] = [];
  for (let i = 0; i <= months; i++) {
    const y = from.getFullYear(), m = from.getMonth() + i;
    for (const d of new Set(days)) {
      const date = paydayIn(y, m, d, hour);
      if (date > from && !out.some(o => o.getTime() === date.getTime())) out.push(date); // 30 & 31 both clamp in Feb
    }
  }
  return out.sort((a, b) => a.getTime() - b.getTime()).slice(0, days.length * months);
}

/** Whole days from `from` (start of its day) until the next payday; 0 = today is payday. */
export function daysUntilPayday(days: number[], from: Date): { days: number; date: Date } | null {
  if (days.length === 0) return null;
  const startOfToday = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const next = upcomingPaydays(days, new Date(startOfToday.getTime() - 1), 2, 0)[0];
  return { days: Math.round((next.getTime() - startOfToday.getTime()) / 864e5), date: next };
}
