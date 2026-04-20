"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { MonthFlowSummary } from "@/lib/analytics/types";
import type { StockPieSlice } from "@/lib/dashboard/sheet1-snapshot-assets";
import { MonthFlowSection } from "./month-flow-section";

const PIE_COLORS = [
  "#4f46e5",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0d9488",
  "#ea580c",
  "#64748b",
];

function fmt(n: number | null): string {
  if (n === null || Number.isNaN(n)) return "—";
  return `${n.toLocaleString("ko-KR")}원`;
}

type Props = {
  year: number;
  month: number;
  totalAssetsWon: number | null;
  netAssetsWon: number | null;
  stockPie: StockPieSlice[];
  monthFlow: MonthFlowSummary | null;
};

export function MainDashboardView({ year, month, totalAssetsWon, netAssetsWon, stockPie, monthFlow }: Props) {
  const piePositive = stockPie.filter((s) => s.value > 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600/90">메인 요약</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Sheet1 최신 업로드 기준 자산·투자 비중과, 선택한 달의 자산 흐름입니다.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-md shadow-slate-200/50 ring-1 ring-indigo-500/[0.06] transition hover:ring-indigo-500/15">
          <p className="text-xs font-medium text-slate-500">총자산 (요약)</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{fmt(totalAssetsWon)}</p>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            Sheet1 재무현황·투자 평가 합으로 추정. 파일을 다시 올리면 갱신됩니다.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-md shadow-slate-200/50 ring-1 ring-emerald-500/[0.06] transition hover:ring-emerald-500/15">
          <p className="text-xs font-medium text-slate-500">순자산 (요약)</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{fmt(netAssetsWon)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-indigo-50/80 to-white p-5 shadow-md shadow-slate-200/50 sm:col-span-2 lg:col-span-1">
          <p className="text-xs font-medium text-slate-500">이번 달</p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-indigo-950">
            {year}년 {month}월
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-md shadow-slate-200/40 ring-1 ring-slate-100">
        <h3 className="text-sm font-semibold text-slate-800">주식·투자 비중 (Sheet1 평가금액)</h3>
        {piePositive.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            투자 평가 데이터가 없습니다. Sheet1에 투자현황 표가 있거나, 엑셀을 다시 업로드해 주세요.
          </p>
        ) : (
          <div className="mt-4 h-72 min-h-[288px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={piePositive}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => {
                    const n = String(name ?? "");
                    const short = n.length > 10 ? `${n.slice(0, 10)}…` : n;
                    return `${short} ${((percent ?? 0) * 100).toFixed(0)}%`;
                  }}
                >
                  {piePositive.map((_, i) => (
                    <Cell key={`c-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    typeof value === "number" && Number.isFinite(value)
                      ? `${value.toLocaleString("ko-KR")}원`
                      : ""
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {monthFlow ? (
        <MonthFlowSection flow={monthFlow} year={year} month={month} />
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/90 px-4 py-10 text-center text-sm text-slate-600">
          이 달 거래 요약을 불러오지 못했습니다. 가계부 탭에서 월을 바꾸거나 거래를 업로드해 주세요.
        </div>
      )}
    </div>
  );
}
