import type {
  Sheet1Cashflow,
  Sheet1Customer,
  Sheet1Extra,
} from "@/lib/ingestion/parse-sheet1-summary";

type Snapshot = {
  customer: unknown;
  cashflow: unknown;
  extra: unknown;
  account: { name: string };
  upload: { originalFilename: string; createdAt: Date };
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("ko-KR");
}

type Props = {
  snapshot: Snapshot;
};

export function Sheet1ReportSection({ snapshot }: Props) {
  const customer = isRecord(snapshot.customer) ? (snapshot.customer as Sheet1Customer) : undefined;
  const cashflow = isRecord(snapshot.cashflow) ? (snapshot.cashflow as Sheet1Cashflow) : undefined;
  const extra = isRecord(snapshot.extra) ? (snapshot.extra as Sheet1Extra) : undefined;

  const hasAny = customer || cashflow || extra?.finance || (extra?.investments?.length ?? 0) > 0;
  if (!hasAny) return null;

  return (
    <section className="space-y-8" aria-label="엑셀 요약 리포트(Sheet1)">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          업로드 파일 요약 (Sheet1)
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          거래 내역은 Sheet2만 저장됩니다. 아래는 같은 파일의 요약 탭을 읽어 온 값입니다.{" "}
          <span className="text-slate-600">
            {snapshot.upload.originalFilename} · {snapshot.account.name} ·{" "}
            {snapshot.upload.createdAt.toLocaleString("ko-KR")}
          </span>
        </p>
      </div>

      {customer ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">1. 고객정보</h3>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {customer.name ? (
              <div>
                <p className="text-xs text-slate-500">이름</p>
                <p className="font-medium text-slate-900">{customer.name}</p>
              </div>
            ) : null}
            {customer.gender ? (
              <div>
                <p className="text-xs text-slate-500">성별</p>
                <p className="font-medium text-slate-900">{customer.gender}</p>
              </div>
            ) : null}
            {customer.age != null ? (
              <div>
                <p className="text-xs text-slate-500">연령</p>
                <p className="font-medium text-slate-900">{customer.age}세</p>
              </div>
            ) : null}
            {customer.creditScore != null ? (
              <div>
                <p className="text-xs text-slate-500">신용점수</p>
                <p className="font-medium text-slate-900">{fmt(customer.creditScore)}</p>
              </div>
            ) : null}
            {customer.email ? (
              <div>
                <p className="text-xs text-slate-500">이메일</p>
                <p className="font-medium text-slate-900">{customer.email}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {extra?.finance ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">3. 재무현황</h3>
          <div className="mt-3 flex flex-wrap gap-6 text-sm">
            {extra.finance.totalAssets != null ? (
              <div>
                <p className="text-xs text-slate-500">총자산</p>
                <p className="text-lg font-semibold tabular-nums text-slate-900">
                  {fmt(extra.finance.totalAssets)}원
                </p>
              </div>
            ) : null}
            {extra.finance.totalDebts != null ? (
              <div>
                <p className="text-xs text-slate-500">총부채</p>
                <p className="text-lg font-semibold tabular-nums text-slate-900">
                  {fmt(extra.finance.totalDebts)}원
                </p>
              </div>
            ) : null}
            {extra.finance.netAssets != null ? (
              <div>
                <p className="text-xs text-slate-500">순자산</p>
                <p className="text-lg font-semibold tabular-nums text-slate-900">
                  {fmt(extra.finance.netAssets)}원
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {cashflow?.rows?.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">2. 현금흐름현황</h3>
          <p className="mt-1 text-xs text-slate-500">최근 월별 열 기준 집계입니다.</p>
          <div className="mt-3 max-w-full overflow-x-auto">
            <table className="min-w-[720px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="sticky left-0 z-10 bg-slate-50 px-2 py-2 font-medium text-slate-700">
                    항목
                  </th>
                  <th className="px-2 py-2 font-medium text-slate-700">총계</th>
                  <th className="px-2 py-2 font-medium text-slate-700">월평균</th>
                  {cashflow.monthKeys.map((m) => (
                    <th key={m} className="whitespace-nowrap px-2 py-2 font-medium text-slate-600">
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cashflow.rows.map((row, ri) => (
                  <tr key={`${row.label}-${ri}`} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <td className="sticky left-0 bg-white px-2 py-1.5 font-medium text-slate-800">
                      {row.label}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-slate-700">
                      {fmt(row.total)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-slate-700">
                      {fmt(row.monthlyAverage)}
                    </td>
                    {cashflow.monthKeys.map((m) => (
                      <td key={m} className="whitespace-nowrap px-2 py-1.5 tabular-nums text-slate-600">
                        {fmt(row.byMonth[m] ?? 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {extra?.investments?.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">투자현황 (요약)</h3>
          <div className="mt-3 max-w-full overflow-x-auto">
            <table className="min-w-[640px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-2 py-2 font-medium">종류</th>
                  <th className="px-2 py-2 font-medium">금융사</th>
                  <th className="px-2 py-2 font-medium">상품명</th>
                  <th className="px-2 py-2 font-medium">투자원금</th>
                  <th className="px-2 py-2 font-medium">평가금액</th>
                  <th className="px-2 py-2 font-medium">수익률</th>
                </tr>
              </thead>
              <tbody>
                {extra.investments.map((inv, i) => (
                  <tr key={`${inv.productName}-${i}`} className="border-b border-slate-100">
                    <td className="px-2 py-1.5">{inv.kind}</td>
                    <td className="px-2 py-1.5">{inv.broker}</td>
                    <td className="px-2 py-1.5 text-slate-800">{inv.productName}</td>
                    <td className="px-2 py-1.5 tabular-nums">{fmt(inv.principal)}</td>
                    <td className="px-2 py-1.5 tabular-nums">{fmt(inv.valuation)}</td>
                    <td className="px-2 py-1.5 tabular-nums">
                      {inv.returnPct != null ? `${inv.returnPct}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
