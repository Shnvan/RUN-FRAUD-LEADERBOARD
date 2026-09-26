export function AccountTypeBadges({types,limit}:{types:string[];limit?:number}){
  const visible=typeof limit==="number"?types.slice(0,limit):types;
  const extra=typeof limit==="number"?Math.max(0,types.length-limit):0;
  if(!types.length)return null;
  return <div className="flex flex-wrap gap-1.5" aria-label={`Account types: ${types.join(", ")}`}>
    {visible.map(type=><span key={type} className="border border-current/25 px-2 py-1 font-mono text-[9px] uppercase tracking-[.1em]">{type}</span>)}
    {extra>0&&<span className="border border-current/25 px-2 py-1 font-mono text-[9px] uppercase tracking-[.1em]">+{extra}</span>}
  </div>;
}
