import { InsightsEnvelopeSchema } from "./types";

/** Extract first JSON object from model output (tolerates stray text). */
export function extractJsonObject(raw: string): string {
  const t = raw.trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) return t.slice(start, end + 1);
  return t;
}

export function safeParseInsightsEnvelope(raw: string) {
  try {
    const json = extractJsonObject(raw);
    const parsed: unknown = JSON.parse(json);
    return InsightsEnvelopeSchema.safeParse(parsed);
  } catch {
    return { success: false as const, error: new Error("Invalid JSON") };
  }
}
