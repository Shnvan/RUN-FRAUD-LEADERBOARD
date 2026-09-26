import {errorResponse,publicDbRpc} from "@/lib/server";
import type {AccountType} from "@/lib/domain";

export async function GET(){
  try{
    const rows=await publicDbRpc<AccountType[]>("get_account_types",{});
    return Response.json(rows,{headers:{"cache-control":"public, s-maxage=3600, stale-while-revalidate=86400"}});
  }catch(error){return errorResponse(error);}
}
