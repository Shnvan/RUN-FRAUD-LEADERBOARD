"use client";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function RecordTrigger({className,label="Record purchase"}:{className?:string;label?:string}) {
  const router=useRouter();
  function open() {
    const handled = window.dispatchEvent(new CustomEvent("purchase-record:open",{cancelable:true}));
    if (handled) router.push("/?record=1");
  }
  return <button type="button" onClick={open} className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background transition-transform hover:-translate-y-0.5 active:translate-y-0",className)}><Plus size={15}/>{label}</button>;
}
