import "server-only";

import { NextResponse } from "next/server";
import { LEGACY_DEFAULT_USER_ID } from "@/lib/auth-constants";
import { ensureDefaultFinancialAccount } from "@/lib/ensure-default-account";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AppUser = {
  id: string;
  email: string;
};

export class AuthError extends Error {
  constructor(
    message = "Unauthorized",
    public readonly status = 401,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Returns the signed-in app user (Prisma `users` row synced from Supabase Auth), or null.
 */
async function claimLegacyDataToUserId(authUserId: string): Promise<void> {
  if (authUserId === LEGACY_DEFAULT_USER_ID) return;

  const hasOwn = await prisma.account.count({ where: { userId: authUserId } });
  if (hasOwn > 0) return;

  const legacyAccounts = await prisma.account.count({ where: { userId: LEGACY_DEFAULT_USER_ID } });
  if (legacyAccounts === 0) return;

  await prisma.$transaction(async (tx) => {
    await tx.account.updateMany({
      where: { userId: LEGACY_DEFAULT_USER_ID },
      data: { userId: authUserId },
    });
    await tx.upload.updateMany({
      where: { userId: LEGACY_DEFAULT_USER_ID },
      data: { userId: authUserId },
    });
    await tx.transaction.updateMany({
      where: { userId: LEGACY_DEFAULT_USER_ID },
      data: { userId: authUserId },
    });
    await tx.workbookSheet1Snapshot.updateMany({
      where: { userId: LEGACY_DEFAULT_USER_ID },
      data: { userId: authUserId },
    });
    await tx.user.delete({ where: { id: LEGACY_DEFAULT_USER_ID } });
  });
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) return null;

  const email = user.email?.trim() || `${user.id}@users.supabase.local`;

  const claimTarget = process.env.AUTO_CLAIM_LEGACY_EMAIL?.trim();
  if (claimTarget && email === claimTarget) {
    await claimLegacyDataToUserId(user.id);
  }

  const row = await prisma.user.upsert({
    where: { id: user.id },
    create: { id: user.id, email },
    update: { email },
    select: { id: true, email: true },
  });

  await ensureDefaultFinancialAccount(row.id);

  return { id: row.id, email: row.email };
}

/**
 * Use in Server Components, Route Handlers, and Server Actions.
 */
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError();
  return user;
}

/** Route Handlers: returns `NextResponse` when unauthenticated instead of throwing. */
export async function requireUserResponse(): Promise<AppUser | NextResponse> {
  try {
    return await requireUser();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
