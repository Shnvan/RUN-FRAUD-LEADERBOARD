"use client";
import {Moon,Sun} from "lucide-react";
import {useTheme} from "next-themes";

export function ThemeToggle(){
  const {setTheme}=useTheme();
  return <button type="button" aria-label="Toggle color theme" title="Toggle color theme" onClick={()=>setTheme(document.documentElement.classList.contains("dark")?"light":"dark")} className="inline-flex size-11 shrink-0 items-center justify-center border border-foreground/25 bg-background transition hover:bg-foreground hover:text-background">
    <Sun size={16} className="hidden dark:block"/><Moon size={16} className="block dark:hidden"/>
  </button>;
}
