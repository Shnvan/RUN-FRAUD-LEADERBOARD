import { boundedFormData, dbGet, dbRpc, deleteEvidence, errorResponse, fingerprint, requirePrivateEvidenceBucket, sameOrigin, uploadEvidence, verifyTurnstile, ServiceError } from "@/lib/server";
import { normalizeHandle, validHandle, validPrice, validPurchaseDate, validQuantity, validUnresolvedAmount } from "@/lib/domain";

const types:Record<string,number[]>={"image/jpeg":[0xff,0xd8,0xff],"image/png":[0x89,0x50,0x4e,0x47],"image/webp":[0x52,0x49,0x46,0x46]};
const issues=new Set(["not_delivered","refund_not_received","other_unresolved"]);

export async function POST(request:Request){
  let evidencePath:string|null=null;
  try {
    if(!sameOrigin(request))throw new ServiceError(403,"Request not allowed.");
    const data=await boundedFormData(request);
    const handle=normalizeHandle(String(data.get("seller")||""));
    const date=String(data.get("purchaseDate")||"");
    const quantity=String(data.get("quantity")||"");
    const price=String(data.get("unitPrice")||"");
    const unresolved=String(data.get("unresolvedAmount")||"");
    const issue=String(data.get("issueType")||"");
    const details=String(data.get("details")||"").trim();
    const idempotency=String(data.get("idempotencyKey")||"");
    const token=String(data.get("turnstileToken")||"");
    if(!validHandle(handle))throw new ServiceError(400,"Enter a valid seller handle.");
    if(!validPurchaseDate(date))throw new ServiceError(400,"Choose a valid purchase date.");
    if(!validQuantity(quantity))throw new ServiceError(400,"Enter the number of accounts purchased.");
    if(!validPrice(price))throw new ServiceError(400,"Enter the price paid for each account.");
    if(!validUnresolvedAmount(unresolved,quantity,price))throw new ServiceError(400,"Enter an unresolved amount no greater than the purchase total.");
    if(!issues.has(issue))throw new ServiceError(400,"Choose what remains unresolved.");
    if(details.length<10||details.length>500)throw new ServiceError(400,"Describe what happened in 10 to 500 characters.");
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idempotency))throw new ServiceError(400,"Refresh the form and try again.");
    const prior=await dbGet<{id:string}[]>("purchases",`select=id&idempotency_key=eq.${idempotency}&loss_issue=not.is.null&limit=1`);
    if(prior[0])return Response.json({id:prior[0].id,status:"pending"},{status:200});
    const file=data.get("evidence");
    if(file instanceof File&&file.size){
      if(file.size>5*1024*1024||!types[file.type])throw new ServiceError(400,"Choose a JPG, PNG, or WebP image under 5 MB.");
      const magic=new Uint8Array(await file.slice(0,12).arrayBuffer());
      if(!types[file.type].every((b,i)=>magic[i]===b)||(file.type==="image/webp"&&String.fromCharCode(...magic.slice(8,12))!=="WEBP"))throw new ServiceError(400,"That image file isn't supported.");
      evidencePath=`${crypto.randomUUID()}.${file.type==="image/jpeg"?"jpg":file.type.split("/")[1]}`;
    }
    await verifyTurnstile(token,new URL(request.url).hostname);
    await requirePrivateEvidenceBucket();
    const actorFingerprint=await fingerprint(request);
    const duplicateKey=await fingerprint(request,`${handle}|${date}|${quantity}|${price}|${unresolved}|${issue}`);
    if(evidencePath&&file instanceof File)await uploadEvidence(file,evidencePath);
    const id=await dbRpc<string>("submit_loss_report",{p_handle:handle,p_date:date,p_quantity:Number(quantity),p_unit_price:price,
      p_unresolved_amount:unresolved,p_issue:issue,p_details:details,p_idempotency:idempotency,p_fingerprint:actorFingerprint,
      p_duplicate_key:duplicateKey,p_evidence_path:evidencePath});
    return Response.json({id,status:"pending"},{status:201,headers:{"cache-control":"no-store"}});
  }catch(error){if(evidencePath)await deleteEvidence(evidencePath);return errorResponse(error);}
}
