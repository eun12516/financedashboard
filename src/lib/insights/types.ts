import { z } from "zod";

export const InsightTypeSchema = z.enum(["observation", "action", "warning"]);
export type InsightType = z.infer<typeof InsightTypeSchema>;

export const InsightPrioritySchema = z.enum(["low", "medium", "high"]);
export type InsightPriority = z.infer<typeof InsightPrioritySchema>;

export const InsightCardSchema = z.object({
  title: z.string().min(1).max(160),
  type: InsightTypeSchema,
  message: z.string().min(1).max(560),
  priority: InsightPrioritySchema.optional(),
});

export type InsightCard = z.infer<typeof InsightCardSchema>;

export const InsightsEnvelopeSchema = z.object({
  insights: z.array(InsightCardSchema).min(1).max(6),
});

export type InsightsEnvelope = z.infer<typeof InsightsEnvelopeSchema>;

export type InsightsSource = "llm" | "fallback" | "sparse";

export type InsightsApiResponse = {
  period: { year: number; month: number };
  source: InsightsSource;
  insights: InsightCard[];
  meta?: {
    model?: string;
    note?: string;
  };
};
