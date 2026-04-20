/**
 * Dashboard-oriented analytics payloads (Step 4).
 * Amounts are numbers in natural currency units (e.g. KRW).
 */

export type YearMonth = {
  year: number;
  month: number;
};

/** Aggregated buckets for one calendar month (UTC boundaries). */
export type MonthlyMetricBuckets = {
  totalIncome: number;
  /** Positive magnitude: consumption / spending-side outflows only (see definitions). */
  totalSpending: number;
  /** Positive magnitude: investment-classified transfer activity in the month. */
  totalInvestment: number;
  /** Per spec: totalIncome − totalSpending (investment is reported separately). */
  netCashflow: number;
  /** All transactions dated in the month, including asset movements and pending transfers. */
  transactionCount: number;
};

export type ExecutiveSummary = MonthlyMetricBuckets & {
  period: YearMonth;
};

export type MetricDelta = {
  current: number;
  previous: number;
  absoluteDelta: number;
  /** null when previous === 0 and current ≠ 0 (undefined relative change). */
  percentDelta: number | null;
};

export type MonthComparison = {
  currentPeriod: YearMonth;
  previousPeriod: YearMonth;
  spending: MetricDelta;
  income: MetricDelta;
  investment: MetricDelta;
  netCashflow: MetricDelta;
};

export type CategorySpendRow = {
  category: string;
  amount: number;
  transactionCount: number;
};

export type MerchantSpendRow = {
  merchant: string;
  amount: number;
  transactionCount: number;
};

export type SpendingBreakdown = {
  byCategory: CategorySpendRow[];
  topMerchants: MerchantSpendRow[];
};

export type MonthlyTrendPoint = {
  period: YearMonth;
} & MonthlyMetricBuckets;

/** 이번 달 분류별 유입·유출 (금액 부호 기준). */
export type MonthClassificationFlowRow = {
  code: string;
  label: string;
  /** 해당 분류 행들의 amount 합계 */
  net: number;
  /** 양수 amount 합 */
  inflow: number;
  /** 음수 amount 절대값 합 */
  outflow: number;
};

export type MonthFlowSummary = {
  totalInflow: number;
  totalOutflow: number;
  /** 월 전체 amount 합 (유입−유출과 일치) */
  netChange: number;
  byClassification: MonthClassificationFlowRow[];
};

export type AnalyticsSummaryResponse = {
  period: YearMonth;
  trendMonthCount: number;
  executive: ExecutiveSummary;
  comparison: MonthComparison;
  spendingBreakdown: SpendingBreakdown;
  trend: MonthlyTrendPoint[];
  monthFlow: MonthFlowSummary;
};
