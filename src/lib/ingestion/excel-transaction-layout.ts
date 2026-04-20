import type { ColumnBinding } from "./types";

/**
 * Sheet2-style flat export: fixed 10 columns by column index (row 1 = header, row 2+ = data).
 * Keys are always these literals — cell values are read by index, not by matching header text.
 */
export const KOREAN_TX_10_HEADERS = [
  "날짜",
  "시간",
  "타입",
  "대분류",
  "소분류",
  "내용",
  "금액",
  "화폐",
  "결제수단",
  "메모",
] as const;

export const KOREAN_FLAT_10_COLUMN_BINDING: ColumnBinding = {
  dateKey: "날짜",
  amountKey: "금액",
  merchantKey: "내용",
  categoryKey: "대분류",
  subcategoryKey: "소분류",
};

/**
 * Prefer the transaction sheet: named like "거래 내역", or "Sheet2", or second tab when two+ sheets exist.
 * Sheet1-style summary workbooks should use index 1 for data per product convention.
 */
export function pickTransactionSheetIndex(sheetNames: string[]): number {
  if (sheetNames.length === 0) return 0;

  const byName = sheetNames.findIndex((n) => {
    const t = n.trim();
    return /거래\s*내역|거래내역|transaction/i.test(t) && !/요약|summary|report|리포트/i.test(t);
  });
  if (byName !== -1) return byName;

  const sheet2 = sheetNames.findIndex((n) => /^sheet2$/i.test(n.trim()));
  if (sheet2 !== -1) return sheet2;

  if (sheetNames.length >= 2) return 1;

  return 0;
}

function normCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).normalize("NFKC").trim().replace(/\s+/g, "");
}

/** First row looks like the known 10-column transaction header (날짜 … 금액 at fixed positions). */
export function rowLooksLikeKoreanTxHeader(row: unknown[]): boolean {
  if (!row || row.length < 10) return false;
  const h0 = normCell(row[0]);
  const h6 = normCell(row[6]);
  const okDate = h0 === "날짜" || h0.endsWith("날짜");
  const okAmount = h6 === "금액" || h6.includes("금액");
  return okDate && okAmount;
}
