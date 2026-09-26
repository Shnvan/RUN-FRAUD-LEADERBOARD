import {notFound,redirect} from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {SiteShell} from "@/components/site-shell";
import {RetroWindow,StatusStrip} from "@/components/retro-window";
import {AccountTypeBadges} from "@/components/account-type-badges";
import {PrimaryProduct,ProductIcon} from "@/components/product-brand";
import {publicDbRpc} from "@/lib/server";
import {money,normalizeHandle,validHandle,type SellerLossStats,type PublicLoss} from "@/lib/domain";
import {BlinkSticker,ReactionImage} from "@/components/old-web-art";

export const dynamic="force-dynamic";
const count=(value:number|null|undefined)=>new Intl.NumberFormat("en-PH").format(value||0);
const issueLabel:Record<PublicLoss["loss_issue"],string>={not_delivered:"Not delivered",refund_not_received:"Refund not received",other_unresolved:"Other unresolved issue"};

export default async function SellerPage({params}:{params:Promise<{handle:string}>}){
  const handle=normalizeHandle((await params).handle);if(!validHandle(handle))notFound();
  let result:{seller?:SellerLossStats;reports?:PublicLoss[];redirect?:string}|null;
  try{result=await publicDbRpc("get_public_seller",{p_handle:handle})}catch{return <SellerUnavailable/>}
  if(result?.redirect)redirect(`/seller/${result.redirect}`);if(!result?.seller)notFound();
  const stats=result.seller,rows=result.reports||[];
  return <SiteShell><main className="archive-desk">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><Link href="/#gallery" className="archive-button archive-button--paper">← Back to case files</Link><span className="archive-stamp">Reviewed buyer claims</span></div>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <RetroWindow title={`CASE FILE / @${stats.username}`} tone="cobalt" bodyClassName="p-0" chrome="browser" overflow="visible">
        <div className="relative border-b-2 border-[var(--classic-ink)] bg-[var(--warm-paper)] p-5 text-[var(--classic-ink)] sm:p-7"><BlinkSticker kind="new"/><span className="archive-stamp ml-2">Seller profile</span><div className="mt-5 flex flex-wrap items-center gap-5">{stats.has_avatar?<Image unoptimized src={`/api/sellers/${stats.id}/avatar?v=${encodeURIComponent(stats.avatar_updated_at||"")}`} alt={`Moderator-selected reference image for @${stats.username}`} width={128} height={128} className="size-28 border-2 border-[var(--classic-ink)] object-cover sm:size-32"/>:<span className="grid size-28 place-items-center border-2 border-[var(--classic-ink)] bg-[var(--lime)] font-[family-name:var(--font-display)] text-5xl sm:size-32" aria-hidden="true">{stats.username.slice(0,1).toUpperCase()}</span>}<div className="min-w-0"><PrimaryProduct product={stats.primary_account_type}/><AccountTypeBadges types={stats.account_types||[]}/><h1 className="archive-heading mt-3 break-all">@{stats.username}</h1></div></div></div>
        <div className="grid grid-cols-2 sm:grid-cols-4"><ProfileMetric label="Reported purchase value" value={money(stats.reported_purchase_value)}/><ProfileMetric label="Accounts reported purchased" value={count(stats.accounts_reported_purchased)}/><ProfileMetric label="Amount still unresolved" value={money(stats.unresolved_amount)}/><ProfileMetric label="Approved open reports" value={count(stats.report_count)}/></div>
        <StatusStrip><span>Approved open reports only</span><span>PHP / reviewed claims</span></StatusStrip>
      </RetroWindow>
      <aside className="space-y-4"><RetroWindow title="PRODUCT LEDGER" tone="lime"><p className="text-xs leading-5">Products buyers reported purchasing in approved, currently open reports.</p><div className="mt-4 space-y-2">{stats.account_type_breakdown?.length?stats.account_type_breakdown.map(type=><div key={`${type.slug}-${type.label}`} className="flex items-center gap-2 border border-foreground/30 p-2 text-xs"><ProductIcon slug={type.slug} label={type.label}/><span className="min-w-0 flex-1">{type.label}</span><strong className="font-mono">{count(type.accounts)}</strong></div>):<p className="text-xs text-muted-foreground">No product breakdown available.</p>}</div></RetroWindow><RetroWindow title="READ THIS FILE" tone="paper"><p className="text-xs leading-5">Reports are reviewed for inclusion, not independently verified. Seller images are moderator-selected references and do not prove identity or wrongdoing.</p><Link href="/methodology" className="mt-3 inline-block text-xs font-semibold underline underline-offset-4">How rankings work →</Link></RetroWindow></aside>
    </div>
    <section className="mt-4"><RetroWindow title={`OPEN REPORTS / ${rows.length} SHOWN`} tone="navy" bodyClassName="p-0"><div className="border-b-2 border-[var(--classic-ink)] bg-[var(--lime)] p-4 text-[var(--classic-ink)]"><h2 className="display-type text-xl">Public report ledger</h2><p className="mt-1 text-xs">Approved, still-open buyer claims.</p></div><div className="grid gap-3 p-3 md:grid-cols-2">{rows.map((row,index)=><article key={row.id} className="border-2 border-foreground bg-card p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="archive-stamp">Report {String(index+1).padStart(2,"0")}</span><strong className="font-mono text-lg tabular">{money(row.unresolved_amount)}</strong></div><h3 className="mt-3 text-lg font-bold">{issueLabel[row.loss_issue]}</h3>{row.items?.length?<div className="mt-3 space-y-2">{row.items.map(item=><div key={item.id} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 border-t border-foreground/20 pt-2 text-xs"><ProductIcon slug={item.account_type_slug} label={item.label} size={22}/><span>{item.label} · {item.quantity} × {money(item.unit_price)}</span><span className="font-mono tabular">{money(item.total_amount)}</span></div>)}</div>:<div className="mt-2"><AccountTypeBadges types={row.account_types||[]}/><p className="mt-2 text-xs text-muted-foreground">{row.quantity} × {money(row.unit_price)} paid</p></div>}<Link href={`/correct/${row.id}`} className="archive-button archive-button--paper mt-4">Request correction →</Link></article>)}</div><StatusStrip><span>Product marks do not imply affiliation or endorsement</span></StatusStrip></RetroWindow></section>
  </main></SiteShell>;
}

function ProfileMetric({label,value}:{label:string;value:string}){return <div className="min-w-0 border-b border-r border-foreground/25 p-3"><p className="gallery-label text-muted-foreground">{label}</p><p className="mt-2 break-all font-mono text-lg font-bold tabular">{value}</p></div>}
function SellerUnavailable(){return <SiteShell><main className="archive-desk grid min-h-[60dvh] place-items-center"><RetroWindow title="CASE FILES / UNAVAILABLE" tone="red" className="w-full max-w-lg"><div className="error-state-layout"><div><h1 className="archive-heading">Records unavailable.</h1><p className="mt-3 text-sm">The data service is not connected right now.</p><Link href="/" className="archive-button archive-button--paper mt-5">Back to index</Link></div><div className="error-state-art" aria-hidden="true"><ReactionImage name="angry-yellow"/></div></div></RetroWindow></main></SiteShell>}
