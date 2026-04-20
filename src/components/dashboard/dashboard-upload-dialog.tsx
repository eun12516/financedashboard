"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { UploadPanel } from "@/components/upload-panel";

/**
 * 대시보드 헤더용: 한 번의 클릭으로 업로드 UI를 열고, 반영 후 목록을 새로고침합니다.
 * 모달은 `document.body`로 포털되어 상위 overflow/스택에 잘리지 않습니다.
 */
export function DashboardUploadDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const modal =
    open && mounted ? (
      <div
        className="fixed inset-0 z-[200] flex min-h-0 items-start justify-center overflow-y-auto overscroll-contain bg-black/45 p-4 py-8 sm:items-center sm:py-10"
        role="presentation"
        onClick={() => setOpen(false)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dashboard-upload-title"
          className="relative z-[201] my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/20"
          onClick={(e) => e.stopPropagation()}
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
          <div className="max-h-[min(85dvh,880px)] overflow-y-auto overscroll-contain px-2 pb-4 pt-2">
            <UploadPanel variant="compact" onUploadSuccess={onSuccess} />
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 hover:shadow-indigo-500/30"
      >
        거래 파일 업데이트
      </button>
      {mounted && typeof document !== "undefined" && modal ? createPortal(modal, document.body) : null}
    </>
  );
}
