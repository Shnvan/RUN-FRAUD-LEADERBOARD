import { clearAdminSecurityCookies, requireCsrf } from "@/lib/admin-security";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/server";

export async function POST(request:Request){
  try{await requireCsrf(request);const supabase=await createSupabaseServerClient();if(supabase)await supabase.auth.signOut({scope:"global"});await clearAdminSecurityCookies();return Response.json({ok:true},{headers:{"cache-control":"private, no-store"}});}catch(error){return errorResponse(error);}
}
