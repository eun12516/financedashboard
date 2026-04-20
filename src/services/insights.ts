import { buildCompactAnalyticsPayload, compactPayloadToPromptJson } from "@/lib/insights/compact-analytics";
import { openAiChatJson } from "@/lib/insights/llm/openai-json";
import { INSIGHTS_SYSTEM_PROMPT } from "@/lib/insights/prompts";
import { safeParseInsightsEnvelope } from "@/lib/insights/parse-envelope";
import { buildRuleBasedInsights } from "@/lib/insights/rule-based-insights";
import type { InsightsApiResponse } from "@/lib/insights/types";
import { isOpenAIConfigured } from "@/lib/openai-config";
import { getAnalyticsSummary } from "@/services/analytics-summary";

/**
 * End-to-end insights for a month: analytics → compact payload → LLM or rule-based fallback.
 * Does not persist results.
 */
export async function getFinancialInsights(
  year: number,
  month: number,
  userId: string,
): Promise<InsightsApiResponse> {
  const analytics = await getAnalyticsSummary(year, month, userId, { trendMonthCount: 6 });
  const compact = buildCompactAnalyticsPayload(analytics);

  if (compact.executive.transactionCount === 0) {
    return {
      period: { year, month },
      source: "sparse",
      insights: buildRuleBasedInsights(compact),
      meta: { note: "no_transactions" },
    };
  }

  if (!compact.eligibility.sufficientForLLM) {
    return {
      period: { year, month },
      source: "fallback",
      insights: buildRuleBasedInsights(compact),
      meta: { note: compact.eligibility.note },
    };
  }

  if (!isOpenAIConfigured()) {
    return {
      period: { year, month },
      source: "fallback",
      insights: buildRuleBasedInsights(compact),
      meta: { note: "openai_not_configured" },
    };
  }

  const userPrompt = `analytics_payload (JSON, authoritative — use only this data):\n${compactPayloadToPromptJson(compact)}`;

  const llm = await openAiChatJson({
    systemPrompt: INSIGHTS_SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 1200,
  });

  if (!llm.ok) {
    return {
      period: { year, month },
      source: "fallback",
      insights: buildRuleBasedInsights(compact),
      meta: { note: llm.error },
    };
  }

  const parsed = safeParseInsightsEnvelope(llm.content);
  if (!parsed.success) {
    return {
      period: { year, month },
      source: "fallback",
      insights: buildRuleBasedInsights(compact),
      meta: { note: "llm_parse_failed" },
    };
  }

  return {
    period: { year, month },
    source: "llm",
    insights: parsed.data.insights,
    meta: { model: llm.model },
  };
}
