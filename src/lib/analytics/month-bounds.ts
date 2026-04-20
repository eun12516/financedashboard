import type { YearMonth } from "./types";

/** Month start (inclusive) and next month start (exclusive), UTC @db.Date safe. */
export function utcMonthRange(year: number, month: number): { start: Date; endExclusive: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const endExclusive = new Date(Date.UTC(year, month, 1));
  return { start, endExclusive };
}

export function previousYearMonth(year: number, month: number): YearMonth {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

export function addMonths(year: number, month: number, delta: number): YearMonth {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

/** Oldest → newest, `count` months ending at `year`/`month` (inclusive). */
export function lastNMonthsEndingAt(year: number, month: number, count: number): YearMonth[] {
  const out: YearMonth[] = [];
  for (let i = count - 1; i >= 0; i--) {
    out.push(addMonths(year, month, -i));
  }
  return out;
}

export function yearMonthKey(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function dateToYearMonthKey(d: Date): string {
  return yearMonthKey(d.getUTCFullYear(), d.getUTCMonth() + 1);
}
