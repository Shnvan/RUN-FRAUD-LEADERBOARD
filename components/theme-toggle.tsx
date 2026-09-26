"use client";
import {Moon,Sun} from "lucide-react";
import {useTheme} from "next-themes";
import {useSyncExternalStore} from "react";

const emptySubscribe=()=>()=>{};

export function ThemeToggle(){
  const {resolvedTheme,setTheme}=useTheme();
  const mounted=useSyncExternalStore(emptySubscribe,()=>true,()=>false);
  const dark=mounted&&resolvedTheme==="dark",label=dark?"Switch to light theme":"Switch to dark theme";
  return <button type="button" aria-label={label} title={label} aria-pressed={dark} onClick={()=>setTheme(dark?"light":"dark")} className="inline-flex size-11 shrink-0 items-center justify-center border-2 border-[var(--ink)] bg-background text-foreground transition hover:bg-foreground hover:text-background">
    <Sun size={16} className="hidden dark:block"/><Moon size={16} className="block dark:hidden"/>
  </button>;
}
