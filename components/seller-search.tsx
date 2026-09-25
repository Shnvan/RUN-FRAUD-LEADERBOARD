"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { normalizeHandle, validHandle } from "@/lib/domain";

export function SellerSearch({hero=false}:{hero?:boolean}) {
  const [value,setValue]=useState(""); const router=useRouter();
  function submit(event:FormEvent){event.preventDefault();const handle=normalizeHandle(value);if(validHandle(handle))router.push(`/seller/${encodeURIComponent(handle)}`);}
  return <form onSubmit={submit} role="search" className={hero?"group flex h-14 w-full max-w-full items-center overflow-hidden border border-foreground bg-card p-1 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2":"hidden h-10 items-center border border-foreground/30 bg-card px-3 lg:flex"}>
    <Search size={hero?18:14} className="ml-2 shrink-0 text-muted-foreground"/>
    <label htmlFor={hero?"hero-seller-search":"nav-seller-search"} className="sr-only">Search seller handle</label>
    <input id={hero?"hero-seller-search":"nav-seller-search"} value={value} onChange={e=>setValue(e.target.value)} placeholder="Search seller handle" className={hero?"min-w-0 flex-1 bg-transparent px-3 text-[15px] outline-none placeholder:text-muted-foreground":"w-40 bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground"}/>
    {hero&&<button type="submit" className="h-11 bg-foreground px-5 text-xs font-semibold uppercase tracking-wide text-background transition hover:opacity-75">Search</button>}
  </form>;
}
