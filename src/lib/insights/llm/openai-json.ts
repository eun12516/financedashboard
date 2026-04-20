/**
 * Minimal OpenAI Chat Completions JSON-mode caller (provider-specific, swappable).
 * Server-only via `@/lib/openai-config` (do not import from client bundles).
 */

import {
  getOpenAIApiKey,
  getOpenAIClassificationModel,
  getOpenAIInsightsModel,
} from "@/lib/openai-config";

export type OpenAiJsonResult =
  | { ok: true; content: string; model: string }
  | { ok: false; error: string };

export async function openAiChatJson(params: {
  systemPrompt: string;
  userPrompt: string;
  /** Overrides `OPENAI_INSIGHTS_MODEL` / default (e.g. classification uses another model). */
  model?: string;
  maxTokens?: number;
}): Promise<OpenAiJsonResult> {
  const key = getOpenAIApiKey();
  if (!key) {
    return { ok: false, error: "OPENAI_API_KEY is not set" };
  }

  const model = params.model ?? getOpenAIInsightsModel();

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.25,
        max_tokens: params.maxTokens ?? 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: `OpenAI HTTP ${res.status}: ${errText.slice(0, 400)}` };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return { ok: false, error: "Empty OpenAI response" };
    }
    return { ok: true, content, model };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "OpenAI request failed";
    return { ok: false, error: msg };
  }
}

/** Same as `openAiChatJson`, but defaults to `OPENAI_CLASSIFICATION_MODEL` (monthly AI classification). */
export async function openAiClassificationChatJson(params: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  maxTokens?: number;
}): Promise<OpenAiJsonResult> {
  return openAiChatJson({
    ...params,
    model: params.model ?? getOpenAIClassificationModel(),
  });
}
