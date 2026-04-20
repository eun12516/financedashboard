"use client";

import type { ColumnBinding } from "@/lib/ingestion/types";
import { useCallback, useEffect, useRef, useState } from "react";

export type UploadPanelProps = {
  /** 업로드 성공 후 (예: `router.refresh`) */
  onUploadSuccess?: () => void;
  /** 대시보드 모달 등에서 여백·제목 크기 축소 */
  variant?: "page" | "compact";
};

type AccountOption = { id: string; name: string; currency: string };

type UploadSummary = {
  uploadId: string;
  filename: string;
  totalRows: number;
  invalidRows: number;
  normalizedRows: number;
  inserted: number;
  /** 동일 거래(해시)가 있고 자동 분류인 경우 규칙 재적용 */
  refreshed?: number;
  /** 사용자가 수동 분류한 거래는 건너뜀 */
  skippedLocked?: number;
  duplicatesSkipped: number;
};

type ColumnMapState = {
  dateKey: string;
  amountKey: string;
  merchantKey: string;
};

const ACCOUNTS_FETCH_MS = 15_000;

function fetchAccountsWithTimeout(
  loader: (signal: AbortSignal) => Promise<void>
): Promise<void> {
  const controller = new AbortController();
  const t = window.setTimeout(() => controller.abort(), ACCOUNTS_FETCH_MS);
  return loader(controller.signal).finally(() => window.clearTimeout(t));
}

export function UploadPanel({ onUploadSuccess, variant = "page" }: UploadPanelProps = {}) {
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [accountId, setAccountId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewMeta, setPreviewMeta] = useState<{ sheetName: string; rowCount: number } | null>(null);
  const [pivotLike, setPivotLike] = useState(false);
  const [previewLayout, setPreviewLayout] = useState<string | null>(null);
  const [previewSuggested, setPreviewSuggested] = useState<Partial<ColumnBinding> | null>(null);
  const [columnMap, setColumnMap] = useState<ColumnMapState>({
    dateKey: "",
    amountKey: "",
    merchantKey: "",
  });
  const loadAccountsSeq = useRef(0);
  const mountedRef = useRef(true);

  const loadAccounts = useCallback(async (signal?: AbortSignal) => {
    const seq = ++loadAccountsSeq.current;
    setAccountsError(null);
    setAccountsLoading(true);
    try {
      const res = await fetch("/api/accounts", { signal });
      const data = (await res.json()) as { accounts?: AccountOption[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "계정을 불러오지 못했습니다.");
      const accs = data.accounts ?? [];
      if (seq !== loadAccountsSeq.current) return;
      setAccounts(accs);
      setAccountId((prev) => prev || accs[0]?.id || "");
    } catch (e) {
      const aborted =
        (e instanceof DOMException && e.name === "AbortError") ||
        (e instanceof Error && e.name === "AbortError");
      if (aborted) {
        if (!mountedRef.current || seq !== loadAccountsSeq.current) return;
        setAccountsError("계정 목록 요청이 시간 초과되었습니다. 다시 시도해 주세요.");
        return;
      }
      if (seq !== loadAccountsSeq.current) return;
      const msg =
        e instanceof Error ? e.message : "계정 목록을 불러오지 못했습니다. 네트워크·DB 연결을 확인해 주세요.";
      setAccountsError(msg);
    } finally {
      if (seq === loadAccountsSeq.current) setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();
    const t = window.setTimeout(() => controller.abort(), ACCOUNTS_FETCH_MS);
    void loadAccounts(controller.signal).finally(() => window.clearTimeout(t));
    return () => {
      mountedRef.current = false;
      controller.abort();
      window.clearTimeout(t);
    };
  }, [loadAccounts]);

  async function onFileSelected(next: File | null) {
    setFile(next);
    setResult(null);
    setError(null);
    setPreviewError(null);
    setFileHeaders([]);
    setPreviewMeta(null);
    setPivotLike(false);
    setPreviewLayout(null);
    setPreviewSuggested(null);
    setColumnMap({ dateKey: "", amountKey: "", merchantKey: "" });

    if (!next) return;

    setPreviewLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", next);
      const res = await fetch("/api/uploads/preview", { method: "POST", body: fd });
      const data = (await res.json()) as {
        error?: string;
        headers?: string[];
        sheetName?: string;
        rowCount?: number;
        layout?: string;
        suggested?: ColumnBinding | null;
        pivotLike?: boolean;
      };
      if (!res.ok) throw new Error(data.error ?? "파일 미리보기에 실패했습니다.");
      const headers = data.headers ?? [];
      setPivotLike(Boolean(data.pivotLike));
      setPreviewLayout(data.layout ?? null);
      setPreviewSuggested(data.suggested ?? null);
      setFileHeaders(headers);
      if (data.sheetName !== undefined && data.rowCount !== undefined) {
        setPreviewMeta({ sheetName: data.sheetName, rowCount: data.rowCount });
      }
      const s = data.suggested;
      if (s) {
        setColumnMap({
          dateKey: s.dateKey,
          amountKey: s.amountKey,
          merchantKey: s.merchantKey,
        });
      }
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "미리보기 오류");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!file) {
      setError("파일을 선택해 주세요.");
      return;
    }
    if (!accountId) {
      setError("계정을 선택해 주세요.");
      return;
    }
    if (fileHeaders.length === 0) {
      setError("파일에서 헤더를 읽지 못했습니다. 형식을 확인하거나 다른 파일을 선택해 주세요.");
      return;
    }
    if (pivotLike) {
      setError(
        "월별로 열이 나뉜 요약 표는 이 앱에서 처리할 수 없습니다. 거래가 한 줄에 하나씩 있는 「거래 내역」내보내기 파일을 사용해 주세요.",
      );
      return;
    }
    if (!columnMap.dateKey || !columnMap.amountKey || !columnMap.merchantKey) {
      setError("날짜·금액·적요(가맹점) 열을 각각 선택해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("accountId", accountId);
      fd.append(
        "columnMap",
        JSON.stringify({
          ...previewSuggested,
          dateKey: columnMap.dateKey,
          amountKey: columnMap.amountKey,
          merchantKey: columnMap.merchantKey,
        } satisfies ColumnBinding),
      );

      const res = await fetch("/api/uploads", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as UploadSummary & { error?: string; code?: string };

      if (!res.ok) {
        throw new Error(data.error ?? `업로드 실패 (${res.status})`);
      }

      setResult(data as UploadSummary);
      setFile(null);
      setFileInputKey((k) => k + 1);
      setFileHeaders([]);
      setPreviewMeta(null);
      setPivotLike(false);
      setPreviewLayout(null);
      setPreviewSuggested(null);
      setColumnMap({ dateKey: "", amountKey: "", merchantKey: "" });
      setPreviewError(null);
      onUploadSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 중 오류");
    } finally {
      setLoading(false);
    }
  }

  const compact = variant === "compact";

  return (
    <section
      className={
        compact
          ? "rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          : "mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      }
    >
      <h2 className={compact ? "text-base font-semibold text-slate-900" : "text-lg font-semibold text-slate-900"}>
        거래 파일 업로드
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Excel (.xlsx, .xls) 또는 CSV를 선택한 뒤, 저장할 <strong>계정</strong>을 고르고 업로드합니다.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        <strong>지원:</strong> 한 줄에 날짜·금액·내용(가맹점)이 있는 거래 목록 — 예: 날짜, 시간, 타입, 대분류, 소분류, 내용, 금액 …{" "}
        <strong className="text-slate-600">미지원:</strong> 항목·총계·월별 열(2025-03 …)처럼 가로로 월이 펼쳐진 요약표는 다른 파일로 내보내 주세요.
      </p>

      {accountsError ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {accountsError}{" "}
          <button
            type="button"
            onClick={() => void fetchAccountsWithTimeout((sig) => loadAccounts(sig))}
            className="font-medium underline"
          >
            다시 시도
          </button>
        </p>
      ) : null}

      {accountsLoading ? (
        <p className="mt-3 text-sm text-slate-500" aria-live="polite">
          계정 목록을 불러오는 중…
        </p>
      ) : null}

      {accounts.length === 0 && !accountsError && !accountsLoading ? (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          등록된 계정이 없습니다. 터미널에서{" "}
          <code className="rounded bg-amber-100 px-1">npm run db:seed</code> 를 실행한 뒤 새로고침하세요.
        </p>
      ) : null}

      {/* 파일 입력은 폼 밖에 두어 브라우저의 폼 검증·포커스와 충돌하지 않게 함 */}
      <div className="mt-4">
        <label htmlFor="file" className="block text-sm font-medium text-slate-700">
          파일
        </label>
        <input
          key={fileInputKey}
          id="file"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => void onFileSelected(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-800"
        />
        {previewLoading ? (
          <p className="mt-2 text-sm text-slate-500">열 이름을 읽는 중…</p>
        ) : null}
        {previewError ? (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {previewError}
          </p>
        ) : null}
        {previewMeta && fileHeaders.length > 0 ? (
          <p className="mt-2 text-xs text-slate-500">
            시트: {previewMeta.sheetName} · 데이터 행 {previewMeta.rowCount.toLocaleString()}건
            {previewLayout === "fixed-10-korean" ? (
              <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 font-medium text-indigo-900">
                거래 10열 고정(Sheet2)
              </span>
            ) : null}
          </p>
        ) : null}
        {pivotLike && !previewLoading && fileHeaders.length > 0 ? (
          <div
            className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
            role="status"
          >
            이 파일은 <strong>월별 집계·피벗</strong> 형식으로 보입니다. (항목·총계·2025-03 … 같은 열) 이 앱은{" "}
            <strong>거래별 내역</strong>만 저장합니다. 가계부에서 「거래 내역」「거래 목록」Excel/CSV를 내보낸 뒤 그 파일을 올려 주세요.
          </div>
        ) : null}
      </div>

      {file && !previewLoading && fileHeaders.length > 0 && !pivotLike ? (
        <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-sm font-medium text-slate-800">열 매핑</p>
          <p className="text-xs text-slate-600">
            자동 인식이 틀릴 수 있습니다. 각 항목에 맞는 <strong>열 제목</strong>을 고르세요.
          </p>
          <div className="grid gap-3 sm:grid-cols-1">
            <label className="block text-sm">
              <span className="text-slate-700">날짜</span>
              <select
                value={columnMap.dateKey}
                onChange={(e) => setColumnMap((m) => ({ ...m, dateKey: e.target.value }))}
                className="mt-1 w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
                required
              >
                <option value="">— 선택 —</option>
                {fileHeaders.map((h, i) => (
                  <option key={`d-${i}-${h}`} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-700">금액</span>
              <select
                value={columnMap.amountKey}
                onChange={(e) => setColumnMap((m) => ({ ...m, amountKey: e.target.value }))}
                className="mt-1 w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
                required
              >
                <option value="">— 선택 —</option>
                {fileHeaders.map((h, i) => (
                  <option key={`a-${i}-${h}`} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-700">적요·가맹점 (거래 설명)</span>
              <select
                value={columnMap.merchantKey}
                onChange={(e) => setColumnMap((m) => ({ ...m, merchantKey: e.target.value }))}
                className="mt-1 w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
                required
              >
                <option value="">— 선택 —</option>
                {fileHeaders.map((h, i) => (
                  <option key={`m-${i}-${h}`} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : null}

      <form onSubmit={(e) => void onSubmit(e)} className="mt-4 space-y-4">
        <div>
          <label htmlFor="account" className="block text-sm font-medium text-slate-700">
            계정
          </label>
          <select
            id="account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="mt-1 w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
            required
            disabled={accounts.length === 0 || accountsLoading}
          >
            {accounts.length === 0 ? (
              <option value="">—</option>
            ) : (
              accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency.trim()})
                </option>
              ))
            )}
          </select>
        </div>

        <button
          type="submit"
          disabled={
            loading ||
            accounts.length === 0 ||
            accountsLoading ||
            !file ||
            previewLoading ||
            !!previewError ||
            fileHeaders.length === 0 ||
            pivotLike
          }
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "처리 중…" : "업로드 및 반영"}
        </button>
      </form>

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
          <p className="font-medium">반영 완료</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>파일: {result.filename}</li>
            <li>파싱 행: {result.totalRows}건</li>
            <li>신규 저장: {result.inserted}건</li>
            {result.refreshed != null && result.refreshed > 0 ? (
              <li>기존 거래 분류 갱신: {result.refreshed}건</li>
            ) : null}
            {result.skippedLocked != null && result.skippedLocked > 0 ? (
              <li>수동 분류 유지(건너뜀): {result.skippedLocked}건</li>
            ) : null}
            <li>그 외 미삽입(중복 행 등): {result.duplicatesSkipped}건</li>
            {result.invalidRows > 0 ? <li>파싱 실패 행: {result.invalidRows}건</li> : null}
          </ul>
          <p className="mt-2 text-xs text-emerald-800">
            업로드 ID: <code className="rounded bg-emerald-100 px-1">{result.uploadId}</code>
          </p>
        </div>
      ) : null}
    </section>
  );
}
