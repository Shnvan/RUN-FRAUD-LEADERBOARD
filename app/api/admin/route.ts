import { requireCsrf, requireRecentMfa } from "@/lib/admin-security";
import { boundedJson, dbGet, dbRpc, errorResponse, recordSecurityEvent, requireAdmin, ServiceError, validUuid } from "@/lib/server";
import {parseAccountTypes} from "@/lib/account-types.mjs";
import {parseReportItems} from "@/lib/report-items.mjs";

const sensitive=new Set(["approve","reject","retract","adjust_loss","resolve_loss","merge","suspend","restore","resolve","dismiss","block","unblock","set_account_types","set_items"]);
const confirmations:Record<string,string>={approve:"APPROVE",reject:"REJECT",retract:"RETRACT",adjust_loss:"ADJUST",resolve_loss:"RESOLVE",merge:"MERGE",suspend:"SUSPEND",restore:"RESTORE",resolve:"RESOLVE",dismiss:"DISMISS",block:"BLOCK",unblock:"UNBLOCK",set_account_types:"UPDATE TYPES",set_items:"UPDATE ITEMS"};

export async function GET(){
  try{
    await requireAdmin();
    const [pending,losses,corrections,sellers,audit,blocked,security,accountTypes]=await Promise.all([
      dbGet<unknown[]>("purchases","select=id,seller_id,buyer_username,quantity,unit_price,total_amount,loss_issue,loss_details,reported_unresolved_amount,unresolved_amount,loss_status,flags,evidence_path,evidence_sanitized,linked_duplicate_id,submitter_fingerprint,created_at,sellers(username),purchase_account_types(account_type_slug,custom_label,account_types(label)),purchase_items(id,account_type_slug,custom_label,quantity,unit_price,total_amount,sort_order)&moderation_status=eq.pending&purchase_items.order=sort_order.asc&order=created_at.asc&limit=100"),
      dbGet<unknown[]>("purchases","select=id,buyer_username,quantity,unit_price,total_amount,loss_issue,loss_details,reported_unresolved_amount,unresolved_amount,loss_status,moderation_reason,created_at,sellers(username),purchase_account_types(account_type_slug,custom_label,account_types(label)),purchase_items(id,account_type_slug,custom_label,quantity,unit_price,total_amount,sort_order)&moderation_status=eq.approved&loss_issue=not.is.null&purchase_items.order=sort_order.asc&order=created_at.desc&limit=100"),
      dbGet<unknown[]>("correction_requests","select=*&status=eq.open&order=created_at.asc&limit=100"),
      dbGet<unknown[]>("sellers","select=id,username,normalized_username,status,avatar_path,avatar_updated_at,created_at&order=created_at.desc&limit=100"),
      dbGet<unknown[]>("moderation_audit","select=*&order=created_at.desc&limit=100"),
      dbGet<unknown[]>("blocked_fingerprints","select=fingerprint,blocked_at,blocked_by&order=blocked_at.desc&limit=50"),
      dbGet<unknown[]>("security_events","select=id,event_type,outcome,request_id,detail,created_at&order=created_at.desc&limit=50"),
      dbGet<unknown[]>("account_types","select=slug,label&active=eq.true&order=sort_order.asc")
    ]);
    return Response.json({pending,losses,corrections,sellers,audit,blocked,security,accountTypes},{headers:{"cache-control":"private, no-store","x-robots-tag":"noindex, nofollow"}});
  }catch(error){return errorResponse(error);}
}

export async function POST(request:Request){
  try{
    await requireCsrf(request);const admin=await requireAdmin();
    const data=await boundedJson<Record<string,unknown>>(request);const action=typeof data.action==="string"?data.action:"";
    const requestId=request.headers.get("x-vercel-id")||crypto.randomUUID();
    if(sensitive.has(action)){
      await requireRecentMfa(admin.userId);
      if(data.confirm!==confirmations[action])throw new ServiceError(400,`Type ${confirmations[action]} to confirm this action.`);
    }
    let targetId:string|null=null;const reason=typeof data.reason==="string"?data.reason.trim().slice(0,500):"";let detail:Record<string,unknown>={};
    if(action==="approve"||action==="reject"){
      if(!validUuid(data.id))throw new ServiceError(400,"Choose a purchase.");targetId=data.id;
      await dbRpc("review_purchase_secure",{p_id:data.id,p_decision:action==="approve"?"approved":"rejected",p_actor:admin.email,p_reason:reason,p_actor_id:admin.userId,p_session_id:admin.sessionId,p_request_id:requestId});
    }else if(action==="retract"){
      if(!validUuid(data.id))throw new ServiceError(400,"Choose a purchase.");targetId=data.id;await dbRpc("retract_purchase",{p_id:data.id,p_actor:admin.email});
    }else if(action==="adjust_loss"||action==="resolve_loss"){
      if(!validUuid(data.id))throw new ServiceError(400,"Choose a report.");targetId=data.id;const amount=action==="resolve_loss"?"0":String(data.amount||"");if(!/^(0|[1-9]\d{0,13})(?:\.\d{1,2})?$/.test(amount))throw new ServiceError(400,"Enter a valid PHP amount.");detail={amount};await dbRpc("adjust_unresolved_loss",{p_id:data.id,p_amount:amount,p_actor:admin.email});
    }else if(action==="merge"){
      if(!validUuid(data.source)||!validUuid(data.target))throw new ServiceError(400,"Choose two sellers.");targetId=data.source;detail={target:data.target};await dbRpc("merge_sellers",{p_source:data.source,p_target:data.target,p_actor:admin.email});
    }else if(action==="suspend"||action==="restore"){
      if(!validUuid(data.id))throw new ServiceError(400,"Choose a seller.");targetId=data.id;await dbRpc("set_seller_status",{p_id:data.id,p_status:action==="suspend"?"suspended":"active",p_actor:admin.email});
    }else if(action==="resolve"||action==="dismiss"){
      if(!validUuid(data.id))throw new ServiceError(400,"Choose a correction request.");targetId=data.id;await dbRpc("resolve_correction",{p_id:data.id,p_decision:action==="resolve"?"resolved":"dismissed",p_actor:admin.email});
    }else if(action==="block"||action==="unblock"){
      const value=typeof data.fingerprint==="string"?data.fingerprint:"";if(!/^[0-9a-f]{64}$/.test(value))throw new ServiceError(400,"Choose a submitter.");detail={fingerprint_prefix:value.slice(0,12)};await dbRpc(action==="block"?"block_submitter":"unblock_submitter",{p_fingerprint:value,p_actor:admin.email});
    }else if(action==="set_account_types"){
      if(!validUuid(data.id))throw new ServiceError(400,"Choose a report.");targetId=data.id;let parsed;try{parsed=parseAccountTypes(data.accountTypes,data.otherAccountType);}catch{throw new ServiceError(400,"Choose between one and eight valid account types.");}
      if(reason.length<5)throw new ServiceError(400,"Enter a reason for changing account types.");detail={account_types:parsed.slugs,has_custom:Boolean(parsed.other)};await dbRpc("set_purchase_account_types",{p_purchase_id:data.id,p_account_types:parsed.slugs,p_other_account_type:parsed.other});
    }else if(action==="set_items"){
      if(!validUuid(data.id))throw new ServiceError(400,"Choose a report.");targetId=data.id;let items;try{items=parseReportItems(data.items);}catch{throw new ServiceError(400,"Enter between one and eight valid product rows.");}
      if(reason.length<5)throw new ServiceError(400,"Enter a reason for changing product rows.");detail=await dbRpc<Record<string,unknown>>("set_purchase_items_secure",{p_purchase_id:data.id,p_items:items});
    }else throw new ServiceError(400,"Unknown action.");
    if(action!=="approve"&&action!=="reject")await dbRpc("record_admin_action",{p_actor:admin.email,p_actor_id:admin.userId,p_session_id:admin.sessionId,p_action:action,p_target_id:targetId,p_reason:reason,p_request_id:requestId,p_detail:detail});
    await recordSecurityEvent("moderator_change","accepted",null,requestId,{action,targetId});
    return Response.json({ok:true},{headers:{"cache-control":"private, no-store"}});
  }catch(error){if(error instanceof ServiceError&&error.code==="access_denied")await recordSecurityEvent("admin_access","denied",null,request.headers.get("x-vercel-id"));return errorResponse(error);}
}
