"use server";

import { revalidatePath } from "next/cache";
import { classifyPendingTransfer } from "@/services/classify-transfer";

export type ClassifyTransferActionState =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Server Action: strict form fields `transactionId` + `code` (SPENDING | ASSET_MOVEMENT | INVESTMENT).
 */
export async function classifyTransferAction(
  _prev: ClassifyTransferActionState | undefined,
  formData: FormData,
): Promise<ClassifyTransferActionState> {
  const transactionId = formData.get("transactionId");
  const code = formData.get("code");

  if (typeof transactionId !== "string") {
    return { ok: false, error: "transactionId 필드가 올바르지 않습니다." };
  }
  if (typeof code !== "string") {
    return { ok: false, error: "code 필드가 올바르지 않습니다." };
  }

  const result = await classifyPendingTransfer(transactionId, code);

  if (result.ok) {
    revalidatePath("/transfers");
    return { ok: true };
  }
  return { ok: false, error: result.error };
}
