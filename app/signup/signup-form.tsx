"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendHint, setResendHint] = useState<string | null>(null);

  async function resendConfirmation() {
    const emailNorm = email.trim();
    if (!emailNorm) {
      setResendHint("위에 이메일 주소를 입력한 뒤 다시 시도해 주세요.");
      return;
    }
    setResendHint(null);
    setResendBusy(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: err } = await supabase.auth.resend({
        type: "signup",
        email: emailNorm,
      });
      if (err) {
        setResendHint(err.message);
        return;
      }
      setResendHint("인증 메일을 다시 보냈습니다. 스팸함도 확인해 보세요.");
    } finally {
      setResendBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const emailNorm = email.trim();
      const supabase = createBrowserSupabaseClient();
      const { data, error: err } = await supabase.auth.signUp({ email: emailNorm, password });
      if (err) {
        setError(err.message);
        return;
      }
      // 이메일 확인이 켜져 있으면 session이 없을 수 있음 → 대시보드로 보내면 미들웨어가 로그인으로 돌림
      if (!data.session) {
        setInfo(
          "가입은 완료되었습니다. 첫 가입 시에만 확인 메일이 갑니다. 못 받았다면 아래에서 다시 보내기를 누르거나 스팸함을 확인하세요. (로컬이라서 메일이 막히지는 않습니다.)",
        );
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-8 max-w-md space-y-4 rounded-2xl border border-slate-200/80 bg-white/80 p-8 shadow-sm">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
          이메일
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none ring-indigo-500/30 focus:border-indigo-400 focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none ring-indigo-500/30 focus:border-indigo-400 focus:ring-2"
        />
        <p className="mt-1 text-xs text-slate-500">6자 이상 권장</p>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {info ? (
        <div className="space-y-3 rounded-lg border border-emerald-200/80 bg-emerald-50/80 p-4 text-sm text-emerald-900">
          <p>{info}</p>
          <button
            type="button"
            disabled={resendBusy}
            onClick={() => void resendConfirmation()}
            className="rounded-lg border border-emerald-600/30 bg-white px-3 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100/80 disabled:opacity-50"
          >
            {resendBusy ? "보내는 중…" : "인증 메일 다시 보내기"}
          </button>
          {resendHint ? <p className="text-xs text-emerald-800/90">{resendHint}</p> : null}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "처리 중…" : "가입하기"}
      </button>
      <p className="text-center text-sm text-slate-600">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-medium text-indigo-700 underline-offset-2 hover:underline">
          로그인
        </Link>
      </p>
    </form>
  );
}
