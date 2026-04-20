/**
 * Transfer classification codes stored in `transfer_classifications.code` (seeded).
 * Resolve rows by code in the service layer — never hardcode numeric IDs.
 */
export const TRANSFER_CLASSIFICATION_CODES = [
  "SPENDING",
  "ASSET_MOVEMENT",
  "INVESTMENT",
] as const;

export type TransferClassificationCode = (typeof TRANSFER_CLASSIFICATION_CODES)[number];

export function parseTransferClassificationCode(
  raw: unknown,
):
  | { ok: true; code: TransferClassificationCode }
  | { ok: false; error: string } {
  if (typeof raw !== "string") {
    return { ok: false, error: "분류 코드가 문자열이 아닙니다." };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "분류 코드가 비어 있습니다." };
  }
  const upper = trimmed.toUpperCase();
  const allowed = TRANSFER_CLASSIFICATION_CODES as readonly string[];
  if (allowed.includes(upper)) {
    return { ok: true, code: upper as TransferClassificationCode };
  }
  return {
    ok: false,
    error: `허용되지 않는 코드입니다. 허용 값: ${allowed.join(", ")}`,
  };
}
