import Image from "next/image";
import type {PrimaryAccountType} from "@/lib/domain";

const known=new Set(["chatgpt","claude","gemini","adobe","microsoft-365","canva","midjourney","perplexity","other"]);
export function ProductIcon({slug,size=22}:{slug:string;label:string;size?:number}){
  const key=known.has(slug)?slug:"other";
  return <Image src={`/brands/${key}.svg`} width={size} height={size} alt="" aria-hidden="true" className="shrink-0 rounded-[4px]" style={{width:size,height:size}}/>;
}
export function PrimaryProduct({product,inverse=false}:{product:PrimaryAccountType|null|undefined;inverse?:boolean}){
  if(!product)return null;
  return <span className={`mb-2 inline-flex items-center gap-2 text-[11px] font-semibold ${inverse?"text-white/75":"text-muted-foreground"}`}><ProductIcon slug={product.slug} label={product.label} size={20}/><span>Mostly {product.label}</span></span>;
}
