import {requireCsrf,requireRecentMfa} from "@/lib/admin-security";
import {sanitizeSellerAvatar} from "@/lib/evidence";
import {boundedFormData,boundedJson,dbRpc,deleteSellerImage,errorResponse,recordSecurityEvent,requireAdmin,requirePrivateSellerImageBucket,sameOrigin,ServiceError,uploadSellerImage,validUuid} from "@/lib/server";

export async function POST(request:Request,{params}:{params:Promise<{sellerId:string}>}){
  let path:string|null=null;
  try{
    if(!sameOrigin(request))throw new ServiceError(403,"Request not allowed.");await requireCsrf(request);const admin=await requireAdmin();await requireRecentMfa(admin.userId);
    const {sellerId}=await params;if(!validUuid(sellerId))throw new ServiceError(400,"Choose a seller.");
    await requirePrivateSellerImageBucket();const data=await boundedFormData(request);const raw=data.get("avatar");if(!(raw instanceof File))throw new ServiceError(400,"Choose an image.");
    const safe=await sanitizeSellerAvatar(raw);path=`${sellerId}/${crypto.randomUUID()}.webp`;await uploadSellerImage(safe,path);
    const old=await dbRpc<string|null>("replace_seller_avatar",{p_seller_id:sellerId,p_new_path:path,p_actor:admin.email,p_actor_id:admin.userId,p_session_id:admin.sessionId,p_reason:"Moderator-selected seller reference image",p_request_id:request.headers.get("x-vercel-id")||crypto.randomUUID()});
    if(old)await deleteSellerImage(old);return Response.json({ok:true},{headers:{"cache-control":"private, no-store"}});
  }catch(error){if(path)await deleteSellerImage(path);await recordSecurityEvent("seller_avatar_mutation","rejected",null,request.headers.get("x-vercel-id"));return errorResponse(error);}
}

export async function DELETE(request:Request,{params}:{params:Promise<{sellerId:string}>}){
  try{
    if(!sameOrigin(request))throw new ServiceError(403,"Request not allowed.");await requireCsrf(request);const admin=await requireAdmin();await requireRecentMfa(admin.userId);
    const {sellerId}=await params;if(!validUuid(sellerId))throw new ServiceError(400,"Choose a seller.");const body=await boundedJson<{confirm?:string;reason?:string}>(request);
    if(body?.confirm!=="REMOVE IMAGE")throw new ServiceError(400,"Type REMOVE IMAGE to confirm.");const reason=body.reason?.trim()||"Seller image removed";
    const old=await dbRpc<string|null>("remove_seller_avatar",{p_seller_id:sellerId,p_actor:admin.email,p_actor_id:admin.userId,p_session_id:admin.sessionId,p_reason:reason.slice(0,500),p_request_id:request.headers.get("x-vercel-id")||crypto.randomUUID()});
    if(old)await deleteSellerImage(old);return Response.json({ok:true},{headers:{"cache-control":"private, no-store"}});
  }catch(error){return errorResponse(error);}
}
