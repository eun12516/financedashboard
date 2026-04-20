import { LoginForm } from "./login-form";

export const metadata = {
  title: "로그인",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const nextRaw = sp.next;
  const defaultNext = typeof nextRaw === "string" && nextRaw.startsWith("/") ? nextRaw : "/dashboard";

  return (
    <main className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-600/90">Auth</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">로그인</h1>
        <p className="mt-2 text-sm text-slate-600">이메일과 비밀번호로 계속합니다.</p>
      </div>
      <LoginForm defaultNext={defaultNext} />
    </main>
  );
}
