import type { Prisma } from "@prisma/client";
import { parseExcelSheet1Summary } from "@/lib/ingestion/parse-sheet1-summary";
import { prisma } from "@/lib/prisma";

/**
 * Saves Sheet1 (요약) parse from a 2-sheet Excel after the same upload’s Sheet2 ingest.
 */
export async function persistWorkbookSheet1Snapshot(
  buffer: Buffer,
  filename: string,
  accountId: string,
  uploadId: string,
  userId: string,
): Promise<void> {
  const lower = filename.toLowerCase();
  if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) return;

  const parsed = parseExcelSheet1Summary(buffer);
  if (parsed.isEmpty) return;

  await prisma.workbookSheet1Snapshot.create({
    data: {
      userId,
      accountId,
      uploadId,
      ...(parsed.customer != null && {
        customer: parsed.customer as Prisma.InputJsonValue,
      }),
      ...(parsed.cashflow != null && {
        cashflow: parsed.cashflow as Prisma.InputJsonValue,
      }),
      ...(parsed.extra != null && { extra: parsed.extra as Prisma.InputJsonValue }),
    },
  });
}

export async function getLatestWorkbookSheet1Snapshot(userId: string) {
  return prisma.workbookSheet1Snapshot.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      account: { select: { name: true } },
      upload: { select: { originalFilename: true, createdAt: true } },
    },
  });
}
