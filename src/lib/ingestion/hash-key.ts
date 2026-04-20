import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";

/**
 * Deterministic canonical string for deduplication (must stay stable across releases).
 * Format: YYYY-MM-DD|amount_fixed_4|merchant_normalized
 */
export function buildCanonicalString(input: {
  dateIso: string;
  amountForHash: string;
  merchantNormalized: string;
}): string {
  return `${input.dateIso}|${input.amountForHash}|${input.merchantNormalized}`;
}

/** 32-byte SHA-256 digest for `transactions.dedupe_hash`. */
export function hashKeyFromCanonical(canonical: string): Buffer {
  return createHash("sha256").update(canonical, "utf8").digest();
}

/**
 * Amount string used inside the hash — ties to DECIMAL(19,4) semantics via Prisma.Decimal.
 */
export function amountStringForHash(amount: Prisma.Decimal): string {
  return new Prisma.Decimal(amount).toFixed(4);
}
