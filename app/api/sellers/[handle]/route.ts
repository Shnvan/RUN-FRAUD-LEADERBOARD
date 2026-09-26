import { errorResponse, publicDbRpc } from "@/lib/server";
import { normalizeHandle, validHandle, type PublicLoss, type SellerLossStats } from "@/lib/domain";

export async function GET(_request: Request, {params}: {params: Promise<{handle:string}>}) {
  try {
    const handle = normalizeHandle((await params).handle);
    if (!validHandle(handle)) return Response.json({error:"Seller not found."},{status:404});
    const result=await publicDbRpc<{seller?:SellerLossStats;reports?:PublicLoss[];redirect?:string}|null>("get_public_seller",{p_handle:handle});
    if(!result)return Response.json({error:"Seller not found."},{status:404});
    if(result.redirect)return Response.json({redirect:result.redirect},{status:308,headers:{location:`/seller/${result.redirect}`}});
    return Response.json(result,{headers:{"cache-control":"public, s-maxage=60, stale-while-revalidate=300"}});
  } catch(error) {return errorResponse(error);}
}
