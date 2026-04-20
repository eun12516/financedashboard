"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Props = {
  defaultNext: string;
};

export function LoginForm({ defaultNext }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const emailNorm = email.trim();
      const supabase = createBrowserSupabaseClient();
      const { error: err } = await supabase.auth.signInWithPassword({
        email: emailNorm,
        password,
      });
      if (err) {
        const hint =
          err.message.includes("Invalid login credentials") || err.message.includes("invalid")
            ? " 이메일·비밀번호·프로젝트(URL·키)가 맞는지 확인하세요. 가입 직후라면 이메일 인증이 필요할 수 있습니다."
            : "";
        setError(`${err.message}${hint}`);
        return;
      }
      const safe =
        defaultNext.startsWith("/") && !defaultNext.startsWith("//") ? defaultNext : "/dashboard";
      router.push(safe);
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none ring-indigo-500/30 focus:border-indigo-400 focus:ring-2"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "처리 중…" : "로그인"}
      </button>
      <p className="text-center text-sm text-slate-600">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="font-medium text-indigo-700 underline-offset-2 hover:underline">
          회원가입
        </Link>
      </p>
    </form>
  );
}
