import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  aggregateMonthlyBuckets,
  buildSpendingBreakdown,
  toAnalyticsRow,
  toMonthlyMetricBuckets,
} from "@/lib/analytics/aggregate";
import type { TransactionAnalyticsRow } from "@/lib/analytics/bucket-transaction";
import {
  dateToYearMonthKey,
  lastNMonthsEndingAt,
  previousYearMonth,
  utcMonthRange,
} from "@/lib/analytics/month-bounds";
import { computeMetricDelta } from "@/lib/analytics/percent-delta";
import { buildMonthFlowSummary } from "@/lib/analytics/month-flow";
import type {
  AnalyticsSummaryResponse,
  ExecutiveSummary,
  MonthlyTrendPoint,
  YearMonth,
} from "@/lib/analytics/types";

const DEFAULT_TREND_MONTHS = 6;
const MAX_TREND_MONTHS = 24;

export class AnalyticsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyticsValidationError";
  }
}

type FetchedTransactionRow = {
  occurredOn: Date;
  amount: Prisma.Decimal;
  merchant: string;
  categoryRaw: string | null;
  isTransfer: boolean;
  classification: { code: string; label: string } | null;
};

function groupRowsByMonthKey(rows: FetchedTransactionRow[]): Map<string, TransactionAnalyticsRow[]> {
  const map = new Map<string, TransactionAnalyticsRow[]>();
  for (const row of rows) {
    const key = dateToYearMonthKey(row.occurredOn);
    const mapped = toAnalyticsRow(row);
    const arr = map.get(key);
    if (arr) arr.push(mapped);
    else map.set(key, [mapped]);
  }
  return map;
}

/**
 * Full analytics payload for dashboard consumption for `year`/`month` (UTC calendar month).
 */
export async function getAnalyticsSummary(
  year: number,
  month: number,
  options?: { trendMonthCount?: number },
): Promise<AnalyticsSummaryResponse> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new AnalyticsValidationError("year must be an integer between 2000 and 2100");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new AnalyticsValidationError("month must be an integer 1–12");
  }

  let trendMonthCount = options?.trendMonthCount ?? DEFAULT_TREND_MONTHS;
  if (!Number.isInteger(trendMonthCount) || trendMonthCount < 1) {
    trendMonthCount = DEFAULT_TREND_MONTHS;
  }
  trendMonthCount = Math.min(trendMonthCount, MAX_TREND_MONTHS);

  const trendPeriods = lastNMonthsEndingAt(year, month, trendMonthCount);
  const first = trendPeriods[0]!;
  const windowStart = utcMonthRange(first.year, first.month).start;
  const windowEndExclusive = utcMonthRange(year, month).endExclusive;

  const rawRows = await prisma.transaction.findMany({
    where: {
      occurredOn: {
        gte: windowStart,
        lt: windowEndExclusive,
      },
    },
    select: {
      occurredOn: true,
      amount: true,
      merchant: true,
      categoryRaw: true,
      isTransfer: true,
      classification: { select: { code: true, label: true } },
    },
  });

  const byMonth = groupRowsByMonthKey(rawRows);

  const ymKey = (p: YearMonth) =>
    `${p.year}-${String(p.month).padStart(2, "0")}`;

  const metricsForPeriod = (p: YearMonth) => {
    const key = ymKey(p);
    const rows = byMonth.get(key) ?? [];
    const agg = aggregateMonthlyBuckets(rows);
    return toMonthlyMetricBuckets(agg);
  };

  const currentPeriod: YearMonth = { year, month };
  const previousPeriod = previousYearMonth(year, month);

  const currentMetrics = metricsForPeriod(currentPeriod);
  const previousMetrics = metricsForPeriod(previousPeriod);

  const executive: ExecutiveSummary = {
    period: currentPeriod,
    ...currentMetrics,
  };

  const comparison = {
    currentPeriod,
    previousPeriod,
    spending: computeMetricDelta(currentMetrics.totalSpending, previousMetrics.totalSpending),
    income: computeMetricDelta(currentMetrics.totalIncome, previousMetrics.totalIncome),
    investment: computeMetricDelta(currentMetrics.totalInvestment, previousMetrics.totalInvestment),
    netCashflow: computeMetricDelta(currentMetrics.netCashflow, previousMetrics.netCashflow),
  };

  const currentKey = ymKey(currentPeriod);
  const currentRows = byMonth.get(currentKey) ?? [];
  const spendingBreakdown = buildSpendingBreakdown(currentRows);

  const trend: MonthlyTrendPoint[] = trendPeriods.map((p) => ({
    period: p,
    ...metricsForPeriod(p),
  }));

  const currentMonthRaw = rawRows.filter((r) => dateToYearMonthKey(r.occurredOn) === currentKey);
  const monthFlow = buildMonthFlowSummary(currentMonthRaw);

  return {
    period: currentPeriod,
    trendMonthCount,
    executive,
    comparison,
    spendingBreakdown,
    trend,
    monthFlow,
  };
}
