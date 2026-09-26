import { requireCsrf, requireRecentMfa } from "@/lib/admin-security";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { errorResponse, requireAdmin, ServiceError } from "@/lib/server";

export async function POST(request:Request){
  try{await requireCsrf(request);const user=await requireAdmin();await requireRecentMfa(user.userId);const supabase=await createSupabaseServerClient();if(!supabase)throw new ServiceError(503,"MFA is temporarily unavailable.");const factors=await supabase.auth.mfa.listFactors();if((factors.data?.totp||[]).filter(f=>f.status==="verified").length>=2)throw new ServiceError(400,"Two authenticator factors are already enrolled.");for(const factor of factors.data?.totp||[]){if(factor.status!=="verified")await supabase.auth.mfa.unenroll({factorId:factor.id}).catch(()=>undefined);}const enrolled=await supabase.auth.mfa.enroll({factorType:"totp",friendlyName:"fraus backup"});if(enrolled.error||!enrolled.data?.totp)throw new ServiceError(503,"Backup-factor enrollment could not start.");return Response.json({factorId:enrolled.data.id,qrCode:enrolled.data.totp.qr_code,secret:enrolled.data.totp.secret},{headers:{"cache-control":"private, no-store"}});}catch(error){return errorResponse(error);}
}
