import type { MetricDelta } from "./types";

export function computeMetricDelta(current: number, previous: number): MetricDelta {
  const absoluteDelta = current - previous;
  let percentDelta: number | null;
  if (previous === 0) {
    percentDelta = current === 0 ? 0 : null;
  } else {
    percentDelta = (absoluteDelta / previous) * 100;
  }
  return { current, previous, absoluteDelta, percentDelta };
}
