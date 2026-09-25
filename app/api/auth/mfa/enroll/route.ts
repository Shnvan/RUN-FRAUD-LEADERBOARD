import { getCurrentUser, isAdminEmailAllowed } from "@/app/chatgpt-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { errorResponse, sameOrigin, ServiceError } from "@/lib/server";

export async function POST(request:Request){
  try{
    if(!sameOrigin(request))throw new ServiceError(403,"Request not allowed.");
    const user=await getCurrentUser();
    if(!user||user.provider!=="supabase"||!isAdminEmailAllowed(user.email))throw new ServiceError(403,"Access denied.");
    const supabase=await createSupabaseServerClient();if(!supabase)throw new ServiceError(503,"MFA is temporarily unavailable.");
    const factors=await supabase.auth.mfa.listFactors();
    const verified=(factors.data?.totp||[]).filter(f=>f.status==="verified");
    if(verified.length)return Response.json({state:"mfa",factors:verified.map(f=>({id:f.id,name:f.friendly_name||"Authenticator"}))},{headers:{"cache-control":"private, no-store"}});
    for(const factor of factors.data?.totp||[]){if(factor.status!=="verified")await supabase.auth.mfa.unenroll({factorId:factor.id}).catch(()=>undefined);}
    const enrolled=await supabase.auth.mfa.enroll({factorType:"totp",friendlyName:"fraus admin"});
    if(enrolled.error||!enrolled.data?.totp)throw new ServiceError(503,"MFA enrollment could not start.");
    return Response.json({state:"enroll",factorId:enrolled.data.id,qrCode:enrolled.data.totp.qr_code,secret:enrolled.data.totp.secret},{headers:{"cache-control":"private, no-store"}});
  }catch(error){return errorResponse(error);}
}
