import { prisma } from "@/lib/prisma";
import { utcMonthRange } from "@/lib/analytics/month-bounds";

const unclassifiedWhere = {
  OR: [{ classification: { code: "UNCLASSIFIED" as const } }, { transferClassificationId: null }],
};

export type MonthTransactionRow = {
  id: string;
  occurredOn: Date;
  amount: string;
  merchant: string;
  categoryRaw: string | null;
  paymentMethod: string | null;
  classification: { code: string; label: string } | null;
  accountName: string;
};

/**
 * 대시보드 빠른 재분류용 — 해당 월 최근 거래.
 */
export async function getMonthTransactionsForDashboard(
  year: number,
  month: number,
  take = 50,
): Promise<MonthTransactionRow[]> {
  const { start, endExclusive } = utcMonthRange(year, month);
  const rows = await prisma.transaction.findMany({
    where: { occurredOn: { gte: start, lt: endExclusive } },
    orderBy: [{ occurredOn: "desc" }, { id: "desc" }],
    take,
    select: {
      id: true,
      occurredOn: true,
      amount: true,
      merchant: true,
      categoryRaw: true,
      paymentMethod: true,
      classification: { select: { code: true, label: true } },
      account: { select: { name: true } },
    },
  });

  return rows.map((t) => ({
    id: t.id,
    occurredOn: t.occurredOn,
    amount: t.amount.toString(),
    merchant: t.merchant,
    categoryRaw: t.categoryRaw,
    paymentMethod: t.paymentMethod,
    classification: t.classification,
    accountName: t.account.name,
  }));
}

export async function listTransferClassifications() {
  return prisma.transferClassification.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, code: true, label: true },
  });
}

/**
 * 미분류 탭 — UNCLASSIFIED 또는 아직 분류 id 없음.
 */
export async function getMonthUnclassifiedTransactions(
  year: number,
  month: number,
  take = 100,
): Promise<MonthTransactionRow[]> {
  const { start, endExclusive } = utcMonthRange(year, month);
  const rows = await prisma.transaction.findMany({
    where: {
      occurredOn: { gte: start, lt: endExclusive },
      ...unclassifiedWhere,
    },
    orderBy: [{ occurredOn: "desc" }, { id: "desc" }],
    take,
    select: {
      id: true,
      occurredOn: true,
      amount: true,
      merchant: true,
      categoryRaw: true,
      paymentMethod: true,
      classification: { select: { code: true, label: true } },
      account: { select: { name: true } },
    },
  });

  return rows.map((t) => ({
    id: t.id,
    occurredOn: t.occurredOn,
    amount: t.amount.toString(),
    merchant: t.merchant,
    categoryRaw: t.categoryRaw,
    paymentMethod: t.paymentMethod,
    classification: t.classification,
    accountName: t.account.name,
  }));
}
