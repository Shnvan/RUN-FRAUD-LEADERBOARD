import {normalizeOtherAccountType} from "./account-types.mjs";

const SLUGS=new Set(["chatgpt","claude","gemini","adobe","microsoft-365","canva","midjourney","perplexity","other"]);
const PRICE=/^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/;
const QUANTITY=/^[1-9]\d{0,4}$/;

export function canonicalMoney(value){
  const text=String(value??"");
  if(!PRICE.test(text)||Number(text)<.01||Number(text)>1000000)throw new Error("invalid_price");
  const [whole,fraction=""]=text.split(".");
  return `${BigInt(whole)}.${fraction.padEnd(2,"0")}`;
}

export function parseReportItems(value){
  let parsed;
  try{parsed=typeof value==="string"?JSON.parse(value):value;}catch{throw new Error("invalid_items");}
  if(!Array.isArray(parsed)||parsed.length<1||parsed.length>8)throw new Error("invalid_items");
  return parsed.map((raw,index)=>{
    if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("invalid_items");
    const accountType=String(raw.accountType??"").trim().toLowerCase();
    const quantity=String(raw.quantity??"");
    const unitPrice=canonicalMoney(raw.unitPrice);
    const other=normalizeOtherAccountType(raw.otherAccountType);
    if(!SLUGS.has(accountType))throw new Error("invalid_account_type");
    if(!QUANTITY.test(quantity)||Number(quantity)>10000)throw new Error("invalid_quantity");
    if(accountType==="other"){
      if(other.length<2||other.length>40||/[\u0000-\u001f\u007f<>]/.test(other))throw new Error("invalid_other_account_type");
    }else if(other)throw new Error("invalid_other_account_type");
    return {accountType,otherAccountType:accountType==="other"?other:null,quantity:Number(quantity),unitPrice,sortOrder:index};
  });
}

export function itemTotals(items){
  let accounts=0,totalCents=0n;
  for(const item of items){
    accounts+=item.quantity;
    const [whole,fraction]=item.unitPrice.split(".");
    totalCents+=BigInt(item.quantity)*(BigInt(whole)*100n+BigInt(fraction));
  }
  return {accounts,total:`${totalCents/100n}.${String(totalCents%100n).padStart(2,"0")}`};
}

export function canonicalItems(items){
  return items.map(item=>`${item.accountType}:${(item.otherAccountType||"").toLowerCase()}:${item.quantity}:${item.unitPrice}`).sort().join("|");
}
