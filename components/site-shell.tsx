import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { RecordTrigger } from "@/components/record-trigger";
import { SellerSearch } from "@/components/seller-search";
import {ThemeToggle} from "@/components/theme-toggle";

export function SiteShell({children}: {children:React.ReactNode}) {
  return <div className="min-h-screen overflow-x-hidden">
    <header className="sticky top-0 z-40 border-b border-foreground/20 bg-background/94 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1380px] items-center justify-between gap-4 px-5 md:px-9">
        <Link href="/" className="flex shrink-0 items-center gap-3 text-sm font-bold tracking-[-.04em]" aria-label="fraus home">
          <span className="grid size-7 place-items-center border border-foreground text-lg leading-none">f.</span>
          <span className="hidden sm:block">fraus</span>
        </Link>
        <div className="flex min-w-0 items-center gap-2 sm:gap-5">
          <SellerSearch/>
          <nav aria-label="Primary" className="hidden items-center gap-5 text-xs font-semibold uppercase tracking-[.08em] md:flex"><Link href="/#gallery" className="inline-flex min-h-11 items-center px-2 hover:underline">Index</Link></nav>
          <Link href="/#gallery" aria-label="Search sellers" className="inline-flex size-11 shrink-0 items-center justify-center border border-foreground/25 lg:hidden"><Search size={17}/></Link>
          <ThemeToggle/>
          <RecordTrigger compactLabel="Report" className="shrink-0 px-2.5 text-[10px] sm:px-4 sm:text-xs"/>
        </div>
      </div>
    </header>
    {children}
    <footer className="mx-auto max-w-[1380px] px-5 pb-6 md:px-9">
      <div className="flex flex-wrap items-end justify-between gap-5 border-t border-foreground/20 py-6">
        <div><div className="text-sm font-bold tracking-[-.04em]">fraus</div><p className="mt-1 text-xs text-muted-foreground">Buyer-reported unresolved losses / PHP</p></div>
        <div className="flex flex-wrap items-center gap-x-2 text-xs font-medium text-muted-foreground"><Link href="/methodology" className="inline-flex min-h-11 items-center px-2 hover:text-foreground">How rankings work</Link><Link href="/about" className="inline-flex min-h-11 items-center px-2 hover:text-foreground">About</Link><Link href="/admin" className="inline-flex min-h-11 items-center gap-1 px-2 hover:text-foreground">Admin <ArrowUpRight size={11}/></Link></div>
      </div>
    </footer>
  </div>;
}
