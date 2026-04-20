"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type DashboardTabId = "main" | "summary" | "ledger" | "unclassified";

const TABS: { id: DashboardTabId; label: string }[] = [
  { id: "main", label: "메인" },
  { id: "summary", label: "Sheet1 요약" },
  { id: "ledger", label: "가계부 · 지표" },
  { id: "unclassified", label: "미분류" },
];

type Props = {
  mainPanel: React.ReactNode;
  summaryPanel: React.ReactNode;
  ledgerPanel: React.ReactNode;
  unclassifiedPanel: React.ReactNode;
};

function tabFromSearchParam(tab: string | null): DashboardTabId {
  if (tab === "summary" || tab === "ledger" || tab === "unclassified") return tab;
  return "main";
}

/**
 * 메인 / Sheet1 / 가계부 / 미분류 — `?tab=` (기본 메인은 파라미터 생략).
 */
export function DashboardMainTabs({
  mainPanel,
  summaryPanel,
  ledgerPanel,
  unclassifiedPanel,
}: Props) {
  const sp = useSearchParams();
  const router = useRouter();
  const tab = tabFromSearchParam(sp.get("tab"));

  const setTab = useCallback(
    (next: DashboardTabId) => {
      const q = new URLSearchParams(sp.toString());
      if (next === "main") {
        q.delete("tab");
      } else {
        q.set("tab", next);
      }
      const qs = q.toString();
      router.push(qs ? `/dashboard?${qs}` : "/dashboard");
    },
    [router, sp],
  );

  const activePanel =
    tab === "summary"
      ? summaryPanel
      : tab === "ledger"
        ? ledgerPanel
        : tab === "unclassified"
          ? unclassifiedPanel
          : mainPanel;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-200/40 ring-1 ring-slate-100">
      <div className="flex flex-wrap gap-1 border-b border-slate-100 bg-slate-50/90 p-1.5 sm:gap-2">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-all sm:px-4 ${
                active
                  ? "bg-white text-indigo-900 shadow-sm ring-1 ring-slate-200/80"
                  : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="bg-gradient-to-b from-white to-slate-50/40 px-4 py-6 sm:px-7 sm:py-8">
        {activePanel}
      </div>
    </div>
  );
}
