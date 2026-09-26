import { dbGet, dbRpc, deleteEvidence, deleteSellerImage, errorResponse, listEvidenceObjects, listSellerImageObjects, ServiceError } from "@/lib/server";

type Candidate={purchase_id:string;evidence_path:string|null};
async function run(request:Request){
  try{
    const secret=process.env.CRON_SECRET;
    if(!secret||request.headers.get("authorization")!==`Bearer ${secret}`)throw new ServiceError(401,"Unauthorized.");
    const candidates=await dbRpc<Candidate[]>("private_retention_candidates",{});let purged=0,failed=0;
    for(const candidate of candidates){if(candidate.evidence_path&&!await deleteEvidence(candidate.evidence_path)){failed++;continue;}await dbRpc("purge_private_data",{p_purchase_id:candidate.purchase_id});purged++;}
    const referenced=new Set((await dbGet<Array<{evidence_path:string}>>("purchases","select=evidence_path&evidence_path=not.is.null&limit=10000")).map(row=>row.evidence_path));
    const cutoff=Date.now()-24*60*60*1000;let orphanPurged=0;
    for(const object of await listEvidenceObjects()){if(!/^[0-9a-f-]{36}\.webp$/i.test(object.name)||referenced.has(object.name)||!object.created_at||Date.parse(object.created_at)>cutoff)continue;if(await deleteEvidence(object.name))orphanPurged++;else failed++;}
    const referencedSellerImages=new Set((await dbGet<Array<{avatar_path:string}>>("sellers","select=avatar_path&avatar_path=not.is.null&limit=10000")).map(row=>row.avatar_path));let sellerImageOrphansPurged=0;
    for(const object of await listSellerImageObjects()){if(!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i.test(object.name)||referencedSellerImages.has(object.name)||!object.created_at||Date.parse(object.created_at)>cutoff)continue;if(await deleteSellerImage(object.name))sellerImageOrphansPurged++;else failed++;}
    await dbRpc("cleanup_security_events",{});
    return Response.json({ok:true,purged,orphanPurged,sellerImageOrphansPurged,failed},{headers:{"cache-control":"private, no-store","x-robots-tag":"noindex, nofollow"}});
  }catch(error){return errorResponse(error);}
}
export const GET=run;export const POST=run;
