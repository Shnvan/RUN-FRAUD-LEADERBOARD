import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { RecordTrigger } from "@/components/record-trigger";
import { SellerSearch } from "@/components/seller-search";

export function SiteShell({children}: {children:React.ReactNode}) {
  return <div className="min-h-screen overflow-x-hidden">
    <header className="sticky top-0 z-40 border-b border-foreground/20 bg-background/94 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1380px] items-center justify-between gap-4 px-5 md:px-9">
        <Link href="/" className="flex shrink-0 items-center gap-3 text-sm font-bold uppercase tracking-[-.04em]">
          <span className="grid size-7 place-items-center border border-foreground text-[11px]">PR</span>
          <span className="hidden sm:block">Purchase Record</span>
        </Link>
        <div className="flex items-center gap-5">
          <SellerSearch/>
          <nav aria-label="Primary" className="hidden items-center gap-5 text-xs font-semibold uppercase tracking-[.08em] md:flex"><Link href="/#gallery" className="hover:underline">Index</Link></nav>
          <RecordTrigger className="px-3 text-[10px] sm:px-4 sm:text-xs"/>
        </div>
      </div>
    </header>
    {children}
    <footer className="mx-auto max-w-[1380px] px-5 pb-6 md:px-9">
      <div className="flex flex-wrap items-end justify-between gap-5 border-t border-foreground/20 py-6">
        <div><div className="text-sm font-bold uppercase tracking-[-.04em]">Purchase Record</div><p className="mt-1 text-xs text-muted-foreground">Buyer-reported unresolved losses / PHP</p></div>
        <div className="flex gap-5 text-xs font-medium text-muted-foreground"><Link href="/methodology" className="hover:text-foreground">How rankings work</Link><Link href="/about" className="hover:text-foreground">About</Link><Link href="/admin" className="inline-flex items-center gap-1 hover:text-foreground">Admin <ArrowUpRight size={11}/></Link></div>
      </div>
    </footer>
  </div>;
}
