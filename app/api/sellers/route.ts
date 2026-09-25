import { dbGet, errorResponse } from "@/lib/server";
import { normalizeHandle, type SellerLossStats } from "@/lib/domain";

export async function GET(request: Request) {
  try {
    const search = normalizeHandle(new URL(request.url).searchParams.get("search") || "").replace(/[^a-z0-9._-]/g,"").slice(0,64);
    if (!search) return Response.json([]);
    const rows = await dbGet<SellerLossStats[]>("seller_loss_statistics",`select=id,username,normalized_username,unresolved_amount,report_count&normalized_username=ilike.${encodeURIComponent(`${search}*`)}&order=normalized_username.asc&limit=8`);
    return Response.json(rows,{headers:{"cache-control":"no-store"}});
  } catch (error) { return errorResponse(error); }
}
