import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — 활성 계정 목록 (업로드 시 accountId 선택용) */
export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, currency: true },
    });
    return NextResponse.json({ accounts });
  } catch (e) {
    console.error("[api/accounts]", e);
    return NextResponse.json({ error: "계정 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}
