import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function supabaseAuthConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

export async function createSupabaseServerClient() {
  const config = supabaseAuthConfig();
  if (!config) return null;

  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookieOptions:{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/"},
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server components cannot write cookies; route handlers can.
        }
      },
    },
  });
}
