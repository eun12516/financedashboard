import { prisma } from "@/lib/prisma";

/**
 * Serializable row for Server → Client Components (dates as ISO date string).
 */
export type PendingTransferListItem = {
  id: string;
  occurredOn: string;
  amount: string;
  merchant: string;
  description: string | null;
  accountName: string;
  currency: string;
};

/**
 * Pending = transfer-like (`isTransfer`) but user has not chosen meaning yet.
 * Ordered by transaction date descending (latest first).
 */
export async function getPendingTransfers(userId: string): Promise<PendingTransferListItem[]> {
  const rows = await prisma.transaction.findMany({
    where: {
      userId,
      isTransfer: true,
      transferClassificationId: null,
    },
    orderBy: { occurredOn: "desc" },
    include: {
      account: {
        select: { name: true, currency: true },
      },
    },
  });

  return rows.map((t) => ({
    id: t.id,
    occurredOn: t.occurredOn.toISOString().slice(0, 10),
    amount: t.amount.toString(),
    merchant: t.merchant,
    description: t.description,
    accountName: t.account.name,
    currency: t.account.currency.trim(),
  }));
}
