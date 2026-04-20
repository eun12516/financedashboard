import { SignupForm } from "./signup-form";

export const metadata = {
  title: "회원가입",
};

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-600/90">Auth</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">회원가입</h1>
        <p className="mt-2 text-sm text-slate-600">새 계정을 만들고 대시보드를 사용합니다.</p>
      </div>
      <SignupForm />
    </main>
  );
}
