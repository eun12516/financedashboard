import { createBrowserClient } from "@supabase/ssr";

/** Publishable(권장) 또는 기존 Dashboard의 `anon` JWT — 둘 중 하나면 됩니다. URL·키는 같은 프로젝트여야 합니다. */
function supabaseUrlAndKey(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and a client key (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    );
  }
  return { url, key };
}

export function createBrowserSupabaseClient() {
  const { url, key } = supabaseUrlAndKey();
  return createBrowserClient(url, key);
}
