import "server-only";
import { cookies } from "next/headers";
import { ServiceError, sameOrigin } from "@/lib/server";

const CSRF_COOKIE="fraus_csrf";
const STEPUP_COOKIE="fraus_stepup";
const encoder=new TextEncoder();

async function hmac(value:string){
  const secret=process.env.ABUSE_HASH_SECRET;
  if(!secret||secret.length<32)throw new ServiceError(503,"Administrator security is temporarily unavailable.");
  const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signed=await crypto.subtle.sign("HMAC",key,encoder.encode(value));
  return Array.from(new Uint8Array(signed),b=>b.toString(16).padStart(2,"0")).join("");
}

function cookieOptions(maxAge:number){return {httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/",maxAge};}

export async function issueCsrfToken(){
  const store=await cookies();
  let token=store.get(CSRF_COOKIE)?.value;
  if(!token||!/^[0-9a-f-]{36}$/i.test(token)){token=crypto.randomUUID();store.set(CSRF_COOKIE,token,cookieOptions(60*60*8));}
  return token;
}

export async function requireCsrf(request:Request){
  if(!sameOrigin(request))throw new ServiceError(403,"Request not allowed.");
  const store=await cookies();
  const cookie=store.get(CSRF_COOKIE)?.value||"";
  const header=request.headers.get("x-csrf-token")||"";
  if(!cookie||!header||cookie.length!==header.length){throw new ServiceError(403,"Your administrator session changed. Refresh and try again.");}
  const a=encoder.encode(cookie),b=encoder.encode(header);let different=0;
  for(let i=0;i<a.length;i++)different|=a[i]^b[i];
  if(different)throw new ServiceError(403,"Your administrator session changed. Refresh and try again.");
}

export async function grantRecentMfa(userId:string){
  const expires=Math.floor(Date.now()/1000)+300;
  const payload=`${userId}.${expires}.${crypto.randomUUID()}`;
  const store=await cookies();
  store.set(STEPUP_COOKIE,`${payload}.${await hmac(payload)}`,cookieOptions(300));
}

export async function requireRecentMfa(userId:string){
  const value=(await cookies()).get(STEPUP_COOKIE)?.value||"";
  const parts=value.split(".");
  if(parts.length!==4)throw new ServiceError(428,"Enter a current authenticator code to unlock sensitive actions.");
  const payload=parts.slice(0,3).join(".");
  const [storedUser,expires]=parts;
  if(storedUser!==userId||!/^\d+$/.test(expires)||Number(expires)<Date.now()/1000||await hmac(payload)!==parts[3])throw new ServiceError(428,"Enter a current authenticator code to unlock sensitive actions.");
}

export async function clearAdminSecurityCookies(){
  const store=await cookies();store.delete(CSRF_COOKIE);store.delete(STEPUP_COOKIE);
}
