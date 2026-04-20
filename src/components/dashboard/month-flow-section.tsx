import type { MonthFlowSummary } from "@/lib/analytics/types";

function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}

type Props = {
  flow: MonthFlowSummary;
  year: number;
  month: number;
};

export function MonthFlowSection({ flow, year, month }: Props) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="월별 유입·유출">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        이번 달 자산 흐름 ({year}-{String(month).padStart(2, "0")})
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        여기서의 <strong className="font-medium text-slate-700">월 순변동</strong>은 모든 거래 금액의 합(이체 포함)입니다. 위 요약의{" "}
        <strong className="font-medium text-slate-700">순현금흐름</strong>은 수입·지출만 반영하고 자산이동·계좌 이체는
        제외합니다. 엑셀 금액은 <strong className="font-medium text-slate-700">타입(지출/수입)</strong>에 맞게 부호를 맞춥니다.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-emerald-50 px-4 py-3">
          <p className="text-xs font-medium text-emerald-800">총 유입 (+)</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-900">{fmt(flow.totalInflow)}원</p>
        </div>
        <div className="rounded-lg bg-rose-50 px-4 py-3">
          <p className="text-xs font-medium text-rose-800">총 유출 (−)</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-rose-900">{fmt(flow.totalOutflow)}원</p>
        </div>
        <div className="rounded-lg bg-slate-100 px-4 py-3">
          <p className="text-xs font-medium text-slate-600">월 순변동</p>
          <p
            className={`mt-1 text-xl font-semibold tabular-nums ${flow.netChange >= 0 ? "text-emerald-800" : "text-rose-800"}`}
          >
            {flow.netChange >= 0 ? "+" : ""}
            {fmt(flow.netChange)}원
          </p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="py-2 pr-3 font-medium">분류</th>
              <th className="py-2 pr-3 font-medium">순합계</th>
              <th className="py-2 pr-3 font-medium text-emerald-700">유입</th>
              <th className="py-2 font-medium text-rose-700">유출</th>
            </tr>
          </thead>
          <tbody>
            {flow.byClassification.map((row) => (
              <tr key={row.code} className="border-b border-slate-100">
                <td className="py-2 pr-3 font-medium text-slate-800">{row.label}</td>
                <td className="py-2 pr-3 tabular-nums text-slate-700">
                  {row.net >= 0 ? "+" : ""}
                  {fmt(row.net)}
                </td>
                <td className="py-2 pr-3 tabular-nums text-emerald-800">{fmt(row.inflow)}</td>
                <td className="py-2 tabular-nums text-rose-800">{fmt(row.outflow)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
