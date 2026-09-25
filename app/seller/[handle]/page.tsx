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
  return <SiteShell><main className="mx-auto max-w-[1240px] px-5 py-14 md:px-8 md:py-20"><div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><SellerPanel seller={stats[0]} rows={rows}/><aside className="rounded-[28px] bg-accent p-7 text-accent-foreground md:p-9"><p className="font-mono text-[10px] uppercase tracking-[.16em] opacity-55">Reading this record</p><h2 className="mt-24 text-3xl font-semibold leading-tight tracking-[-.055em]">Reported activity, with its limits visible.</h2><p className="mt-4 text-sm leading-6 opacity-70">These figures include approved buyer submissions on this site. They do not prove wrongdoing or represent the seller&apos;s complete revenue or profit.</p><a href="/methodology" className="mt-8 inline-block text-xs font-semibold underline underline-offset-4">Read the methodology</a></aside></div><RecentRecords rows={rows} title="Purchase history"/></main></SiteShell>;
}
