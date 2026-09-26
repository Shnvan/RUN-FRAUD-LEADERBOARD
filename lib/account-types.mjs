export const ACCOUNT_TYPE_SEED=[
  {slug:"chatgpt",label:"ChatGPT"},{slug:"claude",label:"Claude"},{slug:"gemini",label:"Gemini"},
  {slug:"adobe",label:"Adobe"},{slug:"microsoft-365",label:"Microsoft 365"},{slug:"canva",label:"Canva"},
  {slug:"midjourney",label:"Midjourney"},{slug:"perplexity",label:"Perplexity"},{slug:"other",label:"Other"},
];
const SLUGS=new Set(ACCOUNT_TYPE_SEED.map(value=>value.slug));
export function normalizeOtherAccountType(value){return String(value??"").trim().replace(/\s+/g," ");}
export function parseAccountTypes(value,other){
  let parsed;
  try{parsed=typeof value==="string"?JSON.parse(value):value;}catch{throw new Error("invalid_account_types");}
  if(!Array.isArray(parsed))throw new Error("invalid_account_types");
  const slugs=[...new Set(parsed.map(v=>String(v).trim().toLowerCase()))].sort();
  if(slugs.length<1||slugs.length>8||slugs.some(slug=>!SLUGS.has(slug)))throw new Error("invalid_account_types");
  const custom=normalizeOtherAccountType(other);
  if(slugs.includes("other")){if(custom.length<2||custom.length>40||/[<>\u0000-\u001f\u007f]/.test(custom))throw new Error("invalid_other_account_type");}
  else if(custom)throw new Error("invalid_other_account_type");
  return {slugs,other:slugs.includes("other")?custom:null};
}
