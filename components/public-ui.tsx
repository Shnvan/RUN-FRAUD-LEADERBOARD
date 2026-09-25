"use client";
import Link from "next/link";
import { ArrowUpRight, ChartNoAxesCombined, CircleDot } from "lucide-react";
import { motion } from "motion/react";
import { money, type SellerStats, type PublicPurchase } from "@/lib/domain";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export const dateLabel = (date:string) => new Intl.DateTimeFormat("en-PH",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}).format(new Date(`${date}T00:00:00Z`));

export function PriceHistory({rows}:{rows:PublicPurchase[]}) {
  const points = [...rows].sort((a,b)=>a.purchase_date.localeCompare(b.purchase_date) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)).slice(-24);
  if (!points.length) return <div className="grid h-44 place-items-center rounded-2xl border border-dashed border-foreground/15 bg-background/55 text-sm text-muted-foreground">Price history will appear after approval.</div>;
  const values=points.map(p=>Number(p.unit_price)),min=Math.min(...values),max=Math.max(...values),span=Math.max(max-min,1);
  const coords=points.map((p,i)=>`${points.length===1?50:4+i*92/(points.length-1)},${78-(Number(p.unit_price)-min)/span*60}`).join(" ");
  const area=`M ${coords.split(" ").join(" L ")} L 96 82 L 4 82 Z`;
  return <div><div className="relative h-44 overflow-hidden rounded-2xl bg-foreground p-4 text-background">
    <div className="absolute inset-x-4 top-4 flex justify-between font-mono text-[10px] uppercase tracking-[.12em] text-background/55"><span>{money(max)}</span><span>Unit price</span></div>
    <svg viewBox="0 0 100 88" preserveAspectRatio="none" role="img" aria-label={`Reported unit prices from ${money(min)} to ${money(max)}`} className="absolute inset-x-3 bottom-3 h-[124px] w-[calc(100%-1.5rem)]">
      <defs><linearGradient id="price-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--signal)" stopOpacity=".35"/><stop offset="1" stopColor="var(--signal)" stopOpacity="0"/></linearGradient></defs>
      <path d={area} fill="url(#price-fill)"/>
      <motion.polyline initial={{pathLength:0}} whileInView={{pathLength:1}} viewport={{once:true}} transition={{duration:.8,ease:"easeOut"}} fill="none" stroke="var(--signal)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" points={coords}/>
      {points.map((p,i)=><circle key={p.id} cx={points.length===1?50:4+i*92/(points.length-1)} cy={78-(Number(p.unit_price)-min)/span*60} r="1.6" fill="var(--signal)"/>)}
    </svg>
  </div><div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[.08em] text-muted-foreground"><span>{dateLabel(points[0].purchase_date)}</span><span>{dateLabel(points.at(-1)!.purchase_date)}</span></div></div>;
}

export function SellerPanel({seller,rows,loading=false,unavailable=false,draftHandle}:{seller:SellerStats|null;rows:PublicPurchase[];loading?:boolean;unavailable?:boolean;draftHandle?:string|null}) {
  return <section className="premium-card rounded-[28px] p-6 md:p-8">
    <div className="flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Seller record</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.055em] md:text-4xl">{seller?`@${seller.username}`:draftHandle?`@${draftHandle}`:"Reported activity"}</h1></div>{seller&&<Link href={`/seller/${seller.normalized_username}`} aria-label={`View @${seller.username} seller page`} className="grid size-10 place-items-center rounded-full border border-foreground/12 transition hover:bg-accent"><ArrowUpRight size={16}/></Link>}</div>
    {seller?<div className="mt-10"><p className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">Buyer-Reported Sales</p><p className="mt-2 text-5xl font-semibold tracking-[-.075em] tabular md:text-6xl">{money(seller.reported_sales)}</p><div className="my-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/10 md:grid-cols-4"><Metric label="Accounts" value={String(seller.accounts_sold)}/><Metric label="Records" value={String(seller.recorded_purchases)}/><Metric label="Latest price" value={seller.latest_price?money(seller.latest_price):"—"}/><Metric label="Weighted avg." value={seller.average_price?money(seller.average_price):"—"}/></div><PriceHistory rows={rows}/></div>:<div className="grid min-h-80 place-items-center text-center"><div><div className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-accent text-accent-foreground"><ChartNoAxesCombined size={21}/></div><h2 className="text-lg font-semibold tracking-[-.03em]">{loading?"Loading seller…":unavailable?"Seller records unavailable":draftHandle?"No approved purchases":"Select a seller"}</h2><p className="mx-auto mt-2 max-w-64 text-sm leading-6 text-muted-foreground">{loading?"Retrieving approved records.":unavailable?"Try again in a moment.":draftHandle?"This seller has no public record yet.":"Search a handle to explore buyer-reported activity."}</p></div></div>}
    <p className="mt-7 border-t border-foreground/10 pt-5 text-xs leading-5 text-muted-foreground">Approval makes a submission eligible for totals. It is not independent verification of a transaction.</p>
  </section>;
}

function Metric({label,value}:{label:string;value:string}) {return <div className="bg-card p-4"><p className="font-mono text-[9px] uppercase tracking-[.12em] text-muted-foreground">{label}</p><p className="mt-2 text-lg font-semibold tracking-[-.04em] tabular">{value}</p></div>}

export function RecentRecords({rows,title="Recent approved purchases"}:{rows:PublicPurchase[];title?:string}) {
  return <section className="mt-20"><div className="mb-6 flex items-end justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Live record</p><h2 className="mt-2 text-3xl font-semibold tracking-[-.055em] md:text-4xl">{title}</h2></div><span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><span className="signal-dot size-1.5 rounded-full bg-accent"/>Approved only</span></div>
  {!rows.length?<div className="premium-card grid min-h-56 place-items-center rounded-[28px] p-8 text-center"><div><CircleDot className="mx-auto text-muted-foreground" size={22}/><p className="mt-4 text-sm font-medium">The public record is ready.</p><p className="mt-1 text-sm text-muted-foreground">Approved purchases will appear here.</p></div></div>:<><div className="premium-card hidden overflow-hidden rounded-[24px] md:block"><Table><TableHeader><TableRow className="border-foreground/10"><TableHead>Date</TableHead><TableHead>Seller</TableHead><TableHead>Accounts</TableHead><TableHead>Unit price</TableHead><TableHead>Total</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>{rows.map(r=><TableRow key={r.id} className="border-foreground/8"><TableCell>{dateLabel(r.purchase_date)}</TableCell><TableCell><Link className="font-semibold hover:underline" href={`/seller/${r.normalized_username}`}>@{r.username}</Link></TableCell><TableCell className="font-mono tabular">{r.quantity}</TableCell><TableCell className="font-mono tabular">{money(r.unit_price)}</TableCell><TableCell className="font-mono font-semibold tabular">{money(r.total_amount)}</TableCell><TableCell><Link className="text-xs text-muted-foreground hover:text-destructive" href={`/correct/${r.id}`}>Report issue</Link></TableCell></TableRow>)}</TableBody></Table></div><div className="space-y-3 md:hidden">{rows.map(r=><article key={r.id} className="premium-card rounded-2xl p-4"><div className="flex justify-between gap-4"><Link href={`/seller/${r.normalized_username}`} className="font-semibold">@{r.username}</Link><span className="font-mono font-semibold tabular">{money(r.total_amount)}</span></div><div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>{dateLabel(r.purchase_date)}</span><span>{r.quantity} × {money(r.unit_price)}</span></div><Link href={`/correct/${r.id}`} className="mt-4 inline-block text-xs text-muted-foreground hover:text-destructive">Report issue</Link></article>)}</div></>}
  </section>;
}
