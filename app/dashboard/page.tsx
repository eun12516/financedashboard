import Link from "next/link";
import { Suspense } from "react";
import { DashboardTabbedContent } from "@/components/dashboard/dashboard-tabbed-content";
import { DashboardTabsSkeleton } from "@/components/dashboard/dashboard-tabs-skeleton";
import { DashboardUploadDialog } from "@/components/dashboard/dashboard-upload-dialog";
import { parseDashboardPeriod } from "@/lib/dashboard/parse-period";

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
              prefetch
            >
              홈
            </Link>
          </nav>
        </div>
      </header>

      <Suspense fallback={<DashboardTabsSkeleton />}>
        <DashboardTabbedContent year={period.year} month={period.month} />
      </Suspense>
    </main>
  );
}
