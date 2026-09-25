import { dbGet, errorResponse } from "@/lib/server";
import { normalizeHandle, validHandle, type PublicLoss, type SellerLossStats } from "@/lib/domain";

export async function GET(_request: Request, {params}: {params: Promise<{handle:string}>}) {
  try {
    const handle = normalizeHandle((await params).handle);
    if (!validHandle(handle)) return Response.json({error:"Seller not found."},{status:404});
    const stats = await dbGet<SellerLossStats[]>("seller_loss_statistics",`select=*&normalized_username=eq.${encodeURIComponent(handle)}&limit=1`);
    if (!stats[0]) return Response.json({error:"Seller not found."},{status:404});
    const reports = await dbGet<PublicLoss[]>("public_loss_rows",`select=*&seller_id=eq.${stats[0].id}&order=purchase_date.desc,created_at.desc,id.desc&limit=100`);
    return Response.json({seller:stats[0],reports},{headers:{"cache-control":"no-store"}});
  } catch(error) {return errorResponse(error);}
}
