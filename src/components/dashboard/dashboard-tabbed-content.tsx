import { DashboardBody } from "@/components/dashboard/dashboard-body";
import { DashboardMainTabs } from "@/components/dashboard/dashboard-main-tabs";
import { MainDashboardView } from "@/components/dashboard/main-dashboard-view";
import { MonthNav } from "@/components/dashboard/month-nav";
import { PrefetchAdjacentMonths } from "@/components/dashboard/prefetch-adjacent-months";
import { QuickReclassifyPanel } from "@/components/dashboard/quick-reclassify-panel";
import { Sheet1ReportSection } from "@/components/dashboard/sheet1-report-section";
import {
  netAssetsWonFromExtra,
  resolveTotalAssetsWon,
  stockPieFromSheet1Extra,
} from "@/lib/dashboard/sheet1-snapshot-assets";
import { isPrismaConnectionError } from "@/lib/prisma-connection-error";
import { AnalyticsValidationError, getAnalyticsSummary } from "@/services/analytics-summary";
import {
  getMonthTransactionsForDashboard,
  getMonthUnclassifiedTransactions,
} from "@/services/month-transactions";
import { getLatestWorkbookSheet1Snapshot } from "@/services/sheet1-snapshot";

type Props = {
  year: number;
  month: number;
};

/**
 * 대시보드 본문(탭 + 데이터). `page.tsx`에서 `<Suspense>`로 감싸
 * 헤더를 먼저 스트리밍한 뒤 DB 조회가 끝나면 채웁니다 (Vercel↔Supabase 지연 체감 완화).
 */
export async function DashboardTabbedContent({ year, month }: Props) {
  let errorMessage: string | null = null;
  let data = null;
  let sheet1Snapshot: Awaited<ReturnType<typeof getLatestWorkbookSheet1Snapshot>> = null;
  let txRows: Awaited<ReturnType<typeof getMonthTransactionsForDashboard>> = [];
  let uncRows: Awaited<ReturnType<typeof getMonthUnclassifiedTransactions>> = [];

  try {
    /**
     * 스냅샷·월 거래·미분류·분석 요약을 한꺼번에 병렬 실행합니다.
     * 예전에는 분석을 두 번째 단계에서만 await 해 Vercel↔Supabase 왕복이 순차로 두 번이었습니다.
     */
    const [s1, t, u, analyticsOutcome] = await Promise.all([
      getLatestWorkbookSheet1Snapshot(),
      getMonthTransactionsForDashboard(year, month, 50),
      getMonthUnclassifiedTransactions(year, month, 100),
      getAnalyticsSummary(year, month, { trendMonthCount: 6 })
        .then((d) => ({ ok: true as const, data: d }))
        .catch((e: unknown) => ({ ok: false as const, error: e })),
    ]);
    sheet1Snapshot = s1;
    txRows = t;
    uncRows = u;

    if (analyticsOutcome.ok) {
      data = analyticsOutcome.data;
    } else {
      const e = analyticsOutcome.error;
      if (e instanceof AnalyticsValidationError) {
        errorMessage = e.message;
      } else if (isPrismaConnectionError(e)) {
        errorMessage =
          "데이터베이스에 연결할 수 없습니다. Supabase 프로젝트가 일시 중지되지 않았는지, .env의 DATABASE_URL이 맞는지, 네트워크·VPN·방화벽을 확인해 주세요.";
        console.error("[dashboard] database unreachable", e);
      } else {
        errorMessage = "분석 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
        console.error("[dashboard]", e);
      }
    }
  } catch (e) {
    if (isPrismaConnectionError(e)) {
      errorMessage =
        "데이터베이스에 연결할 수 없습니다. Supabase 프로젝트가 일시 중지되지 않았는지, .env의 DATABASE_URL이 맞는지, 네트워크·VPN·방화벽을 확인해 주세요.";
      console.error("[dashboard] database unreachable", e);
    } else {
      throw e;
    }
  }

  const mapTx = (
    rows: typeof txRows,
  ): {
    id: string;
    occurredOn: string;
    amount: string;
    merchant: string;
    classification: { code: string; label: string } | null;
  }[] =>
    rows.map((t) => ({
      id: t.id,
      occurredOn: t.occurredOn.toISOString().slice(0, 10),
      amount: t.amount,
      merchant: t.merchant,
      classification: t.classification,
    }));

  const reclassify = { transactions: mapTx(txRows) };

  const period = { year, month };
  const extra = sheet1Snapshot?.extra ?? null;

  const mainPanel = (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-200/80 bg-white/60 p-4 shadow-sm ring-1 ring-slate-100">
        <MonthNav current={period} />
      </div>
      <MainDashboardView
        year={year}
        month={month}
        totalAssetsWon={resolveTotalAssetsWon(extra)}
        netAssetsWon={netAssetsWonFromExtra(extra)}
        stockPie={stockPieFromSheet1Extra(extra)}
        monthFlow={data?.monthFlow ?? null}
      />
    </div>
  );

  const summaryPanel = sheet1Snapshot ? (
    <Sheet1ReportSection
      snapshot={{
        customer: sheet1Snapshot.customer,
        cashflow: sheet1Snapshot.cashflow,
        extra: sheet1Snapshot.extra,
        account: sheet1Snapshot.account,
        upload: sheet1Snapshot.upload,
      }}
    />
  ) : (
    <p className="text-sm text-slate-600">
      아직 Sheet1 요약이 없습니다. <strong className="text-slate-800">두 시트 이상</strong> 있는 엑셀(요약 + 거래)을 업로드하면
      고객·재무현황·현금흐름 요약이 여기에 표시됩니다.
    </p>
  );

  const ledgerPanel = (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-200/80 bg-white/60 p-4 shadow-sm ring-1 ring-slate-100">
        <MonthNav current={period} />
      </div>

      {data ? <DashboardBody data={data} reclassify={reclassify} /> : null}
    </div>
  );

  const unclassifiedPanel = (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-200/80 bg-white/60 p-4 shadow-sm ring-1 ring-slate-100">
        <MonthNav current={period} />
      </div>
      <p className="text-sm text-slate-600">
        타입이 <strong className="text-slate-800">이체·계좌이체</strong>인 거래는 자동으로 여기 모입니다. 아래에서 수입·소비·사업비·자산이동으로
        지정하세요.
      </p>
      <QuickReclassifyPanel year={year} month={month} transactions={mapTx(uncRows)} />
    </div>
  );

  return (
    <>
      <PrefetchAdjacentMonths current={{ year, month }} />
      {errorMessage ? (
        <div
          className="mb-6 rounded-xl border border-red-200/90 bg-red-50/95 px-4 py-3.5 text-sm text-red-900 shadow-sm ring-1 ring-red-100"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}

      <DashboardMainTabs
        mainPanel={mainPanel}
        summaryPanel={summaryPanel}
        ledgerPanel={ledgerPanel}
        unclassifiedPanel={unclassifiedPanel}
      />
    </>
  );
}
