import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sameOrigin } from "@/lib/server";

export async function POST(request: Request) {
  if(!sameOrigin(request))return Response.json({error:"Request not allowed."},{status:403,headers:{"cache-control":"no-store"}});
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/admin", request.url), 303);
}
