import { Prisma } from "@prisma/client";

/** Shape required for classification logic (from Prisma select). */
export type TransactionAnalyticsRow = {
  amount: Prisma.Decimal;
  merchant: string;
  categoryRaw: string | null;
  isTransfer: boolean;
  classificationCode: string | null;
};

export type BucketedAmounts = {
  income: Prisma.Decimal;
  spending: Prisma.Decimal;
  investment: Prisma.Decimal;
};

const ZERO = new Prisma.Decimal(0);

/**
 * Transfer-aware bucketing for executive / trend metrics.
 * 4-way code: INCOME, SPENDING, ASSET_MOVEMENT, BUSINESS (+ legacy INVESTMENT).
 */
export function bucketTransaction(row: TransactionAnalyticsRow): BucketedAmounts {
  const amt = new Prisma.Decimal(row.amount);
  const code = row.classificationCode;

  if (!code || code === "UNCLASSIFIED") {
    if (amt.gt(0)) return { income: amt, spending: ZERO, investment: ZERO };
    if (amt.lt(0)) return { income: ZERO, spending: amt.neg(), investment: ZERO };
    return { income: ZERO, spending: ZERO, investment: ZERO };
  }

  if (code === "ASSET_MOVEMENT") {
    return { income: ZERO, spending: ZERO, investment: ZERO };
  }

  /** 소비·사업비: 지출(음수)만 지출 버킷. 양수는 환불 등으로 수입 쪽(정규화 후엔 드묾). */
  if (code === "SPENDING" || code === "BUSINESS") {
    if (amt.lt(0)) return { income: ZERO, spending: amt.neg(), investment: ZERO };
    if (amt.gt(0)) return { income: amt, spending: ZERO, investment: ZERO };
    return { income: ZERO, spending: ZERO, investment: ZERO };
  }

  /** 수입: 양수만 수입. 음수는 차감·환불로 지출 버킷. */
  if (code === "INCOME") {
    if (amt.gt(0)) return { income: amt, spending: ZERO, investment: ZERO };
    if (amt.lt(0)) return { income: ZERO, spending: amt.neg(), investment: ZERO };
    return { income: ZERO, spending: ZERO, investment: ZERO };
  }

  if (code === "INVESTMENT") {
    return { income: ZERO, spending: ZERO, investment: amt.abs() };
  }

  return { income: ZERO, spending: ZERO, investment: ZERO };
}

/** True if this row increases the spending bucket (소비·사업비 지출). */
export function contributesToSpendingAnalytics(row: TransactionAnalyticsRow): boolean {
  return bucketTransaction(row).spending.gt(0);
}
