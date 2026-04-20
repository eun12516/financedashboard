"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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
 * 탭 전환은 클라이언트 state만 변경합니다.
 *
 * `router.push`로 `?tab=` 을 바꾸면 서버에서 대시보드 전체(RSC) + DB 조회가 다시 돌아갑니다.
 * 로컬 DB는 가까워서 덜 느끼지만, Vercel ↔ Supabase 왕복에서는 탭만 바꿔도 매우 느려집니다.
 *
 * URL의 `?tab=` 은 **첫 로드·월 변경 등 네비게이션** 때만 반영합니다 (`searchKey` 변경 시).
 */
export function DashboardMainTabs({
  mainPanel,
  summaryPanel,
  ledgerPanel,
  unclassifiedPanel,
}: Props) {
  const sp = useSearchParams();
  const searchKey = sp.toString();

  const [tab, setTab] = useState<DashboardTabId>(() => tabFromSearchParam(sp.get("tab")));

  useEffect(() => {
    const params = new URLSearchParams(searchKey);
    setTab(tabFromSearchParam(params.get("tab")));
  }, [searchKey]);

  const setTabOnly = useCallback((next: DashboardTabId) => {
    setTab(next);
  }, []);

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
              onClick={() => setTabOnly(t.id)}
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
