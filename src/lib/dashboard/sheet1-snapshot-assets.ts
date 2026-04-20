export type StockPieSlice = { name: string; value: number };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Sheet1 extra JSON에서 투자 보유 → 파이용 (평가금액 우선). */
export function stockPieFromSheet1Extra(extra: unknown): StockPieSlice[] {
  if (!isRecord(extra)) return [];
  const inv = extra.investments;
  if (!Array.isArray(inv)) return [];
  const out: StockPieSlice[] = [];
  for (let i = 0; i < inv.length; i++) {
    const row = inv[i];
    if (!isRecord(row)) continue;
    const name = String(row.productName ?? row.kind ?? `상품 ${i + 1}`).slice(0, 32);
    const valuation = row.valuation;
    const principal = row.principal;
    const v =
      typeof valuation === "number" && Number.isFinite(valuation)
        ? valuation
        : typeof principal === "number" && Number.isFinite(principal)
          ? principal
          : 0;
    if (v > 0) out.push({ name, value: v });
  }
  return out;
}

/** 총자산 표시값: 재무 블록 총자산 → 순자산 → 투자 평가 합(대체) */
export function resolveTotalAssetsWon(extra: unknown): number | null {
  if (!isRecord(extra)) return null;
  const fin = extra.finance;
  if (isRecord(fin)) {
    const ta = fin.totalAssets;
    const net = fin.netAssets;
    if (typeof ta === "number" && Number.isFinite(ta) && ta > 0) return ta;
    if (typeof net === "number" && Number.isFinite(net) && net > 0) return net;
  }
  const pie = stockPieFromSheet1Extra(extra);
  const sum = pie.reduce((s, x) => s + x.value, 0);
  return sum > 0 ? sum : null;
}

export function netAssetsWonFromExtra(extra: unknown): number | null {
  if (!isRecord(extra) || !isRecord(extra.finance)) return null;
  const n = extra.finance.netAssets;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}
