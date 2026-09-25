import { notFound, redirect } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { SellerPanel, RecentRecords } from "@/components/public-ui";
import { dbGet } from "@/lib/server";
import { normalizeHandle, validHandle, type SellerStats, type PublicPurchase } from "@/lib/domain";
export const dynamic="force-dynamic";
export default async function SellerPage({params}:{params:Promise<{handle:string}>}){
  const handle=normalizeHandle((await params).handle);if(!validHandle(handle))notFound();
  const stats=await dbGet<SellerStats[]>("seller_statistics",`select=*&normalized_username=eq.${encodeURIComponent(handle)}&limit=1`);
  if(!stats[0]) {const old=await dbGet<{merged_into:string|null}[]>("sellers",`select=merged_into&normalized_username=eq.${encodeURIComponent(handle)}&status=eq.merged&limit=1`);if(old[0]?.merged_into){const target=await dbGet<{normalized_username:string}[]>("sellers",`select=normalized_username&id=eq.${old[0].merged_into}&limit=1`);if(target[0])redirect(`/seller/${target[0].normalized_username}`);}notFound();}
  const rows=await dbGet<PublicPurchase[]>("public_purchase_rows",`select=*&seller_id=eq.${stats[0].id}&order=purchase_date.desc,created_at.desc,id.desc&limit=100`);
  return <SiteShell><main className="mx-auto max-w-[1160px] px-5 py-12 md:px-8"><p className="mb-6 text-xs font-semibold uppercase tracking-[.14em] text-primary">Seller record</p><div className="max-w-[720px]"><SellerPanel seller={stats[0]} rows={rows}/></div><RecentRecords rows={rows} title="Purchase history"/></main></SiteShell>;
}
