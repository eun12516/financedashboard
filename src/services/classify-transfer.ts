import { prisma } from "@/lib/prisma";
import { parseTransferClassificationCode } from "@/lib/transfer-classification-codes";

export type ClassifyTransferResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Assigns a transfer classification by stable `code` (DB lookup).
 * Only updates rows that are still pending (race-safe via updateMany filter).
 * `isTransfer` stays true — we only disambiguate meaning for analytics.
 */
export async function classifyPendingTransfer(
  transactionId: string,
  codeRaw: string,
): Promise<ClassifyTransferResult> {
  const trimmedId = transactionId?.trim();
  if (!trimmedId) {
    return { ok: false, error: "거래 ID가 필요합니다." };
  }

  const parsed = parseTransferClassificationCode(codeRaw);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const classification = await prisma.transferClassification.findUnique({
    where: { code: parsed.code },
  });

  if (!classification) {
    return {
      ok: false,
      error:
        "분류 마스터에 해당 코드가 없습니다. `npm run db:seed`로 시드를 실행했는지 확인하세요.",
    };
  }

  const result = await prisma.transaction.updateMany({
    where: {
      id: trimmedId,
      isTransfer: true,
      transferClassificationId: null,
    },
    data: {
      transferClassificationId: classification.id,
    },
  });

  if (result.count === 0) {
    return {
      ok: false,
      error: "거래를 찾을 수 없거나 이체가 아니거나 이미 분류되었습니다.",
    };
  }

  return { ok: true };
}
