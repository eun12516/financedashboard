import { Prisma } from "@prisma/client";
import {
  bucketTransaction,
  contributesToSpendingAnalytics,
  type TransactionAnalyticsRow,
} from "./bucket-transaction";
import type { MonthlyMetricBuckets, SpendingBreakdown } from "./types";

const ZERO = new Prisma.Decimal(0);

export function toAnalyticsRow(t: {
  amount: Prisma.Decimal;
  merchant: string;
  categoryRaw: string | null;
  isTransfer: boolean;
  classification: { code: string } | null;
}): TransactionAnalyticsRow {
  return {
    amount: t.amount,
    merchant: t.merchant,
    categoryRaw: t.categoryRaw,
    isTransfer: t.isTransfer,
    classificationCode: t.classification?.code ?? null,
  };
}

export function aggregateMonthlyBuckets(rows: TransactionAnalyticsRow[]): Omit<
  MonthlyMetricBuckets,
  "netCashflow"
> & { income: Prisma.Decimal; spending: Prisma.Decimal; investment: Prisma.Decimal } {
  let income = ZERO;
  let spending = ZERO;
  let investment = ZERO;
  for (const r of rows) {
    const b = bucketTransaction(r);
    income = income.add(b.income);
    spending = spending.add(b.spending);
    investment = investment.add(b.investment);
  }
  const totalIncome = income.toNumber();
  const totalSpending = spending.toNumber();
  const totalInvestment = investment.toNumber();
  return {
    income,
    spending,
    investment,
    totalIncome,
    totalSpending,
    totalInvestment,
    transactionCount: rows.length,
  };
}

export function toMonthlyMetricBuckets(
  agg: ReturnType<typeof aggregateMonthlyBuckets>,
): MonthlyMetricBuckets {
  return {
    totalIncome: agg.totalIncome,
    totalSpending: agg.totalSpending,
    totalInvestment: agg.totalInvestment,
    netCashflow: agg.totalIncome - agg.totalSpending,
    transactionCount: agg.transactionCount,
  };
}

const UNCATEGORIZED = "uncategorized";

function categoryLabel(categoryRaw: string | null): string {
  if (categoryRaw == null) return UNCATEGORIZED;
  const s = categoryRaw.normalize("NFKC").trim();
  return s.length > 0 ? s : UNCATEGORIZED;
}

function merchantLabel(merchant: string): string {
  const s = merchant.normalize("NFKC").trim();
  return s.length > 0 ? s : "—";
}

/** Spending-side rows only: category + merchant totals for the selected month. */
export function buildSpendingBreakdown(rows: TransactionAnalyticsRow[]): SpendingBreakdown {
  const catAcc = new Map<string, { sum: Prisma.Decimal; n: number }>();
  const merAcc = new Map<string, { sum: Prisma.Decimal; n: number }>();

  for (const r of rows) {
    if (!contributesToSpendingAnalytics(r)) continue;
    const spend = bucketTransaction(r).spending;
    const cat = categoryLabel(r.categoryRaw);
    const mer = merchantLabel(r.merchant);

    const ce = catAcc.get(cat) ?? { sum: ZERO, n: 0 };
    ce.sum = ce.sum.add(spend);
    ce.n += 1;
    catAcc.set(cat, ce);

    const me = merAcc.get(mer) ?? { sum: ZERO, n: 0 };
    me.sum = me.sum.add(spend);
    me.n += 1;
    merAcc.set(mer, me);
  }

  const byCategory = [...catAcc.entries()]
    .map(([category, v]) => ({
      category,
      amount: v.sum.toNumber(),
      transactionCount: v.n,
    }))
    .sort((a, b) => b.amount - a.amount);

  const topMerchants = [...merAcc.entries()]
    .map(([merchant, v]) => ({
      merchant,
      amount: v.sum.toNumber(),
      transactionCount: v.n,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  return { byCategory, topMerchants };
}
