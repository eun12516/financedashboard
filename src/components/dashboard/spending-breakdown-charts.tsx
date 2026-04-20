"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SpendingBreakdown } from "@/lib/analytics/types";
import { formatCurrencyKRW } from "./format-display";

type Props = {
  breakdown: SpendingBreakdown;
};

export function SpendingBreakdownCharts({ breakdown }: Props) {
  const catData = breakdown.byCategory.map((r) => ({
    name: r.category.length > 24 ? `${r.category.slice(0, 24)}…` : r.category,
    fullName: r.category,
    amount: r.amount,
    count: r.transactionCount,
  }));

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">카테고리별 지출</h3>
        {catData.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
            표시할 지출 분류가 없습니다. (이체·투자·자산 이동 등은 지출 분석에서 제외될 수 있습니다.)
          </p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={catData} margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis type="number" tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) =>
                    formatCurrencyKRW(value === undefined ? 0 : Number(value))
                  }
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload as { fullName?: string } | undefined;
                    return p?.fullName ?? "";
                  }}
                />
                <Bar dataKey="amount" fill="#6366f1" name="지출" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">가맹점 TOP 10</h3>
        {breakdown.topMerchants.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
            가맹점별 지출 데이터가 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {breakdown.topMerchants.map((m, i) => (
              <li key={`${m.merchant}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
                <span className="truncate text-slate-800" title={m.merchant}>
                  <span className="mr-2 font-mono text-xs text-slate-400">{i + 1}.</span>
                  {m.merchant}
                </span>
                <span className="shrink-0 tabular-nums font-medium text-slate-900">
                  {formatCurrencyKRW(m.amount)}
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    {m.transactionCount}건
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
