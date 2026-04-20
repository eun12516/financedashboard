import type { AnalyticsSummaryResponse } from "@/lib/analytics/types";
import { AiInsightsSection } from "./ai-insights-section";
import { ComparisonSection } from "./comparison-section";
import { ExecutiveSummaryCards } from "./executive-summary-cards";
import { MonthFlowSection } from "./month-flow-section";
import { MonthlyTrendChart } from "./monthly-trend-chart";
import { QuickReclassifyPanel } from "./quick-reclassify-panel";
import { SpendingBreakdownCharts } from "./spending-breakdown-charts";

type ReclassifyBundle = {
  transactions: Array<{
    id: string;
    occurredOn: string;
    amount: string;
    merchant: string;
    classification: { code: string; label: string } | null;
  }>;
};

type Props = {
  data: AnalyticsSummaryResponse;
  reclassify: ReclassifyBundle;
};

/**
 * Presentational shell: backend analytics + 월 유입·유출 + 빠른 재분류.
 */
export function DashboardBody({ data, reclassify }: Props) {
  const emptyMonth = data.executive.transactionCount === 0;

  return (
    <div className="space-y-10">
      {emptyMonth ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          이 달에 저장된 거래가 없습니다. 파일을 업로드하면 지표가 채워집니다.
        </div>
      ) : null}

      <MonthFlowSection flow={data.monthFlow} year={data.period.year} month={data.period.month} />

      <QuickReclassifyPanel
        key={`${data.period.year}-${data.period.month}`}
        year={data.period.year}
        month={data.period.month}
        transactions={reclassify.transactions}
      />

      <ExecutiveSummaryCards executive={data.executive} />
      <ComparisonSection comparison={data.comparison} />

      <section aria-label="지출 구성">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          지출 구성
        </h2>
        <SpendingBreakdownCharts breakdown={data.spendingBreakdown} />
      </section>

      <section aria-label="월별 추이">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
          최근 {data.trendMonthCount}개월 추이
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          수입·지출·투자(이체)·순현금흐름(수입−지출). 단위는 원화 표기입니다.
        </p>
        <MonthlyTrendChart trend={data.trend} />
      </section>

      <AiInsightsSection year={data.period.year} month={data.period.month} />
    </div>
  );
}
