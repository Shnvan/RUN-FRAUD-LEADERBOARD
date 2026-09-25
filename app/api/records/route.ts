import { dbGet, errorResponse } from "@/lib/server";
import type { PublicPurchase } from "@/lib/domain";
export async function GET() {
  try { const records = await dbGet<PublicPurchase[]>("public_purchase_rows","select=*&order=created_at.desc&limit=20"); return Response.json(records,{headers:{"cache-control":"no-store"}}); }
  catch(error) { return errorResponse(error); }
}
