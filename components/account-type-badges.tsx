import {ProductIcon} from "@/components/product-brand";

const slugs:Record<string,string>={ChatGPT:"chatgpt",Claude:"claude",Gemini:"gemini",Adobe:"adobe","Microsoft 365":"microsoft-365",Canva:"canva",Midjourney:"midjourney",Perplexity:"perplexity",Other:"other"};
export function AccountTypeBadges({types,limit}:{types:string[];limit?:number}){
  const visible=typeof limit==="number"?types.slice(0,limit):types;
  const extra=typeof limit==="number"?Math.max(0,types.length-limit):0;
  if(!types.length)return null;
  return <div className="flex flex-wrap gap-1.5" aria-label={`Account types: ${types.join(", ")}`}>
    {visible.map(type=><span key={type} className="inline-flex items-center gap-1.5 border border-current/25 px-2 py-1 font-mono text-[9px] uppercase tracking-[.1em]"><ProductIcon slug={slugs[type]||"other"} label={type} size={16}/>{type}</span>)}
    {extra>0&&<span className="border border-current/25 px-2 py-1 font-mono text-[9px] uppercase tracking-[.1em]">+{extra}</span>}
  </div>;
}
