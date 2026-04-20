import type { ExecutiveSummary } from "@/lib/analytics/types";
import { formatCurrencyKRW } from "./format-display";

type Props = {
  executive: ExecutiveSummary;
};

export function ExecutiveSummaryCards({ executive }: Props) {
  const cards: {
    label: string;
    value: string;
    tone: string;
    hint?: string;
  }[] = [
    { label: "총 수입", value: formatCurrencyKRW(executive.totalIncome), tone: "text-emerald-800" },
    { label: "총 지출", value: formatCurrencyKRW(executive.totalSpending), tone: "text-rose-800" },
    {
      label: "순현금흐름",
      value: formatCurrencyKRW(executive.netCashflow),
      tone: executive.netCashflow >= 0 ? "text-slate-900" : "text-amber-800",
      hint: "수입 − 지출 (계좌 이체·자산이동 제외)",
    },
    { label: "투자(이체)", value: formatCurrencyKRW(executive.totalInvestment), tone: "text-indigo-800" },
    { label: "거래 건수", value: `${executive.transactionCount.toLocaleString("ko-KR")}건`, tone: "text-slate-800" },
  ];

  return (
    <section aria-label="요약 지표">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">요약</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <li
            key={c.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-medium text-slate-500">{c.label}</p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${c.tone}`}>{c.value}</p>
            {c.hint ? <p className="mt-1 text-[11px] leading-snug text-slate-500">{c.hint}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
