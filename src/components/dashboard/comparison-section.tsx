import type { MonthComparison } from "@/lib/analytics/types";
import {
  formatCurrencyKRW,
  formatPercentDelta,
  formatSignedCurrencyKRW,
  periodLabel,
} from "./format-display";

type Props = {
  comparison: MonthComparison;
};

function DeltaRow({
  title,
  delta,
  invertGood,
}: {
  title: string;
  delta: MonthComparison["spending"];
  /** e.g. lower spending is “good” */
  invertGood?: boolean;
}) {
  const abs = delta.absoluteDelta;
  const good =
    abs === 0
      ? null
      : invertGood
        ? abs < 0
        : abs > 0;
  const tone =
    good === null ? "text-slate-600" : good ? "text-emerald-700" : "text-rose-700";

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-medium text-slate-700">{title}</span>
      <div className={`flex flex-wrap items-baseline gap-x-3 text-sm tabular-nums ${tone}`}>
        <span>
          전월 {formatCurrencyKRW(delta.previous)} → 당월 {formatCurrencyKRW(delta.current)}
        </span>
        <span className="font-semibold">{formatSignedCurrencyKRW(delta.absoluteDelta)}</span>
        <span className="text-slate-600">({formatPercentDelta(delta.percentDelta)})</span>
      </div>
    </div>
  );
}

export function ComparisonSection({ comparison }: Props) {
  return (
    <section aria-label="전월 대비">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        전월 대비 ({periodLabel(comparison.previousPeriod)} → {periodLabel(comparison.currentPeriod)})
      </h2>
      <div className="space-y-2">
        <DeltaRow title="지출" delta={comparison.spending} invertGood />
        <DeltaRow title="수입" delta={comparison.income} />
        <DeltaRow title="투자(이체)" delta={comparison.investment} />
        <DeltaRow title="순현금흐름" delta={comparison.netCashflow} />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        퍼센트는 전월이 0일 때 표시하지 않습니다(—). 색은 지표 특성에 따른 방향 힌트입니다.
      </p>
    </section>
  );
}
