import { Prisma } from "@prisma/client";
import type { ColumnBinding, NormalizedTransactionRow, RawSheetRow } from "./types";
import { amountStringForHash, buildCanonicalString, hashKeyFromCanonical } from "./hash-key";

const MAX_MERCHANT_LEN = 2000;

/**
 * Excel serial (days since 1899-12-30 in 1900 system) → UTC date-only.
 * Works for typical personal-finance date ranges; avoids JS local TZ drift for whole serials.
 */
function excelSerialToUtcDateOnly(serial: number): Date | null {
  if (!Number.isFinite(serial)) return null;
  // Excel incorrectly treats 1900 as leap year; SheetJS-compatible epoch offset:
  const epoch = Date.UTC(1899, 11, 30);
  const ms = Math.round(serial * 86400000);
  const d = new Date(epoch + ms);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function parseDateFromString(raw: string): Date | null {
  const t = raw.normalize("NFKC").trim();
  if (!t) return null;

  const isoDay = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDay) {
    const y = Number(isoDay[1]);
    const m = Number(isoDay[2]);
    const day = Number(isoDay[3]);
    if (m >= 1 && m <= 12 && day >= 1 && day <= 31)
      return new Date(Date.UTC(y, m - 1, day));
  }

  const dotted = t.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})/);
  if (dotted) {
    const y = Number(dotted[1]);
    const m = Number(dotted[2]);
    const day = Number(dotted[3]);
    if (y >= 1900 && y < 2100 && m >= 1 && m <= 12 && day >= 1 && day <= 31)
      return new Date(Date.UTC(y, m - 1, day));
  }

  const mdy = t.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (mdy) {
    const m = Number(mdy[1]);
    const day = Number(mdy[2]);
    const y = Number(mdy[3]);
    if (y >= 1900 && y < 2100 && m >= 1 && m <= 12 && day >= 1 && day <= 31)
      return new Date(Date.UTC(y, m - 1, day));
  }

  const parsed = new Date(t);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(
      Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()),
    );
  }
  return null;
}

function parseOccurredOn(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    // Heuristic: serial dates are typically 30000–55000 for 1990s–2030s
    if (value > 20000 && value < 80000) {
      const d = excelSerialToUtcDateOnly(value);
      if (d) return d;
    }
    const ms = value > 1e12 ? value : value * 1000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime()))
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
  if (typeof value === "string") return parseDateFromString(value);
  return null;
}

function parseAmount(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;

  let s = String(value).normalize("NFKC").trim();
  if (!s) return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1).trim();
  }
  if (/^-/.test(s)) {
    negative = true;
    s = s.replace(/^-+\s*/, "");
  }

  s = s.replace(/,/g, "").replace(/\s+/g, "");
  s = s.replace(/[₩$€£¥]/g, "");

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

/**
 * Many Korean exports use **always-positive 금액** and put direction in **타입** (지출/수입/이체).
 * Map to canonical cashflow sign: 수입 → +, 지출 → −, 이체는 원본 부호 유지.
 */
export function canonicalCashflowAmount(rawAmount: number, txType?: string): number {
  if (txType === undefined || txType === "") return rawAmount;
  const t = txType.normalize("NFKC").trim().toLowerCase();

  if (/이체|송금|계좌이체|내계좌|transfer/.test(t)) {
    return rawAmount;
  }

  if (
    /지출|출금|결제|승인|체크|신용|카드|이용|매입|청구|자동이체\s*출금/.test(t) &&
    !/입금|수입|환급|취소\s*입금/.test(t)
  ) {
    return -Math.abs(rawAmount);
  }

  if (/수입|입금|급여|환급|이자|배당|캐시백|적립|환불\s*입금/.test(t)) {
    return Math.abs(rawAmount);
  }

  return rawAmount;
}

export function normalizeMerchantForHash(raw: string): string {
  return raw
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Heuristic: marks rows that need user transfer classification in UI later. */
export function inferIsTransfer(merchant: string, categoryRaw?: string): boolean {
  const blob = `${categoryRaw ?? ""} ${merchant}`;
  return /이체|송금|계좌이체|transfer/i.test(blob.normalize("NFKC"));
}

/**
 * Map one raw sheet row → normalized transaction, or null if required fields are unusable.
 */
export function normalizeRow(
  row: RawSheetRow,
  binding: ColumnBinding,
): NormalizedTransactionRow | null {
  const occurredOn = parseOccurredOn(row[binding.dateKey]);
  const amountNum = parseAmount(row[binding.amountKey]);
  const merchantRaw = row[binding.merchantKey];

  if (!occurredOn || amountNum === null) return null;

  const typeCell = optionalString(row["타입"]);
  const amountSigned = canonicalCashflowAmount(amountNum, typeCell);

  const merchant =
    merchantRaw === null || merchantRaw === undefined
      ? ""
      : String(merchantRaw).normalize("NFKC").trim().slice(0, MAX_MERCHANT_LEN);

  const merchantNormalized = normalizeMerchantForHash(merchant);

  const amount = new Prisma.Decimal(amountSigned).toDecimalPlaces(4);
  const dateIso = occurredOn.toISOString().slice(0, 10);
  const amountForHash = amountStringForHash(amount);
  const canonical = buildCanonicalString({
    dateIso,
    amountForHash,
    merchantNormalized,
  });
  const hashKey = hashKeyFromCanonical(canonical);

  const description =
    binding.descriptionKey !== undefined
      ? optionalString(row[binding.descriptionKey])
      : undefined;

  let categoryRaw: string | undefined;
  let subcategoryRaw: string | undefined;
  if (binding.categoryKey !== undefined) {
    categoryRaw = optionalString(row[binding.categoryKey]);
  }
  if (binding.subcategoryKey !== undefined) {
    const sub = optionalString(row[binding.subcategoryKey]);
    if (sub) {
      subcategoryRaw = sub;
      categoryRaw = categoryRaw ? `${categoryRaw} / ${sub}` : sub;
    }
  }
  if (subcategoryRaw === undefined) {
    const fromCol = optionalString(row["소분류"]);
    if (fromCol) subcategoryRaw = fromCol;
  }

  const transferFromType =
    typeCell !== undefined &&
    /이체|송금|계좌이체|내계좌|transfer/i.test(typeCell.normalize("NFKC"));
  const paymentMethod = optionalString(row["결제수단"]);
  const txType = typeCell;

  return {
    occurredOn,
    amount,
    merchant,
    merchantNormalized,
    hashKey,
    description,
    categoryRaw,
    subcategoryRaw,
    paymentMethod,
    txType,
    isTransfer: inferIsTransfer(merchant, categoryRaw) || transferFromType,
  };
}

function optionalString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).normalize("NFKC").trim();
  return s.length ? s : undefined;
}
