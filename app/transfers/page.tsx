import Link from "next/link";
import { getPendingTransfers } from "@/services/pending-transfers";
import { PendingTransferList } from "./pending-transfer-list";

/** Always load from DB; avoids build-time prerender without DATABASE_URL. */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "이체 분류",
};

export default async function TransfersPage() {
  const initialRows = await getPendingTransfers();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-sm shadow-slate-200/50 backdrop-blur-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-600/90">Transfers</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">이체 분류</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            업로드 시 <strong className="font-semibold text-slate-800">소비·수입·자산이동·사업비</strong>로 자동 분류됩니다. 바꾸려면{" "}
            <Link href="/dashboard" className="font-medium text-indigo-700 underline-offset-2 hover:underline">
              대시보드
            </Link>
            의 「빠른 재분류」에서 한 번에 고르세요. 아래 목록은 예전처럼 분류가 비어 있는 이체 건만
            보여 줍니다(대부분 비어 있을 수 있습니다).
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            홈
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-2 text-sm font-medium text-indigo-800 transition hover:bg-indigo-100"
          >
            대시보드
          </Link>
        </div>
      </div>

      <PendingTransferList initialRows={initialRows} />
    </main>
  );
}
