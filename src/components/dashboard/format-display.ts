/** Display helpers only — analytics values come from the backend as numbers. */

export function formatCurrencyKRW(n: number): string {
  try {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${Math.round(n).toLocaleString("ko-KR")}원`;
  }
}

export function formatSignedCurrencyKRW(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return sign + formatCurrencyKRW(Math.abs(n));
}

/** Percent delta; `null` → em dash (undefined prior month baseline). */
export function formatPercentDelta(pct: number | null): string {
  if (pct === null) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function periodLabel(p: { year: number; month: number }): string {
  return `${p.year}년 ${p.month}월`;
}
