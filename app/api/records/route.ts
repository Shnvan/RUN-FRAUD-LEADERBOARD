import { dbGet, errorResponse } from "@/lib/server";
import type { PublicLoss } from "@/lib/domain";
export async function GET() {
  try { const records = await dbGet<PublicLoss[]>("public_loss_rows","select=*&order=created_at.desc,id.desc&limit=20"); return Response.json(records,{headers:{"cache-control":"no-store"}}); }
  catch(error) { return errorResponse(error); }
}
