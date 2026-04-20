import { NextResponse } from "next/server";
import {
  AnalyticsValidationError,
  getAnalyticsSummary,
} from "@/services/analytics-summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/summary?year=2026&month=4&trendMonths=6
 * Returns dashboard-ready JSON (executive, MoM comparison, spending breakdown, trend).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const yearRaw = searchParams.get("year");
  const monthRaw = searchParams.get("month");
  const trendRaw = searchParams.get("trendMonths");

  if (yearRaw === null || monthRaw === null) {
    return NextResponse.json(
      { error: "Query params `year` and `month` are required (integers)." },
      { status: 400 },
    );
  }

  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);
  if (Number.isNaN(year) || Number.isNaN(month)) {
    return NextResponse.json({ error: "year and month must be integers." }, { status: 400 });
  }

  let trendMonths: number | undefined;
  if (trendRaw !== null && trendRaw !== "") {
    const t = Number.parseInt(trendRaw, 10);
    if (Number.isNaN(t)) {
      return NextResponse.json({ error: "trendMonths must be an integer." }, { status: 400 });
    }
    trendMonths = t;
  }

  try {
    const payload = await getAnalyticsSummary(year, month, { trendMonthCount: trendMonths });
    return NextResponse.json(payload);
  } catch (e) {
    if (e instanceof AnalyticsValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[analytics/summary]", e);
    return NextResponse.json({ error: "Failed to compute analytics" }, { status: 500 });
  }
}
