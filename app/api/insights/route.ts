import { NextResponse } from "next/server";
import { requireUserResponse } from "@/lib/auth";
import { AnalyticsValidationError } from "@/services/analytics-summary";
import { getFinancialInsights } from "@/services/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/insights?year=2026&month=4
 * Uses existing analytics layer → compact payload → LLM (or rule-based fallback).
 */
export async function GET(req: Request) {
  const userOrRes = await requireUserResponse();
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;

  const { searchParams } = new URL(req.url);
  const yearRaw = searchParams.get("year");
  const monthRaw = searchParams.get("month");

  if (yearRaw === null || monthRaw === null) {
    return NextResponse.json(
      { error: "Query params `year` and `month` are required." },
      { status: 400 },
    );
  }

  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);
  if (Number.isNaN(year) || Number.isNaN(month)) {
    return NextResponse.json({ error: "year and month must be integers." }, { status: 400 });
  }

  try {
    const payload = await getFinancialInsights(year, month, user.id);
    return NextResponse.json(payload);
  } catch (e) {
    if (e instanceof AnalyticsValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[api/insights]", e);
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}
