import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { RecordTrigger } from "@/components/record-trigger";

export default function NotFound(){
  return <SiteShell><main className="mx-auto grid min-h-[65dvh] max-w-[1380px] place-items-center px-5 py-16 text-center md:px-9"><div><p className="gallery-label text-muted-foreground">Index / 404</p><h1 className="mt-4 text-[clamp(3.5rem,9vw,8rem)] font-semibold leading-[.87] tracking-[-.085em]">NO PUBLIC<br/>REPORT YET.</h1><p className="mx-auto mt-6 max-w-sm text-sm leading-6 text-muted-foreground">This handle has no approved open loss reports in the index.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/" className="inline-flex min-h-11 items-center border border-foreground px-5 text-xs font-semibold uppercase tracking-wide">Back to index</Link><RecordTrigger/></div></div></main></SiteShell>;
}
