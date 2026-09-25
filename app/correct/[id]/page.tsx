import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { CorrectionForm } from "@/components/correction-form";
import { dbGet } from "@/lib/server";
import { money, type PublicPurchase } from "@/lib/domain";
export const dynamic="force-dynamic";
export default async function CorrectPage({params}:{params:Promise<{id:string}>}){const id=(await params).id;if(!/^[0-9a-f-]{36}$/i.test(id))notFound();const records=await dbGet<PublicPurchase[]>("public_purchase_rows",`select=*&id=eq.${id}&limit=1`);const record=records[0];if(!record)notFound();return <SiteShell><main className="mx-auto max-w-[680px] px-5 py-14"><p className="text-xs font-semibold uppercase tracking-[.14em] text-primary">Private request</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em]">Report an issue</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Flag an incorrect public record. Your request will only be seen by moderators.</p><div className="mt-7 rounded-lg border border-border bg-background p-4 text-sm"><strong>@{record.username}</strong> · {record.quantity} × {money(record.unit_price)} · {money(record.total_amount)}</div><CorrectionForm purchaseId={id} siteKey={process.env.TURNSTILE_SITE_KEY||""}/></main></SiteShell>}
