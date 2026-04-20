"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Tx = {
  id: string;
  occurredOn: string;
  amount: string;
  merchant: string;
  classification: { code: string; label: string } | null;
};

type Props = {
  year: number;
  month: number;
  transactions: Tx[];
};

const QUICK_CODES = [
  { code: "INCOME", label: "수입", activeClass: "border-emerald-600 bg-emerald-600 text-white" },
  { code: "SPENDING", label: "소비", activeClass: "border-slate-800 bg-slate-800 text-white" },
  { code: "BUSINESS", label: "사업비", activeClass: "border-violet-700 bg-violet-700 text-white" },
  { code: "ASSET_MOVEMENT", label: "자산이동", activeClass: "border-teal-700 bg-teal-700 text-white" },
] as const;

function fmtAmt(s: string): string {
  const n = Number(s);
  if (Number.isNaN(n)) return s;
  return n.toLocaleString("ko-KR");
}

export function QuickReclassifyPanel({ year, month, transactions }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onPick(transactionId: string, classificationCode: string) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/transactions/${transactionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classificationCode }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? "저장 실패");
          return;
        }
        router.refresh();
      } catch {
        setError("네트워크 오류");
      }
    });
  }

  if (transactions.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-600">
        <h2 className="text-sm font-semibold text-slate-800">빠른 재분류</h2>
        <p className="mt-2">이 달에 표시할 거래가 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">빠른 재분류</h2>
          <p className="mt-1 text-xs text-slate-500">
            버튼을 누르면 즉시 저장됩니다. 미분류(UNCLASSIFIED)는 목록에서 수동으로 네 가지 중 하나를 골라 주세요.
          </p>
        </div>
        <span className="text-xs text-slate-400">
          {year}-{String(month).padStart(2, "0")} 최근 {transactions.length}건
        </span>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 max-h-[480px] overflow-auto rounded-lg border border-slate-100">
        <table className="w-full min-w-[720px] border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-slate-50">
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="px-2 py-2 font-medium">일자</th>
              <th className="px-2 py-2 font-medium">내역</th>
              <th className="px-2 py-2 font-medium">금액</th>
              <th className="min-w-[280px] px-2 py-2 font-medium">분류</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => {
              const cur = t.classification?.code ?? "";
              return (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-2 py-2 text-slate-600">{t.occurredOn}</td>
                  <td className="max-w-[200px] truncate px-2 py-2 text-slate-800" title={t.merchant}>
                    {t.merchant || "—"}
                  </td>
                  <td
                    className={`whitespace-nowrap px-2 py-2 tabular-nums ${
                      Number(t.amount) < 0 ? "text-rose-700" : "text-emerald-700"
                    }`}
                  >
                    {fmtAmt(t.amount)}
                  </td>
                  <td className="px-1 py-1.5">
                    <div className="flex flex-wrap gap-1">
                      {QUICK_CODES.map((q) => {
                        const active = cur === q.code;
                        return (
                          <button
                            key={q.code}
                            type="button"
                            disabled={pending}
                            onClick={() => void onPick(t.id, q.code)}
                            className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
                              active
                                ? q.activeClass
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                            }`}
                          >
                            {q.label}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
