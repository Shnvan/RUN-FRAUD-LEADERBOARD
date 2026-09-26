import Image from "next/image";
import Link from "next/link";
import {ArrowRight, ArrowUpRight} from "lucide-react";
import {RecordTrigger} from "@/components/record-trigger";
import {SellerSearch} from "@/components/seller-search";
import {RetroWindow,StatusStrip} from "@/components/retro-window";
import {AccountTypeBadges} from "@/components/account-type-badges";
import {PrimaryProduct} from "@/components/product-brand";
import {money,type LossOverview,type SellerLossStats} from "@/lib/domain";

const count=(value:number|null|undefined)=>new Intl.NumberFormat("en-PH").format(value||0);

export function HomeArchive({overview,loading,unavailable}:{overview:LossOverview;loading:boolean;unavailable:boolean}){
  return <div className="archive-desk">
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_230px] lg:items-start">
      <aside className="order-1 space-y-4 lg:order-1">
        <RetroWindow title="NAVIGATION.EXE" eyebrow="v1.0" tone="lime" className="hidden lg:block" bodyClassName="space-y-2">
          <Link href="#gallery" className="archive-button archive-button--paper w-full justify-start">01 / Case files</Link>
          <Link href="/methodology" className="archive-button archive-button--paper w-full justify-start">02 / How it works</Link>
          <Link href="/about" className="archive-button archive-button--paper w-full justify-start">03 / About fraus</Link>
        </RetroWindow>
        <RetroWindow title="FIND A HANDLE" tone="cobalt" bodyClassName="archive-search"><p className="mb-3 text-xs text-muted-foreground">Search the reviewed public record.</p><SellerSearch hero/></RetroWindow>
        <RetroWindow title="ARCHIVE NOTICE" tone="paper" className="hidden lg:block"><p className="text-xs leading-5">Every entry is a reviewed buyer claim. Inclusion does not independently prove a purchase, wrongdoing, revenue, or profit.</p><Link href="/methodology" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-4">Read the method <ArrowRight size={13}/></Link></RetroWindow>
      </aside>

      <div className="order-2 min-w-0 space-y-4 lg:order-2">
        <RetroWindow title="MAIN STAGE / HALL OF UNRESOLVED PROMISES" tone="red" bodyClassName="p-0">
          <div className="relative overflow-hidden border-b-2 border-foreground bg-[#d7ec67] p-4 text-[#251634] sm:p-6">
            <Image className="archive-mascot absolute -right-3 -top-2 w-28 rotate-12 sm:right-2 sm:w-32" src="/mascots/archive-clerk.svg" alt="" width={140} height={171}/>
            <span className="archive-stamp">Reviewed buyer reports</span>
            <h1 className="display-type relative mt-3 max-w-[80%] text-[clamp(1.7rem,4.2vw,4.4rem)]">Hall of Unresolved Promises</h1>
            <p className="relative mt-3 max-w-xl pr-12 text-xs leading-5 sm:text-sm">Top three sellers by buyer-reported amount still unresolved. Rankings change as approved open reports are updated.</p>
          </div>
          <div className="grid gap-3 p-3 sm:p-4 md:grid-cols-3 md:items-end">
            <StageCard rank={1} seller={overview.leaders[0]} loading={loading}/>
            <StageCard rank={2} seller={overview.leaders[1]} loading={loading}/>
            <StageCard rank={3} seller={overview.leaders[2]} loading={loading}/>
          </div>
          <StatusStrip><span role="status">{loading?"Loading reviewed reports…":unavailable?"Live rankings unavailable.":`${count(overview.totals.visible_sellers)} visible sellers / ${count(overview.totals.report_count)} reviewed reports`}</span><span>Ranked by unresolved PHP ↓</span></StatusStrip>
        </RetroWindow>
      </div>

      <aside className="order-3 space-y-4">
        <RetroWindow title="REPORT DESK" tone="lime"><p className="text-sm font-semibold">Have an unresolved purchase?</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Buyers can submit an itemized report without an account. Nothing appears here until moderator review.</p><RecordTrigger label="Open report desk" compactLabel="Report" className="archive-button archive-button--red mt-4 w-full text-[#251634]"/></RetroWindow>
        <RetroWindow title="STATUS / LIVE DATA" tone="plum"><span className="archive-stamp text-foreground">{unavailable?"Offline":"Public index"}</span><p className="mt-4 text-xs leading-5">Products and amounts shown here come only from approved, still-open reports.</p></RetroWindow>
        <div className="hidden justify-center lg:flex"><Image className="archive-mascot w-32 -rotate-6" src="/mascots/ticket-sprite.svg" alt="" width={128} height={114}/></div>
      </aside>
    </div>

    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_230px]">
      <RetroWindow title="BY THE NUMBERS / REVIEWED OPEN REPORTS" tone="cobalt" bodyClassName="p-0"><div className="grid grid-cols-2 sm:grid-cols-5"><Total label="Reported purchase value" value={money(overview.totals.reported_purchase_value)}/><Total label="Accounts reported purchased" value={count(overview.totals.accounts_reported_purchased)}/><Total label="Amount still unresolved" value={money(overview.totals.unresolved_amount)}/><Total label="Approved open reports" value={count(overview.totals.report_count)}/><Total label="Visible sellers" value={count(overview.totals.visible_sellers)}/></div></RetroWindow>
      <RetroWindow title="INDEX SHORTCUT" tone="paper"><a href="#gallery" className="archive-button w-full">Browse case files ↓</a></RetroWindow>
    </div>

    <section id="gallery" className="mt-5 scroll-mt-4"><RetroWindow title="CASE FILES / FULL RANKED INDEX" tone="plum" bodyClassName="p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-foreground bg-[var(--warm-paper)] px-4 py-3 text-[#251634]"><div><p className="gallery-label">Buyer report index</p><h2 className="display-type text-xl sm:text-2xl">Open case files</h2></div><span className="archive-stamp">PHP / ongoing</span></div>
      <div role="status" aria-live="polite">{loading?<div className="p-8 text-sm">Loading case files…</div>:unavailable?<div className="p-8 text-sm">The public index is temporarily unavailable. Please try again later.</div>:overview.leaders.length?overview.leaders.map((seller,index)=><LeaderboardRow key={seller.id} seller={seller} rank={index+1}/>):<div className="flex items-center gap-5 p-6"><Image src="/mascots/ticket-sprite.svg" alt="" width={80} height={72}/><div><p className="display-type text-lg">No reviewed reports yet</p><p className="mt-1 text-xs text-muted-foreground">Case files appear after moderator approval.</p></div></div>}</div>
      <StatusStrip><span>Open reports only / reviewed buyer claims</span><Link href="/methodology" className="underline underline-offset-2">How rankings work →</Link></StatusStrip>
    </RetroWindow></section>
    <p className="mt-4 max-w-3xl text-xs leading-5 text-muted-foreground">Reported purchase value is neither verified revenue nor profit. An unresolved amount is a buyer claim, not a finding of fraud. Product marks identify what buyers reported purchasing and do not imply affiliation.</p>
  </div>;
}

function Total({label,value}:{label:string;value:string}){return <div className="min-w-0 border-b border-r border-foreground/25 p-3"><p className="gallery-label text-muted-foreground">{label}</p><p className="mt-1 break-all font-mono text-lg font-bold tabular">{value}</p></div>}

function StageCard({rank,seller,loading}:{rank:number;seller?:SellerLossStats;loading:boolean}){
  const primary=rank===1;
  const content=<div className={`relative flex h-full min-h-[260px] flex-col border-2 border-[#251634] bg-[var(--card)] text-[var(--foreground)] ${primary?"md:min-h-[345px]":"md:min-h-[310px]"}`}>
    <div className={`flex items-center justify-between border-b-2 border-[#251634] px-3 py-2 font-[family-name:var(--font-pixel)] text-[10px] text-[#251634] ${primary?"bg-[#d7ec67]":rank===2?"bg-[#c7c8e7]":"bg-[#efbd9a]"}`}><span>{primary?"CENTER STAGE":"FEATURED FILE"}</span><span>#{String(rank).padStart(2,"0")}</span></div>
    <div className="flex flex-1 flex-col p-3">{seller?<><div className="flex items-start gap-2"><SellerAvatar seller={seller} size={primary?72:58}/><div className="min-w-0"><PrimaryProduct product={seller.primary_account_type}/><AccountTypeBadges types={seller.account_types||[]} limit={2}/></div></div><p className="mt-3 break-all text-xl font-bold leading-tight tracking-tight">@{seller.username}</p><div className="mt-auto grid grid-cols-2 gap-x-2 gap-y-3 border-t border-foreground/30 pt-3"><MiniMetric label="Unresolved" value={money(seller.unresolved_amount)}/><MiniMetric label="Reported value" value={money(seller.reported_purchase_value)}/><MiniMetric label="Accounts" value={count(seller.accounts_reported_purchased)}/><MiniMetric label="Open reports" value={count(seller.report_count)}/></div></>:<div className="flex flex-1 flex-col items-center justify-center text-center"><Image src="/mascots/ticket-sprite.svg" alt="" width={72} height={64}/><p className="gallery-label mt-3">{loading?"Loading…":"Unassigned"}</p><p className="mt-1 text-xs text-muted-foreground">Awaiting reviewed reports</p></div>}</div>
    {seller&&<div className="flex items-center justify-between border-t-2 border-foreground px-3 py-2 font-[family-name:var(--font-pixel)] text-[10px]">View public record <ArrowUpRight size={14}/></div>}
  </div>;
  return <div className={primary?"order-1 md:order-2":"order-2 md:order-1 last:md:order-3"}>{seller?<Link className="block h-full hover:-translate-y-1 transition-transform" href={`/seller/${seller.normalized_username}`} aria-label={`View @${seller.username}, rank ${rank}, ${money(seller.unresolved_amount)} reported unresolved`}>{content}</Link>:content}</div>;
}

function MiniMetric({label,value}:{label:string;value:string}){return <span className="min-w-0"><span className="gallery-label block text-muted-foreground">{label}</span><strong className="block break-all font-mono text-sm tabular">{value}</strong></span>}

function SellerAvatar({seller,size}:{seller:SellerLossStats;size:number}){return seller.has_avatar?<Image unoptimized src={`/api/sellers/${seller.id}/avatar?v=${encodeURIComponent(seller.avatar_updated_at||"")}`} alt={`Moderator-selected reference image for @${seller.username}`} width={size} height={size} className="shrink-0 border-2 border-foreground object-cover" style={{width:size,height:size}}/>:<span aria-hidden="true" className="grid shrink-0 place-items-center border-2 border-foreground bg-[var(--lime)] font-[family-name:var(--font-display)] text-3xl text-[#251634]" style={{width:size,height:size}}>{seller.username.slice(0,1).toUpperCase()}</span>}

function LeaderboardRow({seller,rank}:{seller:SellerLossStats;rank:number}){return <Link href={`/seller/${seller.normalized_username}`} aria-label={`View rank ${rank}, @${seller.username}`} className="group grid gap-3 border-b-2 border-foreground/25 p-3 transition-colors hover:bg-[var(--secondary)] sm:grid-cols-[38px_52px_minmax(130px,1fr)] sm:items-center lg:grid-cols-[38px_52px_minmax(160px,1fr)_repeat(4,minmax(100px,130px))_20px]">
  <span className="archive-stamp w-fit">{String(rank).padStart(2,"0")}</span><div className="hidden sm:block"><SellerAvatar seller={seller} size={48}/></div><div className="min-w-0"><strong className="block truncate text-lg">@{seller.username}</strong><PrimaryProduct product={seller.primary_account_type}/><AccountTypeBadges types={seller.account_types||[]} limit={3}/></div><div className="grid grid-cols-2 gap-2 sm:col-span-3 lg:col-span-4 lg:grid-cols-4"><MiniMetric label="Reported value" value={money(seller.reported_purchase_value)}/><MiniMetric label="Accounts" value={count(seller.accounts_reported_purchased)}/><MiniMetric label="Unresolved" value={money(seller.unresolved_amount)}/><MiniMetric label="Open reports" value={count(seller.report_count)}/></div><ArrowUpRight className="hidden size-4 lg:block"/></Link>}
