"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { UploadPanel } from "@/components/upload-panel";

/**
 * 대시보드 헤더용: 한 번의 클릭으로 업로드 UI를 열고, 반영 후 목록을 새로고침합니다.
 */
export function DashboardUploadDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const onSuccess = useCallback(() => {
    setOpen(false);
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 hover:shadow-indigo-500/30"
      >
        거래 파일 업데이트
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 pt-16 sm:pt-24">
          <button
            type="button"
            className="fixed inset-0 bg-black/40"
            aria-label="닫기"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-upload-title"
            className="relative z-10 mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-1 shadow-2xl shadow-slate-900/10"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 id="dashboard-upload-title" className="text-base font-semibold text-slate-900">
                거래 파일 업데이트
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                닫기
              </button>
            </div>
            <div className="max-h-[min(70vh,720px)] overflow-y-auto px-2 pb-4 pt-2">
              <UploadPanel variant="compact" onUploadSuccess={onSuccess} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
