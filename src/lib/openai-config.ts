import "server-only";

/**
 * Server-only OpenAI configuration. Never import this module from Client Components
 * or any code that ships to the browser — `server-only` enforces that at build time.
 *
 * Reads `process.env` (Next.js loads `.env`, `.env.local`, `.env.development`, etc.).
 */

const DEFAULT_INSIGHTS_MODEL = "gpt-4o-mini";
const DEFAULT_CLASSIFICATION_MODEL = "gpt-4o-mini";

/** True when an API key is present (whitespace-trimmed). Safe to use in Server Components. */
export function isOpenAIConfigured(): boolean {
  return Boolean(getOpenAIApiKey());
}

/**
 * Returns the key only on the server. Never pass this to `NEXT_PUBLIC_*`, props, or JSON responses.
 */
export function getOpenAIApiKey(): string | undefined {
  const k = process.env.OPENAI_API_KEY?.trim();
  return k ? k : undefined;
}

export function getOpenAIInsightsModel(): string {
  return process.env.OPENAI_INSIGHTS_MODEL?.trim() || DEFAULT_INSIGHTS_MODEL;
}

/** For upcoming AI transaction classification (same key, model can differ). */
export function getOpenAIClassificationModel(): string {
  return process.env.OPENAI_CLASSIFICATION_MODEL?.trim() || DEFAULT_CLASSIFICATION_MODEL;
}
