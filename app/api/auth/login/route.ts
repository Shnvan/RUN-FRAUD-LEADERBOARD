import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminEmailAllowed } from "@/app/chatgpt-auth";
import { boundedJson, dbRpc, errorResponse, networkFingerprint, recordSecurityEvent, sameOrigin, ServiceError } from "@/lib/server";

export async function POST(request:Request){
  let network:string|null=null;
  try{
    if(!sameOrigin(request))throw new ServiceError(403,"Request not allowed.");
    const data=await boundedJson<{email?:unknown;password?:unknown}>(request);
    const email=typeof data.email==="string"?data.email.trim().toLowerCase():"";
    const password=typeof data.password==="string"?data.password:"";
    if(email.length>254||password.length<12||password.length>256)throw new ServiceError(400,"The email or password is incorrect.");
    network=await networkFingerprint(request,"admin-login");
    await dbRpc("reserve_auth_attempt",{p_fingerprint:network,p_kind:"password"});
    const supabase=await createSupabaseServerClient();
    if(!supabase)throw new ServiceError(503,"Administrator sign-in is temporarily unavailable.");
    const result=await supabase.auth.signInWithPassword({email,password});
    if(result.error||!result.data.user?.email||!isAdminEmailAllowed(result.data.user.email)){
      await supabase.auth.signOut().catch(()=>undefined);
      throw new ServiceError(401,"The email or password is incorrect.");
    }
    const factors=await supabase.auth.mfa.listFactors();
    const verified=(factors.data?.totp||[]).filter(f=>f.status==="verified").map(f=>({id:f.id,name:f.friendly_name||"Authenticator"}));
    await recordSecurityEvent("admin_password","accepted",network,request.headers.get("x-vercel-id"));
    return Response.json({state:verified.length?"mfa":"enroll",factors:verified},{headers:{"cache-control":"private, no-store"}});
  }catch(error){if(network)await recordSecurityEvent("admin_password","rejected",network,request.headers.get("x-vercel-id"));return errorResponse(error);}
}
