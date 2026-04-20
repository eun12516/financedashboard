import Link from "next/link";
import { Suspense } from "react";
import { DashboardBody } from "@/components/dashboard/dashboard-body";
import { DashboardMainTabs } from "@/components/dashboard/dashboard-main-tabs";
import { DashboardUploadDialog } from "@/components/dashboard/dashboard-upload-dialog";
import { MainDashboardView } from "@/components/dashboard/main-dashboard-view";
import { MonthNav } from "@/components/dashboard/month-nav";
import { QuickReclassifyPanel } from "@/components/dashboard/quick-reclassify-panel";
import { Sheet1ReportSection } from "@/components/dashboard/sheet1-report-section";
import {
  netAssetsWonFromExtra,
  resolveTotalAssetsWon,
  stockPieFromSheet1Extra,
} from "@/lib/dashboard/sheet1-snapshot-assets";
import { parseDashboardPeriod } from "@/lib/dashboard/parse-period";
import { isPrismaConnectionError } from "@/lib/prisma-connection-error";
import { AnalyticsValidationError, getAnalyticsSummary } from "@/services/analytics-summary";
import {
  getMonthTransactionsForDashboard,
  getMonthUnclassifiedTransactions,
} from "@/services/month-transactions";
import { getLatestWorkbookSheet1Snapshot } from "@/services/sheet1-snapshot";

export const dynamic = "force-dynamic";

/** Prisma / Node APIs — never Edge. */
export const runtime = "nodejs";

export const metadata = {
  title: "대시보드",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const period = parseDashboardPeriod(sp);

  let errorMessage: string | null = null;
  let data = null;
  let sheet1Snapshot: Awaited<ReturnType<typeof getLatestWorkbookSheet1Snapshot>> = null;
  let txRows: Awaited<ReturnType<typeof getMonthTransactionsForDashboard>> = [];
  let uncRows: Awaited<ReturnType<typeof getMonthUnclassifiedTransactions>> = [];

  try {
    const [s1, t, u] = await Promise.all([
      getLatestWorkbookSheet1Snapshot(),
      getMonthTransactionsForDashboard(period.year, period.month, 50),
      getMonthUnclassifiedTransactions(period.year, period.month, 100),
    ]);
    sheet1Snapshot = s1;
    txRows = t;
    uncRows = u;
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

  if (!errorMessage) {
    try {
      data = await getAnalyticsSummary(period.year, period.month, { trendMonthCount: 6 });
    } catch (e) {
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
  }

  const extra = sheet1Snapshot?.extra ?? null;

  const mainPanel = (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-200/80 bg-white/60 p-4 shadow-sm ring-1 ring-slate-100">
        <MonthNav current={period} />
      </div>
      <MainDashboardView
        year={period.year}
        month={period.month}
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
      <QuickReclassifyPanel
        year={period.year}
        month={period.month}
        transactions={mapTx(uncRows)}
      />
    </div>
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-col gap-6 rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-sm shadow-slate-200/50 backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-600/90">Dashboard</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">재무 대시보드</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
            메인에서 자산·투자 비중을 보고, 미분류 탭에서 이체 거래 분류를 정리할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DashboardUploadDialog />
          <nav className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              홈
            </Link>
          </nav>
        </div>
      </header>

      {errorMessage ? (
        <div
          className="mb-6 rounded-xl border border-red-200/90 bg-red-50/95 px-4 py-3.5 text-sm text-red-900 shadow-sm ring-1 ring-red-100"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}

      <Suspense
        fallback={
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-6 py-14 text-center text-sm text-slate-500 shadow-inner">
            탭을 불러오는 중…
          </div>
        }
      >
        <DashboardMainTabs
          mainPanel={mainPanel}
          summaryPanel={summaryPanel}
          ledgerPanel={ledgerPanel}
          unclassifiedPanel={unclassifiedPanel}
        />
      </Suspense>
    </main>
  );
}
