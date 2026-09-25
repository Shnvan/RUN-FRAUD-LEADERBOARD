import { dbGet, errorResponse } from "@/lib/server";
import type { LossOverview, PublicLoss, SellerLossStats } from "@/lib/domain";

export async function GET(){
  try{
    const [totals,leaders,recent]=await Promise.all([
      dbGet<LossOverview["totals"][]>("platform_loss_statistics","select=*&limit=1"),
      dbGet<SellerLossStats[]>("seller_loss_statistics","select=*&order=unresolved_amount.desc,normalized_username.asc&limit=100"),
      dbGet<PublicLoss[]>("public_loss_rows","select=*&order=created_at.desc,id.desc&limit=20")
    ]);
    return Response.json({totals:totals[0]||{unresolved_amount:"0.00",report_count:0,visible_sellers:0},leaders,recent} satisfies LossOverview,
      {headers:{"cache-control":"no-store"}});
  }catch(error){return errorResponse(error);}
}
