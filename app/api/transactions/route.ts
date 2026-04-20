import { NextResponse } from "next/server";
import { getMonthTransactionsForDashboard, listTransferClassifications } from "@/services/month-transactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/transactions?year=2026&month=4
 * 월별 거래 목록(재분류 UI) + 분류 옵션.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const y = Number.parseInt(searchParams.get("year") ?? "", 10);
  const m = Number.parseInt(searchParams.get("month") ?? "", 10);
  if (!Number.isInteger(y) || y < 2000 || y > 2100 || !Number.isInteger(m) || m < 1 || m > 12) {
    return NextResponse.json({ error: "Invalid year/month" }, { status: 400 });
  }

  try {
    const [transactions, classifications] = await Promise.all([
      getMonthTransactionsForDashboard(y, m, 50),
      listTransferClassifications(),
    ]);

    return NextResponse.json({
      period: { year: y, month: m },
      transactions: transactions.map((t) => ({
        ...t,
        occurredOn: t.occurredOn.toISOString().slice(0, 10),
      })),
      classifications,
    });
  } catch (e) {
    console.error("[api/transactions]", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
