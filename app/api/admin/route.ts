import { dbGet, dbRpc, errorResponse, requireAdmin, sameOrigin, ServiceError } from "@/lib/server";
const uuid = (value:unknown) => typeof value==="string" && /^[0-9a-f-]{36}$/i.test(value);
export async function GET(){
  try {await requireAdmin();const [pending,losses,corrections,sellers,audit,blocked]=await Promise.all([
    dbGet<unknown[]>("purchases","select=id,seller_id,purchase_date,quantity,unit_price,total_amount,loss_issue,loss_details,reported_unresolved_amount,unresolved_amount,loss_status,flags,evidence_path,submitter_fingerprint,created_at,sellers(username)&moderation_status=eq.pending&order=created_at.asc&limit=100"),
    dbGet<unknown[]>("purchases","select=id,purchase_date,loss_issue,loss_details,reported_unresolved_amount,unresolved_amount,loss_status,created_at,sellers(username)&moderation_status=eq.approved&loss_issue=not.is.null&order=created_at.desc&limit=100"),
    dbGet<unknown[]>("correction_requests","select=*&status=eq.open&order=created_at.asc&limit=100"),
    dbGet<unknown[]>("sellers","select=id,username,normalized_username,status,created_at&order=created_at.desc&limit=100"),
    dbGet<unknown[]>("moderation_audit","select=*&order=created_at.desc&limit=50"),
    dbGet<unknown[]>("blocked_fingerprints","select=fingerprint,blocked_at,blocked_by&order=blocked_at.desc&limit=50")]);return Response.json({pending,losses,corrections,sellers,audit,blocked},{headers:{"cache-control":"no-store"}});
  } catch(error){return errorResponse(error);}
}
export async function POST(request:Request){
  try {const admin=await requireAdmin();if(!sameOrigin(request))throw new ServiceError(403,"Request not allowed.");const data=await request.json() as Record<string,unknown>;const action=data.action;
    if(action==="approve"||action==="reject"){if(!uuid(data.id))throw new ServiceError(400,"Choose a purchase.");await dbRpc("review_purchase",{p_id:data.id,p_decision:action==="approve"?"approved":"rejected",p_actor:admin.email});}
    else if(action==="retract"){if(!uuid(data.id))throw new ServiceError(400,"Choose a purchase.");await dbRpc("retract_purchase",{p_id:data.id,p_actor:admin.email});}
    else if(action==="adjust_loss"||action==="resolve_loss"){
      if(!uuid(data.id))throw new ServiceError(400,"Choose a report.");
      const amount=action==="resolve_loss"?"0":String(data.amount||"");
      if(!/^(0|[1-9]\d{0,13})(?:\.\d{1,2})?$/.test(amount))throw new ServiceError(400,"Enter a valid PHP amount.");
      await dbRpc("adjust_unresolved_loss",{p_id:data.id,p_amount:amount,p_actor:admin.email});
    }
    else if(action==="merge"){if(!uuid(data.source)||!uuid(data.target))throw new ServiceError(400,"Choose two sellers.");await dbRpc("merge_sellers",{p_source:data.source,p_target:data.target,p_actor:admin.email});}
    else if(action==="suspend"||action==="restore"){if(!uuid(data.id))throw new ServiceError(400,"Choose a seller.");await dbRpc("set_seller_status",{p_id:data.id,p_status:action==="suspend"?"suspended":"active",p_actor:admin.email});}
    else if(action==="resolve"||action==="dismiss"){if(!uuid(data.id))throw new ServiceError(400,"Choose a correction request.");await dbRpc("resolve_correction",{p_id:data.id,p_decision:action==="resolve"?"resolved":"dismissed",p_actor:admin.email});}
    else if(action==="block"){if(typeof data.fingerprint!=="string"||!/^[0-9a-f]{64}$/.test(data.fingerprint))throw new ServiceError(400,"Choose a submission.");await dbRpc("block_submitter",{p_fingerprint:data.fingerprint,p_actor:admin.email});}
    else if(action==="unblock"){if(typeof data.fingerprint!=="string"||!/^[0-9a-f]{64}$/.test(data.fingerprint))throw new ServiceError(400,"Choose a blocked submitter.");await dbRpc("unblock_submitter",{p_fingerprint:data.fingerprint,p_actor:admin.email});}
    else throw new ServiceError(400,"Unknown action.");
    return Response.json({ok:true},{headers:{"cache-control":"no-store"}});
  } catch(error){return errorResponse(error);}
}
