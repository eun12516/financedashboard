"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { YearMonth } from "@/lib/analytics/types";
import { adjacentMonth } from "@/lib/dashboard/parse-period";

/**
 * 현재 월 기준 이전·다음 달 대시보드 RSC를 미리 받아 두어
 * 월 이동 클릭 시(Vercel↔DB 왕복) 체감 지연을 줄입니다.
 */
export function PrefetchAdjacentMonths({ current }: { current: YearMonth }) {
  const router = useRouter();

  useEffect(() => {
    const prev = adjacentMonth(current.year, current.month, -1);
    const next = adjacentMonth(current.year, current.month, 1);
    router.prefetch(`/dashboard?year=${prev.year}&month=${prev.month}`);
    router.prefetch(`/dashboard?year=${next.year}&month=${next.month}`);
  }, [current.year, current.month, router]);

  return null;
}
