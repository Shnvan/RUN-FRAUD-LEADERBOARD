import {notFound} from "next/navigation";
import {SiteShell} from "@/components/site-shell";
import {RetroWindow} from "@/components/retro-window";
import {CorrectionForm} from "@/components/correction-form";
import {publicDbRpc} from "@/lib/server";
import {money,type PublicLoss} from "@/lib/domain";

export const dynamic="force-dynamic";
export default async function CorrectPage({params}:{params:Promise<{id:string}>}){
  const id=(await params).id;if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
  let record:PublicLoss|null;
  try{record=await publicDbRpc<PublicLoss|null>("get_public_record",{p_id:id})}catch{return <SiteShell><main className="archive-desk grid min-h-[60dvh] place-items-center"><RetroWindow title="CORRECTION DESK / UNAVAILABLE" tone="red" className="w-full max-w-lg"><h1 className="archive-heading">Record unavailable.</h1><p className="mt-3 text-sm">We could not load this public record. Try again later.</p></RetroWindow></main></SiteShell>}
  if(!record)notFound();
  return <SiteShell><main className="archive-desk"><div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start"><aside className="space-y-4"><RetroWindow title="CORRECTION DESK / PRIVATE" tone="lime"><span className="archive-stamp">Private request</span><h1 className="archive-heading mt-3">Correct this report</h1><p className="mt-3 text-sm leading-6">Your contact details and explanation are visible only to moderators.</p></RetroWindow><RetroWindow title="PUBLIC RECORD" tone="paper"><p className="text-lg font-bold">@{record.username}</p><p className="mt-5 break-all font-mono text-2xl font-bold tabular">{money(record.unresolved_amount)}</p><p className="gallery-label mt-1 text-muted-foreground">Reported unresolved amount</p></RetroWindow></aside><div className="min-w-0"><CorrectionForm purchaseId={id} siteKey={process.env.TURNSTILE_SITE_KEY||""}/></div></div></main></SiteShell>;
}
