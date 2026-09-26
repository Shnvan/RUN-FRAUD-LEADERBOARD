import {dbGet,errorResponse,readSellerImage,ServiceError,validUuid} from "@/lib/server";

export async function GET(request:Request,{params}:{params:Promise<{handle:string}>}){
  try{
    const {handle:sellerId}=await params;if(!validUuid(sellerId))throw new ServiceError(404,"Image not found.");
    const rows=await dbGet<Array<{avatar_path:string|null;avatar_updated_at:string|null}>>("sellers",`select=avatar_path,avatar_updated_at&id=eq.${sellerId}&status=eq.active&limit=1`);
    const seller=rows[0];if(!seller?.avatar_path)throw new ServiceError(404,"Image not found.");
    const etag=`\"${seller.avatar_path.split("/").pop()?.replace(".webp","")}\"`;if(request.headers.get("if-none-match")===etag)return new Response(null,{status:304,headers:{etag,"cache-control":"public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"}});
    const image=await readSellerImage(seller.avatar_path);if(!image.ok)throw new ServiceError(404,"Image not found.");const bytes=await image.arrayBuffer();
    return new Response(bytes,{headers:{"content-type":"image/webp","content-disposition":"inline","cache-control":"public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800","x-content-type-options":"nosniff","cross-origin-resource-policy":"same-origin",etag}});
  }catch(error){return errorResponse(error);}
}
