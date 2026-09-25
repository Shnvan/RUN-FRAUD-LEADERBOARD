import { dbGet, errorResponse } from "@/lib/server";
import type { HomeOverview, PlatformStats, PublicPurchase, SellerStats } from "@/lib/domain";

const sellerFields = "id,username,normalized_username,reported_sales,accounts_sold,recorded_purchases,average_price,latest_price";
const emptyTotals: PlatformStats = {reported_sales:"0.00",accounts_sold:0,recorded_purchases:0,visible_sellers:0};

export async function GET() {
  try {
    const [totals,sales,accounts,records,recent] = await Promise.all([
      dbGet<PlatformStats[]>("platform_statistics","select=*&limit=1"),
      dbGet<SellerStats[]>("seller_statistics",`select=${sellerFields}&order=reported_sales.desc,normalized_username.asc&limit=10`),
      dbGet<SellerStats[]>("seller_statistics",`select=${sellerFields}&order=accounts_sold.desc,normalized_username.asc&limit=10`),
      dbGet<SellerStats[]>("seller_statistics",`select=${sellerFields}&order=recorded_purchases.desc,normalized_username.asc&limit=10`),
      dbGet<PublicPurchase[]>("public_purchase_rows","select=*&order=created_at.desc,id.desc&limit=20")
    ]);
    const overview: HomeOverview = {totals:totals[0]||emptyTotals,leaders:{sales,accounts,records},recent};
    return Response.json(overview,{headers:{"cache-control":"no-store"}});
  } catch(error) { return errorResponse(error); }
}
