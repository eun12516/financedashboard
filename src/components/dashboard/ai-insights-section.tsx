"use client";

import { useEffect, useState } from "react";
import type { InsightsApiResponse } from "@/lib/insights/types";

type Props = {
  year: number;
  month: number;
};

function typeStyles(t: InsightsApiResponse["insights"][number]["type"]) {
  switch (t) {
    case "observation":
      return {
        bar: "bg-slate-500",
        badge: "bg-slate-100 text-slate-800",
        label: "관찰",
      };
    case "action":
      return {
        bar: "bg-indigo-600",
        badge: "bg-indigo-50 text-indigo-900",
        label: "제안",
      };
    case "warning":
      return {
        bar: "bg-amber-500",
        badge: "bg-amber-50 text-amber-900",
        label: "주의",
      };
    default:
      return { bar: "bg-slate-400", badge: "bg-slate-100 text-slate-800", label: t };
  }
}

export function AiInsightsSection({ year, month }: Props) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ok"; data: InsightsApiResponse }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    fetch(`/api/insights?year=${year}&month=${month}`)
      .then(async (res) => {
        const body = (await res.json()) as InsightsApiResponse & { error?: string };
        if (!res.ok) {
          throw new Error(body.error ?? "인사이트를 불러오지 못했습니다.");
        }
        if (cancelled) return;
        setState({ status: "ok", data: body });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: e instanceof Error ? e.message : "알 수 없는 오류",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [year, month]);

  return (
    <section aria-label="AI 인사이트" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            AI 인사이트
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            사전 계산된 월별 지표만 사용합니다. 서버에{" "}
            <code className="rounded bg-slate-100 px-1">OPENAI_API_KEY</code>를 넣으면 LLM 요약이 켜지고, 없으면 규칙
            기반으로 표시됩니다. 선택적으로 <code className="rounded bg-slate-100 px-1">OPENAI_INSIGHTS_MODEL</code>
            로 모델을 지정할 수 있습니다.
          </p>
        </div>
      </div>

      {state.status === "loading" ? (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : state.status === "error" ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.message}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            출처:{" "}
            <span className="font-medium text-slate-700">
              {state.data.source === "llm"
                ? "언어 모델 (구조화 출력)"
                : state.data.source === "sparse"
                  ? "자동 규칙 (데이터 없음)"
                  : "자동 규칙 (폴백)"}
            </span>
            {state.data.meta?.model ? ` · ${state.data.meta.model}` : null}
          </p>
          <ul className="space-y-3">
            {state.data.insights.map((ins, idx) => {
              const st = typeStyles(ins.type);
              return (
                <li
                  key={`${ins.title}-${idx}`}
                  className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3"
                >
                  <span className={`mt-1 h-full w-1 shrink-0 rounded ${st.bar}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${st.badge}`}>
                        {st.label}
                      </span>
                      {ins.priority ? (
                        <span className="text-xs text-slate-500">
                          우선순위: {ins.priority}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-1 font-semibold text-slate-900">{ins.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">{ins.message}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
