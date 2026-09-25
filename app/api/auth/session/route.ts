import { createSupabaseServerClient } from "@/lib/supabase/server";
import { issueCsrfToken } from "@/lib/admin-security";
import { dbRpc, errorResponse, requireAdmin } from "@/lib/server";

export async function GET(){
  try{
    const user=await requireAdmin();
    const supabase=await createSupabaseServerClient();
    const factors=supabase?(await supabase.auth.mfa.listFactors()).data?.totp||[]:[];
    const sessions=await dbRpc<Array<{id:string;created_at:string;updated_at:string}>>("get_admin_sessions",{p_user_id:user.userId});
    return Response.json({email:user.email,aal:user.aal||null,sessionId:user.sessionId,csrfToken:await issueCsrfToken(),factors:factors.filter(f=>f.status==="verified").map(f=>({id:f.id,name:f.friendly_name||"Authenticator"})),sessions},{headers:{"cache-control":"private, no-store"}});
  }catch(error){return errorResponse(error);}
}
