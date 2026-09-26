import { boundedFormData, contentFingerprint, dbRpc, deleteEvidence, errorResponse, networkFingerprint, recordSecurityEvent, requirePrivateEvidenceBucket, sameOrigin, uploadEvidence, verifyTurnstile, ServiceError, validUuid } from "@/lib/server";
import { sanitizeEvidence } from "@/lib/evidence";
import { normalizeHandle, validForumUsername, validHandle } from "@/lib/domain";
import {canonicalItems,itemTotals,parseReportItems} from "@/lib/report-items.mjs";

const issues=new Set(["not_delivered","refund_not_received","other_unresolved"]);
type Reservation={existing_id:string|null;flags:string[];proceed:boolean};
const canonicalText=(value:string)=>value.trim().toLowerCase().replace(/\s+/g," ");

export async function POST(request:Request){
  let evidencePath:string|null=null;
  let networkKey:string|null=null;
  try{
    if(!sameOrigin(request))throw new ServiceError(403,"Request not allowed.");
    const data=await boundedFormData(request);
    const handle=normalizeHandle(String(data.get("seller")||""));
    const buyerUsername=String(data.get("buyerUsername")||"").trim();
    const issue=String(data.get("issueType")||""),details=String(data.get("details")||"").trim();
    const formIdempotency=String(data.get("idempotencyKey")||"");
    let items;
    try{items=parseReportItems(String(data.get("items")||""));}
    catch{throw new ServiceError(400,"Add between one and eight valid product rows.");}
    const totals=itemTotals(items);
    const idempotency=request.headers.get("idempotency-key")||formIdempotency;
    const token=String(data.get("turnstileToken")||"");
    if(!validHandle(handle))throw new ServiceError(400,"Enter a valid seller handle.");
    if(!validForumUsername(buyerUsername))throw new ServiceError(400,"Enter your forum username (2 to 64 characters).");
    if(!issues.has(issue))throw new ServiceError(400,"Choose what remains unresolved.");
    if(details.length<10||details.length>500)throw new ServiceError(400,"Describe what happened in 10 to 500 characters.");
    if(!validUuid(idempotency)||formIdempotency!==idempotency)throw new ServiceError(400,"Refresh the form and try again.");
    await verifyTurnstile(token,new URL(request.url).hostname,request,"loss_report",idempotency);
    networkKey=await networkFingerprint(request);
    const duplicateKey=await contentFingerprint(`${handle}|${canonicalItems(items)}|${totals.total}|${issue}|${canonicalText(details)}`);
    const reservation=await dbRpc<Reservation>("reserve_loss_submission",{p_fingerprint:networkKey,p_content_fingerprint:duplicateKey,p_seller_key:handle,p_idempotency:idempotency});
    if(reservation.flags?.length)await recordSecurityEvent("loss_report_flagged","held",networkKey,request.headers.get("x-vercel-id"),{flags:reservation.flags,seller:handle});
    if(reservation.existing_id||!reservation.proceed)return Response.json({status:"pending"},{status:200,headers:{"cache-control":"no-store"}});
    const rawFile=data.get("evidence");let safeFile:File|null=null;
    if(rawFile instanceof File&&rawFile.size){await requirePrivateEvidenceBucket();safeFile=await sanitizeEvidence(rawFile);evidencePath=`${crypto.randomUUID()}.webp`;await uploadEvidence(safeFile,evidencePath);}
    await dbRpc<string>("submit_loss_report_secure_v3",{p_handle:handle,p_buyer_username:buyerUsername,p_items:items,p_issue:issue,p_details:details,p_idempotency:idempotency,p_fingerprint:networkKey,p_duplicate_key:duplicateKey,p_evidence_path:evidencePath,p_evidence_sanitized:Boolean(safeFile)});
    return Response.json({status:"pending"},{status:201,headers:{"cache-control":"no-store"}});
  }catch(error){if(evidencePath&&(!(error instanceof ServiceError)||error.status<500))await deleteEvidence(evidencePath);const code=error instanceof ServiceError?error.code:"internal_error";if(["rate_limited","circuit_open","turnstile_rejected","turnstile_unavailable","evidence_rejected"].includes(code))await recordSecurityEvent(code,code==="circuit_open"?"activated":"rejected",networkKey,request.headers.get("x-vercel-id"));return errorResponse(error);}
}
