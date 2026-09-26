import { errorResponse, publicDbRpc } from "@/lib/server";
import type { PublicLoss } from "@/lib/domain";
export async function GET() {
  try { const records = await publicDbRpc<PublicLoss[]>("get_public_records",{}); return Response.json(records,{headers:{"cache-control":"public, s-maxage=60, stale-while-revalidate=300"}}); }
  catch(error) { return errorResponse(error); }
}
