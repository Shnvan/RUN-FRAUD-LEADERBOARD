import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminEmailAllowed } from "@/app/chatgpt-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const rawNext = url.searchParams.get("next") || "/admin";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/admin";
  const supabase = await createSupabaseServerClient();
  if (!code || !supabase) return NextResponse.redirect(new URL("/admin?auth=failed", url.origin));

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  const email = data.user?.email?.trim();
  if (error || !email || !isAdminEmailAllowed(email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/admin?auth=denied", url.origin));
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
