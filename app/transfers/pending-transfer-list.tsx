"use client";

import { useEffect, useState, useTransition } from "react";
import { classifyTransferAction } from "./actions";
import type { PendingTransferListItem } from "@/services/pending-transfers";
import type { TransferClassificationCode } from "@/lib/transfer-classification-codes";

const ACTIONS: { code: TransferClassificationCode; label: string; className: string }[] = [
  { code: "SPENDING", label: "소비", className: "bg-slate-800 text-white hover:bg-slate-700" },
  {
    code: "ASSET_MOVEMENT",
    label: "자산 이동",
    className: "bg-emerald-700 text-white hover:bg-emerald-600",
  },
  { code: "INVESTMENT", label: "투자", className: "bg-indigo-700 text-white hover:bg-indigo-600" },
];

function formatAmount(amount: string, currency: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  try {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: currency || "KRW",
      maximumFractionDigits: 4,
    }).format(n);
  } catch {
    return `${amount} ${currency}`;
  }
}

type Props = {
  initialRows: PendingTransferListItem[];
};

export function PendingTransferList({ initialRows }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  function runClassify(transactionId: string, code: TransferClassificationCode) {
    setError(null);
    setActiveId(transactionId);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("transactionId", transactionId);
      fd.set("code", code);
      const res = await classifyTransferAction(undefined, fd);
      setActiveId(null);
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.id !== transactionId));
      } else {
        setError(res.error);
      }
    });
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-600">
        분류할 이체 항목이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">날짜</th>
              <th className="px-4 py-3">거래처</th>
              <th className="px-4 py-3">금액</th>
              <th className="px-4 py-3">계정</th>
              <th className="px-4 py-3">비고</th>
              <th className="px-4 py-3 text-right">분류</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => {
              const busy = isPending && activeId === row.id;
              return (
                <tr key={row.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-900">{row.occurredOn}</td>
                  <td className="max-w-[200px] px-4 py-3 text-slate-800">
                    <span className="line-clamp-2" title={row.merchant}>
                      {row.merchant || "—"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-slate-900">
                    {formatAmount(row.amount, row.currency)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.accountName}</td>
                  <td className="max-w-[220px] px-4 py-3 text-slate-600">
                    <span className="line-clamp-2" title={row.description ?? undefined}>
                      {row.description ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {busy ? (
                      <p className="text-right text-xs text-slate-500" aria-live="polite">
                        저장 중…
                      </p>
                    ) : (
                      <div className="flex flex-wrap justify-end gap-2">
                        {ACTIONS.map((a) => (
                          <button
                            key={a.code}
                            type="button"
                            disabled={isPending}
                            onClick={() => runClassify(row.id, a.code)}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${a.className}`}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
