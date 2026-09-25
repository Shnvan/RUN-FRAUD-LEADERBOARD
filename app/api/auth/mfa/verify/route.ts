import { getCurrentUser, isAdminEmailAllowed } from "@/app/chatgpt-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { boundedJson, dbRpc, errorResponse, networkFingerprint, recordSecurityEvent, sameOrigin, ServiceError, validUuid } from "@/lib/server";

export async function POST(request:Request){
  let network:string|null=null;
  try{
    if(!sameOrigin(request))throw new ServiceError(403,"Request not allowed.");
    const data=await boundedJson<{factorId?:unknown;code?:unknown}>(request);
    const factorId=data.factorId,code=typeof data.code==="string"?data.code.trim():"";
    if(!validUuid(factorId)||!/^\d{6}$/.test(code))throw new ServiceError(400,"Enter the current six-digit authenticator code.");
    const user=await getCurrentUser();if(!user||user.provider!=="supabase"||!isAdminEmailAllowed(user.email))throw new ServiceError(403,"Access denied.");
    network=await networkFingerprint(request,"admin-mfa");
    await dbRpc("reserve_auth_attempt",{p_fingerprint:network,p_kind:"mfa"});
    const supabase=await createSupabaseServerClient();if(!supabase)throw new ServiceError(503,"MFA is temporarily unavailable.");
    const factors=await supabase.auth.mfa.listFactors();
    if(!(factors.data?.totp||[]).some(f=>f.id===factorId))throw new ServiceError(400,"Authenticator factor not found.");
    const challenge=await supabase.auth.mfa.challenge({factorId});
    if(challenge.error||!challenge.data?.id)throw new ServiceError(401,"The authenticator code was not accepted.");
    const verified=await supabase.auth.mfa.verify({factorId,challengeId:challenge.data.id,code});
    if(verified.error)throw new ServiceError(401,"The authenticator code was not accepted.");
    await recordSecurityEvent("admin_mfa","accepted",network,request.headers.get("x-vercel-id"));
    return Response.json({ok:true},{headers:{"cache-control":"private, no-store"}});
  }catch(error){if(network)await recordSecurityEvent("admin_mfa","rejected",network,request.headers.get("x-vercel-id"));return errorResponse(error);}
}
