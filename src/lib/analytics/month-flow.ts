import type { Prisma } from "@prisma/client";
import type { MonthClassificationFlowRow, MonthFlowSummary } from "./types";

/**
 * 한 달 거래를 분류별로 묶어 +유입 / −유출을 한눈에 보기 위한 요약.
 */
export function buildMonthFlowSummary(
  rows: {
    amount: Prisma.Decimal;
    classification: { code: string; label: string } | null;
  }[],
): MonthFlowSummary {
  let totalInflow = 0;
  let totalOutflow = 0;
  let netChange = 0;

  const map = new Map<
    string,
    { label: string; net: number; inflow: number; outflow: number }
  >();

  for (const r of rows) {
    const amt = r.amount.toNumber();
    netChange += amt;
    const code = r.classification?.code ?? "UNKNOWN";
    const label = r.classification?.label ?? "미분류";

    if (!map.has(code)) {
      map.set(code, { label, net: 0, inflow: 0, outflow: 0 });
    }
    const b = map.get(code)!;
    b.net += amt;
    if (amt > 0) {
      b.inflow += amt;
      totalInflow += amt;
    } else if (amt < 0) {
      const a = -amt;
      b.outflow += a;
      totalOutflow += a;
    }
  }

  const byClassification: MonthClassificationFlowRow[] = [...map.entries()]
    .map(([code, v]) => ({
      code,
      label: v.label,
      net: v.net,
      inflow: v.inflow,
      outflow: v.outflow,
    }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

  return {
    totalInflow,
    totalOutflow,
    netChange,
    byClassification,
  };
}
