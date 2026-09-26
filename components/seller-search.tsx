"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { normalizeHandle, validHandle } from "@/lib/domain";

export function SellerSearch({hero=false,id}:{hero?:boolean;id?:string}) {
  const [value,setValue]=useState(""); const [error,setError]=useState(""); const router=useRouter();
  const inputId=id||(hero?"hero-seller-search":"nav-seller-search"),errorId=`${inputId}-error`;
  function submit(event:FormEvent){event.preventDefault();const handle=normalizeHandle(value);if(!validHandle(handle)){setError("Enter a seller handle with 2–64 letters, numbers, dots, underscores, or hyphens.");document.getElementById(inputId)?.focus();return}setError("");router.push(`/seller/${encodeURIComponent(handle)}`);}
  return <div className={hero?"min-w-0 w-full":"hidden lg:block"}><form onSubmit={submit} role="search" className={hero?"group flex h-14 min-w-0 w-full max-w-full items-center overflow-hidden border border-foreground bg-card p-1 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2":"flex h-10 min-w-0 items-center border border-foreground/30 bg-card px-3"}>
    <Search size={hero?18:14} className="ml-2 shrink-0 text-muted-foreground"/>
    <label htmlFor={inputId} className="sr-only">Search seller handle</label>
    <input id={inputId} value={value} onChange={e=>{setValue(e.target.value);if(error)setError("")}} placeholder="Search seller handle" aria-invalid={Boolean(error)} aria-describedby={error?errorId:undefined} className={hero?"min-w-0 flex-1 bg-transparent px-2 text-[15px] outline-none placeholder:text-muted-foreground":"w-40 bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground"}/>
    {hero&&<button type="submit" className="h-11 shrink-0 bg-foreground px-3 text-xs font-semibold uppercase tracking-wide text-background transition hover:opacity-75 sm:px-5">Search</button>}
  </form>{error&&<p id={errorId} role="alert" className="mt-2 text-xs leading-5 text-foreground">{error}</p>}</div>;
}
