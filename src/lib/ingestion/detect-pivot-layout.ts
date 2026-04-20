/**
 * Detects "wide" budget / pivot exports where months are columns (e.g. 2025-03 …)
 * instead of one row per transaction with a single date column.
 */

function normalizeHeaderToken(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[_\-./]/g, "");
}

/** Matches YYYY-MM, YYYY-M, YYYY.MM style month columns often used as pivot headers. */
function looksLikeYearMonthColumn(raw: string): boolean {
  const t = raw.trim().replace(/\s/g, "");
  return /^\d{4}[-./]?\d{1,2}$/.test(t);
}

/**
 * Heuristic: household apps export "항목 | 총계 | 월평균 | 2025-03 | …" — not ingestible as row-wise transactions.
 */
export function isLikelyWideMonthlyPivot(headers: string[]): boolean {
  const list = headers.map((h) => String(h ?? "").trim()).filter(Boolean);
  if (list.length < 4) return false;

  const ymCols = list.filter(looksLikeYearMonthColumn).length;
  const norm = (s: string) => normalizeHeaderToken(s);
  const hasHangmok = list.some((h) => norm(h) === "항목" || norm(h).endsWith("항목"));
  const hasSummaryCol = list.some((h) => {
    const x = norm(h);
    return x === "총계" || x === "월평균" || x === "합계" || x === "월수입총계" || x === "월지출총계";
  });

  if (ymCols >= 3) return true;
  if (hasHangmok && ymCols >= 1 && hasSummaryCol) return true;
  return false;
}

export function buildNoColumnBindingMessage(headers: string[]): string {
  if (isLikelyWideMonthlyPivot(headers)) {
    return (
      "이 파일은 월별로 열이 나뉜 요약·집계 표로 보입니다. (예: 항목, 총계, 2025-03 …). " +
      "이 앱은 한 줄에 날짜·금액·내용(가맹점)이 있는 거래 내역만 처리합니다. " +
      "가계부/앱에서 「거래 내역」「거래 목록」Excel·CSV로 내보낸 뒤 다시 업로드해 주세요."
    );
  }
  return (
    "날짜·금액·적요(가맹점)에 해당하는 열을 자동으로 찾지 못했습니다. " +
    "아래 열 매핑에서 직접 고르거나, 내보내기 형식을 확인해 주세요."
  );
}
