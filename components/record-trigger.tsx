"use client";
import { Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function RecordTrigger({className,label="Report unresolved loss",compactLabel="Report"}:{className?:string;label?:string;compactLabel?:string}) {
  function open(event:React.MouseEvent<HTMLAnchorElement>) {
    const handled = window.dispatchEvent(new CustomEvent("purchase-record:open",{cancelable:true,detail:{opener:event.currentTarget}}));
    if (!handled) event.preventDefault();
  }
  return <Link href="/?record=1" data-report-trigger aria-label={label} onClick={open} className={cn("inline-flex min-h-11 items-center justify-center gap-2 bg-foreground px-3 text-xs font-semibold uppercase tracking-[.08em] text-background transition-opacity hover:opacity-75 sm:px-4",className)}><Plus size={15}/><span className="sm:hidden">{compactLabel}</span><span className="hidden sm:inline">{label}</span></Link>;
}
