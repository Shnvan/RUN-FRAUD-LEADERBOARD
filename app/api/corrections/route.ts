import { boundedJson, contentFingerprint, dbRpc, errorResponse, networkFingerprint, recordSecurityEvent, sameOrigin, verifyTurnstile, ServiceError, validUuid } from "@/lib/server";

export async function POST(request:Request){
  let networkKey:string|null=null;
  try{
    if(!sameOrigin(request))throw new ServiceError(403,"Request not allowed.");
    const data=await boundedJson<Record<string,unknown>>(request);
    const purchaseId=typeof data.purchaseId==="string"?data.purchaseId:"",issueType=typeof data.issueType==="string"?data.issueType:"";
    const email=typeof data.email==="string"?data.email.trim().toLowerCase():"",details=typeof data.details==="string"?data.details.trim():"";
    const token=typeof data.turnstileToken==="string"?data.turnstileToken:"",bodyKey=typeof data.idempotencyKey==="string"?data.idempotencyKey:"";
    const idempotency=request.headers.get("idempotency-key")||bodyKey;
    if(!validUuid(purchaseId))throw new ServiceError(400,"Choose a public record.");
    if(!["wrong_seller","wrong_amount","duplicate","not_a_purchase","refund_received","loss_resolved","other"].includes(issueType))throw new ServiceError(400,"Choose an issue type.");
    if(!email||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new ServiceError(400,"Enter an email address so we can follow up.");
    if(details.length>500)throw new ServiceError(400,"Keep details under 500 characters.");
    if(!validUuid(idempotency)||idempotency!==bodyKey)throw new ServiceError(400,"Refresh the form and try again.");
    await verifyTurnstile(token,new URL(request.url).hostname,request,"correction_request",idempotency);
    const normalizedDetails=details.trim().toLowerCase().replace(/\s+/g," ");
    networkKey=await networkFingerprint(request);
    await dbRpc<string>("submit_correction_secure",{p_purchase:purchaseId,p_issue:issueType,p_email:email,p_details:details,p_fingerprint:networkKey,p_content_fingerprint:await contentFingerprint(`${purchaseId}|${issueType}|${normalizedDetails}`),p_idempotency:idempotency});
    return Response.json({status:"pending"},{status:201,headers:{"cache-control":"no-store"}});
  }catch(error){const code=error instanceof ServiceError?error.code:"internal_error";if(["rate_limited","circuit_open","turnstile_rejected","turnstile_unavailable"].includes(code))await recordSecurityEvent(code,code==="circuit_open"?"activated":"rejected",networkKey,request.headers.get("x-vercel-id"));return errorResponse(error);}
}
