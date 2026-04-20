import { prisma } from "@/lib/prisma";

/** 신규 가입·첫 로그인 시 자동 생성되는 기본 재무 계정 이름 (현금·일반 가계부용). */
export const DEFAULT_FINANCIAL_ACCOUNT_NAME = "기본 계정";

/**
 * 해당 사용자에게 기본 Account가 없으면 하나 만듭니다. (중복 방지: userId+name 유니크 + upsert)
 */
export async function ensureDefaultFinancialAccount(userId: string): Promise<void> {
  await prisma.account.upsert({
    where: {
      userId_name: {
        userId,
        name: DEFAULT_FINANCIAL_ACCOUNT_NAME,
      },
    },
    create: {
      userId,
      name: DEFAULT_FINANCIAL_ACCOUNT_NAME,
      currency: "KRW",
    },
    update: {},
  });
}
