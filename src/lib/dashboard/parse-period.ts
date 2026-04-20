import type { YearMonth } from "@/lib/analytics/types";

function utcTodayYearMonth(): YearMonth {
  const d = new Date();
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

function firstParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Reads `year` / `month` from URL search params with safe fallbacks.
 * **Assumption**: dashboard month is interpreted in **UTC** (consistent with analytics).
 */
export function parseDashboardPeriod(searchParams: {
  year?: string | string[];
  month?: string | string[];
}): YearMonth {
  const fallback = utcTodayYearMonth();
  const ys = firstParam(searchParams.year);
  const ms = firstParam(searchParams.month);

  const y = ys !== undefined ? Number.parseInt(ys, 10) : fallback.year;
  const m = ms !== undefined ? Number.parseInt(ms, 10) : fallback.month;

  if (!Number.isInteger(y) || y < 2000 || y > 2100) return fallback;
  if (!Number.isInteger(m) || m < 1 || m > 12) return fallback;

  return { year: y, month: m };
}

export function adjacentMonth(year: number, month: number, delta: -1 | 1): YearMonth {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}
