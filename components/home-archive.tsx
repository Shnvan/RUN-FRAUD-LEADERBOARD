import Image from "next/image";
import Link from "next/link";
import {ArrowRight, ArrowUpRight} from "lucide-react";
import {RecordTrigger} from "@/components/record-trigger";
import {SellerSearch} from "@/components/seller-search";
import {RetroWindow,StatusStrip} from "@/components/retro-window";
import {AccountTypeBadges} from "@/components/account-type-badges";
import {PrimaryProduct} from "@/components/product-brand";
import {money,type LossOverview,type SellerLossStats} from "@/lib/domain";
import {BlinkSticker,CharacterArt,MarqueeStrip,VisitorCounter,WebBadge} from "@/components/old-web-art";

const count=(value:number|null|undefined)=>new Intl.NumberFormat("en-PH").format(value||0);

export function HomeArchive({overview,loading,unavailable}:{overview:LossOverview;loading:boolean;unavailable:boolean}){
  return <div className="archive-desk">
    <MarqueeStrip>★ FRAUS BUYER REPORT ARCHIVE ★ SHOW THE RECEIPTS ★ REVIEWED CLAIMS ONLY ★ NO INDEPENDENT FINDING OF WRONGDOING ★</MarqueeStrip>
    <div className="old-web-layout mt-3">
      <aside className="old-web-left space-y-3">
        <RetroWindow title="NAVIGATION.EXE" eyebrow="v1.0" tone="cobalt" className="nav-window" bodyClassName="space-y-2" overflow="visible">
          <CharacterArt character="jester" pose="hanging" className="jester-hanger hidden lg:block"/>
          <Link href="#gallery" className="archive-button archive-button--paper w-full justify-start">01 / Case files</Link>
          <Link href="/methodology" className="archive-button archive-button--paper w-full justify-start">02 / How it works</Link>
          <Link href="/about" className="archive-button archive-button--paper w-full justify-start">03 / About fraus</Link>
        </RetroWindow>
        <RetroWindow title="FIND_A_HANDLE.DAT" tone="lime" bodyClassName="archive-search"><p className="mb-3 text-xs">Search the reviewed public record.</p><SellerSearch hero/></RetroWindow>
        <RetroWindow title="WEB RING / FRAUS" tone="paper" className="web-ring-box"><p className="gallery-label">← previous · random · next →</p><div className="mt-3 flex flex-wrap gap-1"><WebBadge name="fraus-archive"/><WebBadge name="best-viewed"/></div></RetroWindow>
        <RetroWindow title="ARCHIVE NOTICE" tone="red"><p className="text-xs leading-5">Every entry is a reviewed buyer claim. Inclusion does not independently prove a purchase, wrongdoing, revenue, or profit.</p><Link href="/methodology" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-4">Read the method <ArrowRight size={13}/></Link></RetroWindow>
      </aside>

      <div className="old-web-main min-w-0 space-y-4">
        <RetroWindow title="NETSCAPE FRAUS NAVIGATOR / MAIN STAGE" tone="red" bodyClassName="p-0" chrome="browser" overflow="visible" className="hall-window">
          <div className="circus-poster relative border-b-2 border-foreground p-4 text-[#251634] sm:p-6">
            <CharacterArt character="clown" pose="dancing" priority className="main-dancing-clown"/>
            <span className="archive-stamp">Reviewed buyer reports</span>
            <BlinkSticker kind="new"/>
            <p className="poster-kicker">THE INTERNET&apos;S CAREFULLY MODERATED</p>
            <h1 className="display-type relative mt-2 max-w-[68%] text-[clamp(1.8rem,5vw,4.75rem)]">Hall of Unresolved Promises</h1>
            <div className="poster-note">STEP RIGHT UP<br/>READ THE METHOD<br/>CHECK THE RECEIPTS</div>
            <p className="relative mt-3 max-w-xl pr-14 text-xs font-semibold leading-5 sm:text-sm">Top three sellers by buyer-reported amount still unresolved. Rankings change as approved open reports are updated.</p>
          </div>
          <div className="stage-grid relative grid gap-2 p-3 sm:p-4 md:grid-cols-3 md:items-end">
            <StageCard rank={1} seller={overview.leaders[0]} loading={loading}/>
            <StageCard rank={2} seller={overview.leaders[1]} loading={loading}/>
            <StageCard rank={3} seller={overview.leaders[2]} loading={loading}/>
          </div>
          <StatusStrip><span role="status">{loading?"Loading reviewed reports…":unavailable?"Live rankings unavailable.":`${count(overview.totals.visible_sellers)} visible sellers / ${count(overview.totals.report_count)} reviewed reports`}</span><span>Ranked by unresolved PHP ↓</span></StatusStrip>
        </RetroWindow>
      </div>

      <aside className="old-web-right space-y-3">
        <RetroWindow title="REPORT DESK" tone="lime" overflow="visible" className="report-desk-window"><CharacterArt character="snake" pose="salesman" className="report-snake hidden lg:block"/><p className="text-sm font-semibold">Have an unresolved purchase?</p><p className="mt-2 text-xs leading-5">Buyers can submit an itemized report without an account. Nothing appears here until moderator review.</p><RecordTrigger label="Open report desk" compactLabel="Report" className="archive-button archive-button--red mt-4 w-full text-[#251634]"/></RetroWindow>
        <RetroWindow title="LIVE STATUS" tone="plum"><div className="flex items-start justify-between gap-2"><span className="archive-stamp text-foreground">{unavailable?"Offline":"Public index"}</span><BlinkSticker kind={unavailable?"warning":"new"}/></div><p className="mt-4 text-xs leading-5">Products and amounts shown here come only from approved, still-open reports.</p></RetroWindow>
        <RetroWindow title="VISIBLE FILE COUNTER" tone="paper"><VisitorCounter value={overview.totals.visible_sellers}/><p className="mt-2 text-[10px]">REAL VISIBLE SELLER COUNT</p></RetroWindow>
        <RetroWindow title="SITE UPDATE" tone="cobalt"><p className="gallery-label">Last updated automatically</p><p className="mt-2 text-xs">Rankings refresh from reviewed reports. This decoration is not a fake visitor counter.</p><div className="mt-3 flex gap-1"><WebBadge name="guestbook"/><WebBadge name="email-receipts"/></div></RetroWindow>
      </aside>
    </div>

    <div className="stats-scene mt-5">
      <RetroWindow title="BY THE NUMBERS / REVIEWED OPEN REPORTS" tone="cobalt" bodyClassName="p-0" overflow="visible"><div className="grid grid-cols-2 sm:grid-cols-5"><Total label="Reported purchase value" value={money(overview.totals.reported_purchase_value)}/><Total label="Accounts reported purchased" value={count(overview.totals.accounts_reported_purchased)}/><Total label="Amount still unresolved" value={money(overview.totals.unresolved_amount)}/><Total label="Approved open reports" value={count(overview.totals.report_count)}/><Total label="Visible sellers" value={count(overview.totals.visible_sellers)}/></div><CharacterArt character="rat" pose="running" className="running-rat hidden sm:block"/></RetroWindow>
      <div className="tiny-ad"><strong>CASE FILES!</strong><span>Now with real reviewed data</span><a href="#gallery">ENTER →</a></div>
    </div>

    <section id="gallery" className="leaderboard-scene mt-6 scroll-mt-4"><RetroWindow title="CASE FILES / FULL RANKED INDEX" tone="plum" bodyClassName="p-0" chrome="browser" overflow="visible">
      <CharacterArt character="crocodile" pose="peeking" className="leaderboard-croc hidden lg:block"/>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-foreground bg-[var(--warm-paper)] px-4 py-3 text-[#251634]"><div><p className="gallery-label">Buyer report index</p><h2 className="display-type text-xl sm:text-2xl">Open case files</h2></div><span className="archive-stamp">PHP / ongoing</span></div>
      <div role="status" aria-live="polite">{loading?<div className="p-8 text-sm">Loading case files…</div>:unavailable?<EmptyState title="Index temporarily unavailable" detail="Please try again later."/>:overview.leaders.length?overview.leaders.map((seller,index)=><LeaderboardRow key={seller.id} seller={seller} rank={index+1}/>):<EmptyState title="No reviewed reports yet" detail="Case files appear after moderator approval."/>}</div>
      <StatusStrip><span>Open reports only / reviewed buyer claims</span><Link href="/methodology" className="underline underline-offset-2">How rankings work →</Link></StatusStrip>
    </RetroWindow></section>
    <p className="mt-4 max-w-3xl text-xs leading-5 text-muted-foreground">Reported purchase value is neither verified revenue nor profit. An unresolved amount is a buyer claim, not a finding of fraud. Product marks identify what buyers reported purchasing and do not imply affiliation.</p>
  </div>;
}

function EmptyState({title,detail}:{title:string;detail:string}){return <div className="empty-reaction relative flex min-h-56 items-center gap-4 overflow-hidden p-6"><CharacterArt character="bozo" pose="confused" className="w-32 shrink-0"/><div className="relative z-10"><p className="display-type text-lg">{title}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div></div>}

function Total({label,value}:{label:string;value:string}){return <div className="min-w-0 border-b border-r border-foreground/25 p-3"><p className="gallery-label text-muted-foreground">{label}</p><p className="mt-1 break-all font-mono text-lg font-bold tabular">{value}</p></div>}

function StageCard({rank,seller,loading}:{rank:number;seller?:SellerLossStats;loading:boolean}){
  const primary=rank===1;
  const content=<div className={`relative flex h-full min-h-[260px] flex-col border-2 border-[#251634] bg-[var(--card)] text-[var(--foreground)] ${primary?"md:min-h-[345px]":"md:min-h-[310px]"}`}>
    <div className={`flex items-center justify-between border-b-2 border-[#251634] px-3 py-2 font-[family-name:var(--font-pixel)] text-[10px] text-[#251634] ${primary?"bg-[#d7ec67]":rank===2?"bg-[#c7c8e7]":"bg-[#efbd9a]"}`}><span>{primary?"CENTER STAGE":"FEATURED FILE"}</span><span>#{String(rank).padStart(2,"0")}</span></div>
    <div className="flex flex-1 flex-col p-3">{seller?<><div className="flex items-start gap-2"><SellerAvatar seller={seller} size={primary?72:58}/><div className="min-w-0"><PrimaryProduct product={seller.primary_account_type}/><AccountTypeBadges types={seller.account_types||[]} limit={2}/></div></div><p className="mt-3 break-all text-xl font-bold leading-tight tracking-tight">@{seller.username}</p><div className="mt-auto grid grid-cols-2 gap-x-2 gap-y-3 border-t border-foreground/30 pt-3"><MiniMetric label="Unresolved" value={money(seller.unresolved_amount)}/><MiniMetric label="Reported value" value={money(seller.reported_purchase_value)}/><MiniMetric label="Accounts" value={count(seller.accounts_reported_purchased)}/><MiniMetric label="Open reports" value={count(seller.report_count)}/></div></>:<div className="flex flex-1 flex-col items-center justify-center text-center"><CharacterArt character="bozo" pose="confused" className="h-20 w-20"/><p className="gallery-label mt-3">{loading?"Loading…":"Unassigned"}</p><p className="mt-1 text-xs text-muted-foreground">Awaiting reviewed reports</p></div>}</div>
    {seller&&<div className="flex items-center justify-between border-t-2 border-foreground px-3 py-2 font-[family-name:var(--font-pixel)] text-[10px]">View public record <ArrowUpRight size={14}/></div>}
  </div>;
  return <div className={primary?"order-1 md:order-2 md:-translate-y-2":"order-2 md:order-1 last:md:order-3"}>{seller?<Link className="block h-full hover:-translate-y-1 transition-transform" href={`/seller/${seller.normalized_username}`} aria-label={`View @${seller.username}, rank ${rank}, ${money(seller.unresolved_amount)} reported unresolved`}>{content}</Link>:content}</div>;
}

function MiniMetric({label,value}:{label:string;value:string}){return <span className="min-w-0"><span className="gallery-label block text-muted-foreground">{label}</span><strong className="block break-all font-mono text-sm tabular">{value}</strong></span>}

function SellerAvatar({seller,size}:{seller:SellerLossStats;size:number}){return seller.has_avatar?<Image unoptimized src={`/api/sellers/${seller.id}/avatar?v=${encodeURIComponent(seller.avatar_updated_at||"")}`} alt={`Moderator-selected reference image for @${seller.username}`} width={size} height={size} className="shrink-0 border-2 border-foreground object-cover" style={{width:size,height:size}}/>:<span aria-hidden="true" className="grid shrink-0 place-items-center border-2 border-foreground bg-[var(--lime)] font-[family-name:var(--font-display)] text-3xl text-[#251634]" style={{width:size,height:size}}>{seller.username.slice(0,1).toUpperCase()}</span>}

function LeaderboardRow({seller,rank}:{seller:SellerLossStats;rank:number}){return <Link href={`/seller/${seller.normalized_username}`} aria-label={`View rank ${rank}, @${seller.username}`} className="group grid gap-3 border-b-2 border-foreground/25 p-3 transition-colors hover:bg-[var(--secondary)] sm:grid-cols-[38px_52px_minmax(130px,1fr)] sm:items-center lg:grid-cols-[38px_52px_minmax(160px,1fr)_repeat(4,minmax(100px,130px))_20px]">
  <span className="archive-stamp w-fit">{String(rank).padStart(2,"0")}</span><div className="hidden sm:block"><SellerAvatar seller={seller} size={48}/></div><div className="min-w-0"><strong className="block truncate text-lg">@{seller.username}</strong><PrimaryProduct product={seller.primary_account_type}/><AccountTypeBadges types={seller.account_types||[]} limit={3}/></div><div className="grid grid-cols-2 gap-2 sm:col-span-3 lg:col-span-4 lg:grid-cols-4"><MiniMetric label="Reported value" value={money(seller.reported_purchase_value)}/><MiniMetric label="Accounts" value={count(seller.accounts_reported_purchased)}/><MiniMetric label="Unresolved" value={money(seller.unresolved_amount)}/><MiniMetric label="Open reports" value={count(seller.report_count)}/></div><ArrowUpRight className="hidden size-4 lg:block"/></Link>}
