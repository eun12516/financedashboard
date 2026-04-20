import Link from "next/link";
import { adjacentMonth } from "@/lib/dashboard/parse-period";
import type { YearMonth } from "@/lib/analytics/types";
import { periodLabel } from "./format-display";

type Props = {
  current: YearMonth;
};

function href(p: YearMonth) {
  return `/dashboard?year=${p.year}&month=${p.month}`;
}

/** GET form + prev/next links — no client JS required for navigation. */
export function MonthNav({ current }: Props) {
  const prev = adjacentMonth(current.year, current.month, -1);
  const next = adjacentMonth(current.year, current.month, 1);
  const years = Array.from({ length: 12 }, (_, i) => new Date().getUTCFullYear() - i);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={href(prev)}
          prefetch
          scroll={false}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/50"
        >
          ← 이전 달
        </Link>
        <Link
          href={href(next)}
          prefetch
          scroll={false}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/50"
        >
          다음 달 →
        </Link>
        <span className="ml-2 text-lg font-semibold tracking-tight text-slate-900">
          {periodLabel(current)}
        </span>
      </div>

      <form method="get" action="/dashboard" className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-xs font-medium text-slate-600">
          연도
          <select
            name="year"
            defaultValue={String(current.year)}
            className="mt-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs font-medium text-slate-600">
          월
          <select
            name="month"
            defaultValue={String(current.month)}
            className="mt-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-500"
        >
          이동
        </button>
      </form>
    </div>
  );
}
