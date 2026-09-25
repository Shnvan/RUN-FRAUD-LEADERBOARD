import { errorResponse, publicDbRpc } from "@/lib/server";
import type { LossOverview } from "@/lib/domain";

export async function GET(){
  try{
    const overview=await publicDbRpc<LossOverview>("get_public_overview",{});
    return Response.json(overview,
      {headers:{"cache-control":"public, s-maxage=60, stale-while-revalidate=300"}});
  }catch(error){return errorResponse(error);}
}
