import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { RecordTrigger } from "@/components/record-trigger";
import {ThemeToggle} from "@/components/theme-toggle";
import {WebBadge} from "@/components/old-web-art";

export function SiteShell({children}: {children:React.ReactNode}) {
  return <div className="min-h-screen overflow-x-clip">
    <div className="browser-warning"><span>Fraus Internet Archive Explorer</span><span>File&nbsp;&nbsp; Edit&nbsp;&nbsp; View&nbsp;&nbsp; Favorites&nbsp;&nbsp; Help</span></div>
    <header className="site-header relative z-40 border-b-[3px] border-[var(--ink)] bg-[var(--signal)] text-white">
      <div className="site-header__inner mx-auto max-w-[1480px] px-4 py-2 md:px-8">
        <Link href="/" aria-label="fraus home" className="site-brand flex items-center gap-2 border-2 bg-[var(--lime)] px-2 py-1"><WebBadge name="fraus-archive"/><span className="display-type text-xl">fraus</span></Link>
        <nav aria-label="Primary" className="site-header__nav flex flex-wrap items-center gap-1 font-[family-name:var(--font-pixel)] text-[10px]">
          <Link href="/" className="px-2 py-2 hover:bg-white hover:text-[var(--classic-ink)]">Main stage</Link>
          <Link href="/#gallery" className="px-2 py-2 hover:bg-white hover:text-[var(--classic-ink)]">Case files</Link>
          <Link href="/methodology" className="px-2 py-2 hover:bg-white hover:text-[var(--classic-ink)]">Method</Link>
        </nav>
        <div className="site-header__controls flex items-center gap-2"><ThemeToggle/><RecordTrigger label="Report unresolved loss" compactLabel="Report" className="archive-button archive-button--red min-h-11 shrink-0 px-2 text-[10px] sm:px-3"/></div>
      </div>
    </header>
    {children}
    <footer className="mx-auto max-w-[1480px] px-4 pb-8 md:px-8"><div className="retro-window retro-window--navy"><div className="retro-titlebar"><span className="retro-titlebar__app" aria-hidden="true">F</span>fraus / archive footer<span className="retro-titlebar__controls" aria-hidden="true"><i>_</i><i>□</i><i>×</i></span></div><div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"><div><strong className="display-type text-lg">fraus</strong><p className="text-xs text-muted-foreground">Reviewed buyer claims / PHP. Inclusion does not establish wrongdoing.</p></div><div className="flex flex-wrap gap-2 font-[family-name:var(--font-pixel)] text-[10px]"><WebBadge name="best-viewed"/><Link href="/methodology" className="archive-button archive-button--paper">Method</Link><Link href="/about" className="archive-button archive-button--paper">About</Link><Link href="/admin" className="archive-button archive-button--paper">Admin <ArrowUpRight size={13}/></Link></div></div></div></footer>
  </div>;
}
