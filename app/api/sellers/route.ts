import { errorResponse, publicDbRpc } from "@/lib/server";
import { normalizeHandle, type SellerLossStats } from "@/lib/domain";

export async function GET(request: Request) {
  try {
    const search = normalizeHandle(new URL(request.url).searchParams.get("search") || "").replace(/[^a-z0-9._-]/g,"").slice(0,64);
    if (!search) return Response.json([]);
    const rows = await publicDbRpc<SellerLossStats[]>("search_public_sellers",{p_search:search});
    return Response.json(rows,{headers:{"cache-control":"public, s-maxage=60, stale-while-revalidate=300"}});
  } catch (error) { return errorResponse(error); }
}
