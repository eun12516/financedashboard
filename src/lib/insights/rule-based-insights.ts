import type { CompactAnalyticsPayload } from "./compact-analytics";
import type { InsightCard } from "./types";

/**
 * Deterministic insights when LLM is unavailable or validation fails.
 * Uses the same compact payload only — no raw transactions.
 */
export function buildRuleBasedInsights(payload: CompactAnalyticsPayload): InsightCard[] {
  const out: InsightCard[] = [];
  const { executive, comparison, spendingConcentration, trend, eligibility } = payload;

  if (executive.transactionCount === 0) {
    return [
      {
        type: "observation",
        title: "거래 데이터 없음",
        message: `${payload.period.year}년 ${payload.period.month}월에 저장된 거래가 없어 인사이트를 만들 수 없습니다. 파일을 업로드해 주세요.`,
        priority: "low",
      },
    ];
  }

  if (eligibility.note && !eligibility.sufficientForLLM) {
    out.push({
      type: "observation",
      title: "데이터가 적음",
      message: eligibility.note,
      priority: "low",
    });
  }

  const sp = comparison.spending.percentDelta;
  if (sp !== null && Math.abs(sp) >= 15) {
    out.push({
      type: "observation",
      title: "지출 변화",
      message: `전월 대비 지출이 약 ${sp > 0 ? "+" : ""}${sp.toFixed(1)}% 변했습니다. (당월 ${formatKRW(executive.totalSpending)}, 전월 ${formatKRW(comparison.spending.previous)})`,
      priority: "medium",
    });
  }

  const topCat = spendingConcentration.topCategories[0];
  if (topCat?.shareOfTotalSpendingPct != null && topCat.shareOfTotalSpendingPct >= 40) {
    out.push({
      type: "warning",
      title: "카테고리 집중",
      message: `가장 큰 지출 카테고리는 "${topCat.name}"로, 총 지출의 약 ${topCat.shareOfTotalSpendingPct.toFixed(0)}%를 차지합니다.`,
      priority: "high",
    });
  }

  const topMerch = spendingConcentration.topMerchants[0];
  if (topMerch?.shareOfTotalSpendingPct != null && topMerch.shareOfTotalSpendingPct >= 35) {
    out.push({
      type: "warning",
      title: "가맹점 집중",
      message: `"${topMerch.name}"에 대한 지출이 총 지출의 약 ${topMerch.shareOfTotalSpendingPct.toFixed(0)}%입니다.`,
      priority: "medium",
    });
  }

  if (executive.netCashflow < 0) {
    out.push({
      type: "warning",
      title: "순현금흐름 음수",
      message: `이번 달 순현금흐름(수입−지출)은 ${formatKRW(executive.netCashflow)}입니다. 변동비 점검을 고려해 보세요.`,
      priority: "high",
    });
  } else {
    out.push({
      type: "observation",
      title: "순현금흐름",
      message: `이번 달 순현금흐름은 ${formatKRW(executive.netCashflow)}입니다.`,
      priority: "low",
    });
  }

  const inc = comparison.income.percentDelta;
  const inv = comparison.investment.percentDelta;
  if (
    sp !== null &&
    inc !== null &&
    sp > 10 &&
    inc < 5 &&
    executive.totalSpending > 0
  ) {
    out.push({
      type: "warning",
      title: "지출 증가와 수입",
      message:
        "지출 증가율이 수입 증가율보다 크게 나타납니다. 고정비·구독 항목을 한 번 점검해 보는 것이 좋습니다.",
      priority: "medium",
    });
  }

  if (inv !== null && inv > 20 && executive.totalInvestment > 0) {
    out.push({
      type: "action",
      title: "투자 이체 증가",
      message: `투자로 분류된 이체가 전월 대비 약 ${inv > 0 ? "+" : ""}${inv.toFixed(1)}% 변했습니다. 비상금이 충분한지 확인해 보세요.`,
      priority: "medium",
    });
  }

  const negMonths = trend.months.filter((m) => m.netCashflow < 0).length;
  if (trend.months.length >= 3 && negMonths >= 3) {
    out.push({
      type: "warning",
      title: "현금흐름 추세",
      message: `최근 ${trend.months.length}개월 중 다수에서 순현금흐름이 음수입니다. 지출 구조를 점검할 시점일 수 있습니다.`,
      priority: "high",
    });
  }

  if (out.length === 0) {
    out.push({
      type: "observation",
      title: "요약",
      message: `이번 달 거래 ${executive.transactionCount}건이 반영되었습니다. 특이한 패턴은 자동 규칙에서 감지되지 않았습니다.`,
      priority: "low",
    });
  }

  return dedupeAndCap(out, 6);
}

function formatKRW(n: number): string {
  return `${Math.round(n).toLocaleString("ko-KR")}원`;
}

function dedupeAndCap(cards: InsightCard[], max: number): InsightCard[] {
  const seen = new Set<string>();
  const res: InsightCard[] = [];
  for (const c of cards) {
    const key = `${c.type}:${c.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    res.push(c);
    if (res.length >= max) break;
  }
  return res;
}
