import Link from "next/link";
import { ChartNoAxesCombined } from "lucide-react";

export function SiteShell({children}: {children:React.ReactNode}) {
  return <div className="min-h-screen"><header className="border-b border-border bg-white"><div className="mx-auto flex h-[70px] max-w-[1160px] items-center justify-between px-5 md:px-8"><Link href="/" className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[-.03em]"><span className="grid size-8 place-items-center rounded-md bg-primary text-white"><ChartNoAxesCombined size={17}/></span>Purchase Record</Link><nav className="flex items-center gap-5 text-sm text-muted-foreground md:gap-7"><Link href="/methodology" className="hover:text-foreground">Methodology</Link><Link href="/about" className="hover:text-foreground">About</Link></nav></div></header>{children}<footer className="mx-auto max-w-[1160px] border-t border-border px-5 py-7 text-xs leading-5 text-muted-foreground md:px-8">Calculated from purchases submitted to this platform. This does not represent a seller&apos;s complete revenue or profit.</footer></div>;
}
