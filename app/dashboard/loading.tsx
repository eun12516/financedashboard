export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 h-10 w-64 animate-pulse rounded bg-slate-200" />
      <div className="mb-8 h-24 animate-pulse rounded-xl bg-slate-200" />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
    </main>
  );
}
