import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(79,70,229,0.22),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-32 top-1/4 h-96 w-96 rounded-full bg-indigo-400/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl"
        aria-hidden
      />

      <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600/90">Personal Finance</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          흐름이 보이면,
          <br />
          <span className="bg-gradient-to-r from-indigo-700 to-violet-600 bg-clip-text text-transparent">
            결정이 쉬워집니다
          </span>
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
          엑셀 가계부를 업로드하고 월별 자산·지표·미분류 이체를 한 화면에서 정리하세요.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 hover:shadow-indigo-500/30"
          >
            대시보드 열기
          </Link>
          <Link
            href="/transfers"
            className="text-sm font-medium text-slate-600 underline-offset-4 transition hover:text-slate-900 hover:underline"
          >
            이체 분류 →
          </Link>
        </div>
        <p className="mt-16 text-xs text-slate-400">로컬에서 실행 중인 개인용 도구입니다.</p>
      </main>
    </div>
  );
}
