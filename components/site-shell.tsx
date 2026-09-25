import Link from "next/link";
import { ArrowUpRight, ChartNoAxesCombined } from "lucide-react";
import { RecordTrigger } from "@/components/record-trigger";
import { SellerSearch } from "@/components/seller-search";

export function SiteShell({children}: {children:React.ReactNode}) {
  return <div className="min-h-screen overflow-x-hidden">
    <header className="sticky top-0 z-40 border-b border-foreground/8 bg-background/82 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-4 px-5 md:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 text-sm font-semibold tracking-[-.025em]">
          <span className="grid size-8 place-items-center rounded-full bg-foreground text-background"><ChartNoAxesCombined size={15}/></span>
          <span className="hidden sm:block">Purchase Record</span>
        </Link>
        <div className="flex items-center gap-5">
          <SellerSearch/>
          <nav aria-label="Primary" className="hidden items-center gap-5 text-xs font-medium text-muted-foreground md:flex">
            <Link href="/#leaderboard" className="transition hover:text-foreground">Overview</Link>
            <Link href="/methodology" className="transition hover:text-foreground">Methodology</Link>
            <Link href="/about" className="transition hover:text-foreground">About</Link>
          </nav>
          <RecordTrigger className="h-9 px-3.5 text-xs sm:px-4" label="Record purchase"/>
        </div>
      </div>
    </header>
    {children}
    <footer className="mx-auto max-w-[1240px] px-5 pb-8 pt-20 md:px-8">
      <div className="grid gap-8 border-t border-foreground/10 py-8 md:grid-cols-[1fr_auto] md:items-end">
        <div><div className="flex items-center gap-2 text-sm font-semibold"><ChartNoAxesCombined size={15}/>Purchase Record</div><p className="mt-3 max-w-xl text-xs leading-5 text-muted-foreground">Buyer-Reported Sales are calculated from approved submissions. They do not represent complete revenue or profit, and approval is not independent verification.</p></div>
        <div className="flex gap-5 text-xs font-medium text-muted-foreground"><Link href="/methodology" className="hover:text-foreground">Methodology</Link><Link href="/about" className="hover:text-foreground">About</Link><Link href="/admin" className="inline-flex items-center gap-1 hover:text-foreground">Admin <ArrowUpRight size={11}/></Link></div>
      </div>
    </footer>
  </div>;
}
