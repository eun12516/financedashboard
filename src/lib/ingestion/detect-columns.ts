/**
 * Header-based column detection for Korean + common English exports.
 * Does not assume perfect spelling; uses normalized token matching.
 */

import type { ColumnBinding } from "./types";

const DATE_SYNONYMS = [
  "거래일",
  "거래일시",
  "거래일자",
  "거래시간",
  "일자",
  "날짜",
  "승인일",
  "승인일자",
  "승인일시",
  "사용일자",
  "매입일자",
  "결제일",
  "결제일시",
  "이체일",
  "처리일",
  "기준일",
  "입금일",
  "출금일",
  "주문일",
  "이용일",
  "date",
  "datetime",
  "transactiondate",
  "txndate",
  "postingdate",
  "posted",
  "timestamp",
  "value date",
];

const AMOUNT_SYNONYMS = [
  "금액",
  "거래금액",
  "출금금액",
  "입금금액",
  "결제금액",
  "이용금액",
  "원화금액",
  "거래금액원화",
  "출금",
  "입금",
  "보낸금액",
  "받은금액",
  "출금액",
  "입금액",
  "청구금액",
  "합계",
  "합계금액",
  "amount",
  "amt",
  "value",
  "debit",
  "credit",
  "total",
  "net",
  "balance",
  "withdrawal",
  "deposit",
];

const MERCHANT_SYNONYMS = [
  "거래처",
  "가맹점",
  "가맹점명",
  "가맹점명칭",
  "상호",
  "상세내역",
  "적요",
  "적요내용",
  "내용",
  "메모",
  "사용처",
  "이용가맹점",
  "이용처",
  "거래내용",
  "참고",
  "참고사항",
  "적요비고",
  "상품명",
  "merchant",
  "description",
  "payee",
  "narration",
  "details",
  "memo",
  "counterparty",
  "transaction details",
];

const DESCRIPTION_SYNONYMS = ["비고", "적요상세", "상세비고", "note", "remarks", "comment"];

const CATEGORY_SYNONYMS = [
  "대분류",
  "소분류",
  "카테고리",
  "분류",
  "업종",
  "category",
  "type",
  "구분",
  "타입",
];

function normalizeHeaderLabel(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[_\-./]/g, "");
}

function scoreHeader(normalized: string, synonyms: string[]): number {
  let best = 0;
  for (const s of synonyms) {
    const t = normalizeHeaderLabel(s);
    if (normalized === t) return 100;
    if (normalized.includes(t) || t.includes(normalized)) {
      best = Math.max(best, Math.min(normalized.length, t.length));
    }
  }
  return best;
}

function pickBestColumn(
  headers: string[],
  synonyms: string[],
): string | null {
  let bestKey: string | null = null;
  let bestScore = 0;
  for (const h of headers) {
    const n = normalizeHeaderLabel(h);
    if (!n) continue;
    const sc = scoreHeader(n, synonyms);
    if (sc > bestScore) {
      bestScore = sc;
      bestKey = h;
    }
  }
  return bestScore >= 2 ? bestKey : null;
}

/**
 * Infer date / amount / merchant columns from the first row keys.
 * Returns null if a required column cannot be resolved.
 */
export function detectColumns(headers: string[]): ColumnBinding | null {
  const unique = [...new Set(headers.map((h) => String(h ?? "").trim()).filter(Boolean))];
  if (unique.length === 0) return null;

  const dateKey = pickBestColumn(unique, DATE_SYNONYMS);
  const amountKey = pickBestColumn(unique, AMOUNT_SYNONYMS);
  const merchantKey = pickBestColumn(unique, MERCHANT_SYNONYMS);

  if (!dateKey || !amountKey || !merchantKey) return null;

  const descriptionKey = pickBestColumn(unique, DESCRIPTION_SYNONYMS) ?? undefined;
  let categoryKey = pickBestColumn(unique, CATEGORY_SYNONYMS) ?? undefined;

  if (categoryKey === merchantKey) categoryKey = undefined;

  return {
    dateKey,
    amountKey,
    merchantKey,
    descriptionKey,
    categoryKey,
  };
}
