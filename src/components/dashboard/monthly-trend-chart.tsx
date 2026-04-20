"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyTrendPoint } from "@/lib/analytics/types";
import { formatCurrencyKRW } from "./format-display";

type Props = {
  trend: MonthlyTrendPoint[];
};

export function MonthlyTrendChart({ trend }: Props) {
  const data = trend.map((t) => ({
    label: `${t.period.year % 100}/${String(t.period.month).padStart(2, "0")}`,
    수입: t.totalIncome,
    지출: t.totalSpending,
    투자: t.totalInvestment,
    순현금: t.netCashflow,
  }));

  if (data.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
        트렌드 데이터가 없습니다.
      </p>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} width={44} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(v) => formatCurrencyKRW(v === undefined ? 0 : Number(v))}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="수입" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="지출" stroke="#e11d48" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="투자" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="순현금" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
