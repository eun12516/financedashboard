import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function classificationMatchesAmountSign(code: string, amount: Prisma.Decimal): string | null {
  if (code === "ASSET_MOVEMENT" || code === "UNCLASSIFIED") return null;
  if (code === "INVESTMENT") return null;

  if (code === "INCOME") {
    if (amount.lte(0)) return "수입 분류는 양수 금액에만 지정할 수 있습니다.";
    return null;
  }
  if (code === "SPENDING" || code === "BUSINESS") {
    if (amount.gte(0)) return "소비·사업비 분류는 음수(지출) 금액에만 지정할 수 있습니다.";
    return null;
  }
  return null;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/transactions/:id  { "classificationCode": "SPENDING" | "INCOME" | ... }
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code =
    typeof body === "object" &&
    body !== null &&
    "classificationCode" in body &&
    typeof (body as { classificationCode: unknown }).classificationCode === "string"
      ? (body as { classificationCode: string }).classificationCode.trim()
      : null;

  if (!code) {
    return NextResponse.json({ error: "classificationCode is required" }, { status: 400 });
  }

  const cls = await prisma.transferClassification.findUnique({ where: { code } });
  if (!cls) {
    return NextResponse.json({ error: "Unknown classification code" }, { status: 400 });
  }

  const existing = await prisma.transaction.findUnique({
    where: { id },
    select: { amount: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const signErr = classificationMatchesAmountSign(code, existing.amount);
  if (signErr) {
    return NextResponse.json({ error: signErr }, { status: 400 });
  }

  try {
    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        transferClassificationId: cls.id,
        classificationManual: true,
      },
      select: {
        id: true,
        transferClassificationId: true,
        classification: { select: { code: true, label: true } },
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }
}
