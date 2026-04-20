/** Suspense fallback — 본문 데이터 로딩 중 (헤더는 이미 표시됨). */
export function DashboardTabsSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg ring-1 ring-slate-100">
      <div className="flex flex-wrap gap-1 border-b border-slate-100 bg-slate-50/90 p-1.5 sm:gap-2">
        {["메인", "Sheet1 요약", "가계부 · 지표", "미분류"].map((label) => (
          <div
            key={label}
            className="h-10 w-24 animate-pulse rounded-xl bg-slate-200/80 sm:w-28"
            aria-hidden
          />
        ))}
      </div>
      <div className="space-y-6 px-4 py-8 sm:px-7">
        <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-slate-200/70" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-28 animate-pulse rounded-2xl bg-slate-200/60" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-200/60" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-200/60" />
        </div>
        <div className="h-48 animate-pulse rounded-2xl bg-slate-200/50" />
        <p className="text-center text-sm text-slate-500">데이터를 불러오는 중…</p>
      </div>
    </div>
  );
}
