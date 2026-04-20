import type { AnalyticsSummaryResponse } from "@/lib/analytics/types";

function periodLabel(p: { year: number; month: number }): string {
  return `${p.year}년 ${p.month}월`;
}

/**
 * Compact, AI-safe view of analytics only (no raw transactions).
 * All concentration ratios use **spending-side totals** from executive summary.
 */
export type CompactAnalyticsPayload = {
  period: { year: number; month: number };
  currency: "KRW";
  executive: {
    totalIncome: number;
    totalSpending: number;
    netCashflow: number;
    totalInvestment: number;
    transactionCount: number;
  };
  comparison: {
    previousPeriod: { year: number; month: number };
    spending: MetricSlice;
    income: MetricSlice;
    investment: MetricSlice;
    netCashflow: MetricSlice;
  };
  spendingConcentration: {
    topCategories: ConcentrationRow[];
    topMerchants: ConcentrationRow[];
  };
  trend: {
    /** Oldest → newest (same span as analytics trend). */
    months: {
      label: string;
      totalIncome: number;
      totalSpending: number;
      netCashflow: number;
      totalInvestment: number;
    }[];
  };
  /** 분류별 유입·유출 — LLM이 소비/수입/이체/사업비 맥락을 잡기 위함 */
  monthFlow: {
    totalInflow: number;
    totalOutflow: number;
    netChange: number;
    byClassification: { code: string; label: string; net: number; inflow: number; outflow: number }[];
  };
  eligibility: {
    sufficientForLLM: boolean;
    /** Human-readable reason when data is thin. */
    note?: string;
  };
};

type MetricSlice = {
  current: number;
  previous: number;
  absoluteDelta: number;
  percentDelta: number | null;
};

type ConcentrationRow = {
  name: string;
  amount: number;
  /** Share of `executive.totalSpending` for the selected month; null if denominator is 0. */
  shareOfTotalSpendingPct: number | null;
};

function topNWithShare(
  rows: { name: string; amount: number }[],
  totalSpending: number,
  n: number,
): ConcentrationRow[] {
  return rows.slice(0, n).map((r) => ({
    name: r.name,
    amount: r.amount,
    shareOfTotalSpendingPct:
      totalSpending > 0 ? (r.amount / totalSpending) * 100 : null,
  }));
}

export function buildCompactAnalyticsPayload(
  analytics: AnalyticsSummaryResponse,
): CompactAnalyticsPayload {
  const { executive, comparison, spendingBreakdown, trend, period, monthFlow } = analytics;
  const totalSpending = executive.totalSpending;

  const topCategories = topNWithShare(
    spendingBreakdown.byCategory.map((c) => ({
      name: c.category,
      amount: c.amount,
    })),
    totalSpending,
    5,
  );

  const topMerchants = topNWithShare(
    spendingBreakdown.topMerchants.map((m) => ({
      name: m.merchant,
      amount: m.amount,
    })),
    totalSpending,
    5,
  );

  const tx = executive.transactionCount;
  const hasFlows =
    executive.totalIncome > 0 || executive.totalSpending > 0 || executive.totalInvestment > 0;
  const sufficientForLLM = tx >= 3 && hasFlows;

  let note: string | undefined;
  if (tx === 0) {
    note = "선택한 달에 거래가 없습니다.";
  } else if (!hasFlows) {
    note = "수입·지출·투자 금액이 모두 0에 가깝습니다.";
  } else if (tx < 3) {
    note = "거래 건수가 적어 인사이트 신뢰도가 낮을 수 있습니다.";
  }

  return {
    period,
    currency: "KRW",
    executive: {
      totalIncome: executive.totalIncome,
      totalSpending: executive.totalSpending,
      netCashflow: executive.netCashflow,
      totalInvestment: executive.totalInvestment,
      transactionCount: executive.transactionCount,
    },
    comparison: {
      previousPeriod: comparison.previousPeriod,
      spending: {
        current: comparison.spending.current,
        previous: comparison.spending.previous,
        absoluteDelta: comparison.spending.absoluteDelta,
        percentDelta: comparison.spending.percentDelta,
      },
      income: {
        current: comparison.income.current,
        previous: comparison.income.previous,
        absoluteDelta: comparison.income.absoluteDelta,
        percentDelta: comparison.income.percentDelta,
      },
      investment: {
        current: comparison.investment.current,
        previous: comparison.investment.previous,
        absoluteDelta: comparison.investment.absoluteDelta,
        percentDelta: comparison.investment.percentDelta,
      },
      netCashflow: {
        current: comparison.netCashflow.current,
        previous: comparison.netCashflow.previous,
        absoluteDelta: comparison.netCashflow.absoluteDelta,
        percentDelta: comparison.netCashflow.percentDelta,
      },
    },
    spendingConcentration: {
      topCategories,
      topMerchants,
    },
    trend: {
      months: trend.map((t) => ({
        label: periodLabel(t.period),
        totalIncome: t.totalIncome,
        totalSpending: t.totalSpending,
        netCashflow: t.netCashflow,
        totalInvestment: t.totalInvestment,
      })),
    },
    monthFlow: {
      totalInflow: monthFlow.totalInflow,
      totalOutflow: monthFlow.totalOutflow,
      netChange: monthFlow.netChange,
      byClassification: monthFlow.byClassification.map((r) => ({
        code: r.code,
        label: r.label,
        net: r.net,
        inflow: r.inflow,
        outflow: r.outflow,
      })),
    },
    eligibility: {
      sufficientForLLM,
      note,
    },
  };
}

/** String sent to the LLM (JSON pretty-printed). */
export function compactPayloadToPromptJson(payload: CompactAnalyticsPayload): string {
  return JSON.stringify(payload, null, 2);
}
