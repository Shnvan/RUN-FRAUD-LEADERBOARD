"use client";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function RecordTrigger({className,label="Report unresolved loss"}:{className?:string;label?:string}) {
  const router=useRouter();
  function open() {
    const handled = window.dispatchEvent(new CustomEvent("purchase-record:open",{cancelable:true}));
    if (handled) router.push("/?record=1");
  }
  return <button type="button" onClick={open} className={cn("inline-flex min-h-11 items-center justify-center gap-2 bg-foreground px-4 text-xs font-semibold uppercase tracking-[.08em] text-background transition-opacity hover:opacity-75",className)}><Plus size={15}/>{label}</button>;
}
