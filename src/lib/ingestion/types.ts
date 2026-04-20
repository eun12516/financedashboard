import type { Prisma } from "@prisma/client";

/** Raw row from Excel/CSV (header keys preserved as strings). */
export type RawSheetRow = Record<string, unknown>;

/** Resolved column keys after header detection or override. */
export type ColumnBinding = {
  dateKey: string;
  amountKey: string;
  merchantKey: string;
  /** Optional: merged into description / notes */
  descriptionKey?: string;
  /** Optional: stored as category_raw; also used for 이체 hint */
  categoryKey?: string;
  /** Optional: merged into category_raw as "대분류 / 소분류" when both exist */
  subcategoryKey?: string;
};

/** One normalized row ready for hashing and DB insert. */
export type NormalizedTransactionRow = {
  occurredOn: Date;
  amount: Prisma.Decimal;
  /** Original merchant cell (trimmed). */
  merchant: string;
  merchantNormalized: string;
  /** SHA-256 of canonical string (32 bytes) — matches DB `dedupe_hash`. */
  hashKey: Buffer;
  description?: string;
  categoryRaw?: string;
  /** 소분류 열 (예: Sheet2 `소분류`) — 분류 규칙에 직접 사용 */
  subcategoryRaw?: string;
  /** 결제수단 (고정 10열 시트) */
  paymentMethod?: string;
  /** 거래 타입: 지출/수입/이체 */
  txType?: string;
  isTransfer: boolean;
};

export type ParseLayout = "fixed-10-korean" | "dynamic";

export type ParseFileResult = {
  /** Human-readable sheet name used */
  sheetName: string;
  /** First-row header labels (order preserved; includes empty-skip). */
  headers: string[];
  /** Rows as objects; keys from first row */
  rows: RawSheetRow[];
  /** Excel: Sheet2-style fixed columns vs header-matched CSV/legacy */
  layout?: ParseLayout;
};

export type IngestSummary = {
  uploadId: string;
  filename: string;
  totalRows: number;
  /** Rows that could not be normalized (bad date/amount/etc.) */
  invalidRows: number;
  /** Rows successfully normalized from the file */
  normalizedRows: number;
  /** Rows inserted in this run (new to DB for this account) */
  inserted: number;
  /** Same dedupe hash as DB, `classificationManual`이 false인 행을 새 규칙으로 갱신한 건수 */
  refreshed: number;
  /** 동일 해시가 이미 있고 사용자가 수동 분류해 잠긴 경우 건너뜀 */
  skippedLocked: number;
  /** Normalized rows that were already present (DB) or skipped as duplicate in batch */
  duplicatesSkipped: number;
};
