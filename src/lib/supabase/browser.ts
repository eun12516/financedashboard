import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/**
 * Browser-side Supabase client (Auth / Realtime / Storage 등).
 * Prisma DB 접속과는 별개 — `DATABASE_URL` / `DIRECT_URL` 여전히 필요.
 *
 * `NEXT_PUBLIC_*` 가 없으면 null (앱은 DB 없이도 빌드 가능).
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url?.trim() || !key?.trim()) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(url, key);
  }
  return browserClient;
}
