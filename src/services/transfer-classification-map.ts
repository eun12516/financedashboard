import { prisma } from "@/lib/prisma";

let cache: Map<string, number> | null = null;

/** Maps TransferClassification.code → id (cached). */
export async function getClassificationIdByCode(): Promise<Map<string, number>> {
  if (cache) return cache;
  const rows = await prisma.transferClassification.findMany({ select: { id: true, code: true } });
  cache = new Map(rows.map((r) => [r.code, r.id]));
  return cache;
}

export function invalidateClassificationCache(): void {
  cache = null;
}
