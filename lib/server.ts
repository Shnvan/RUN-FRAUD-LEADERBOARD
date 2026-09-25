import "server-only";
import { getChatGPTUser } from "@/app/chatgpt-auth";

export class ServiceError extends Error { constructor(public status: number, message: string) { super(message); } }
const config = () => {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !url.startsWith("https://")) throw new ServiceError(503, "Records are temporarily unavailable.");
  return { url, key };
};
export const configured = () => Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
export const submissionsConfigured = () => configured() && Boolean(
  process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY &&
  process.env.ABUSE_HASH_SECRET && process.env.ABUSE_HASH_SECRET.length>=32 &&
  process.env.SUPABASE_EVIDENCE_BUCKET && process.env.ADMIN_EMAILS?.trim()
);
export async function requirePrivateEvidenceBucket(){
  if(!submissionsConfigured())throw new ServiceError(503,"Submissions are temporarily unavailable.");
  const {url,key}=config();
  const bucket=process.env.SUPABASE_EVIDENCE_BUCKET!;
  const res=await fetch(`${url}/storage/v1/bucket/${encodeURIComponent(bucket)}`,{headers:{apikey:key,Authorization:`Bearer ${key}`},cache:"no-store"});
  if(!res.ok)throw new ServiceError(503,"Submissions are temporarily unavailable.");
  const info=await res.json() as {public?:boolean};
  if(info.public!==false)throw new ServiceError(503,"Submissions are temporarily unavailable.");
}
export async function dbGet<T>(table: string, query: string): Promise<T> {
  const {url,key} = config();
  const res = await fetch(`${url}/rest/v1/${table}?${query}`, {headers:{apikey:key,Authorization:`Bearer ${key}`},cache:"no-store"});
  if (!res.ok) throw new ServiceError(503,"Records are temporarily unavailable.");
  return res.json() as Promise<T>;
}
export async function dbRpc<T>(name: string, body: unknown): Promise<T> {
  const {url,key} = config();
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify(body),cache:"no-store"});
  if (!res.ok) {
    const payload = await res.json().catch(()=>({message:"database_error"})) as {message?:string};
    const code = payload.message ?? "database_error";
    if (code === "rate_limited") throw new ServiceError(429,"Too many requests. Try again later.");
    if (code === "seller_unavailable") throw new ServiceError(400,"This seller is unavailable.");
    if (code === "record_unavailable") throw new ServiceError(404,"We couldn't find that record.");
    if (code.startsWith("invalid_") || code === "details_too_long") throw new ServiceError(400,"Check the information and try again.");
    throw new ServiceError(503,"We couldn't save this right now. Try again later.");
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
export async function uploadEvidence(file: File, path: string) {
  const {url,key} = config();
  const bucket = process.env.SUPABASE_EVIDENCE_BUCKET || "private-evidence";
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":file.type,"x-upsert":"false"},body:await file.arrayBuffer()});
  if (!res.ok) throw new ServiceError(503,"We couldn't save the evidence. Try again later.");
}
export async function deleteEvidence(path: string) {
  const {url,key} = config();
  const bucket = process.env.SUPABASE_EVIDENCE_BUCKET || "private-evidence";
  await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {method:"DELETE",headers:{apikey:key,Authorization:`Bearer ${key}`}}).catch(()=>{});
}
export async function readEvidence(path: string): Promise<Response> {
  const {url,key} = config();
  const bucket = process.env.SUPABASE_EVIDENCE_BUCKET || "private-evidence";
  return fetch(`${url}/storage/v1/object/authenticated/${bucket}/${path}`, {headers:{apikey:key,Authorization:`Bearer ${key}`},cache:"no-store"});
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}
export async function boundedFormData(request: Request, maxBytes = 6*1024*1024) {
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) throw new ServiceError(400,"Invalid form submission.");
  const reader=request.body?.getReader();
  if (!reader) throw new ServiceError(400,"Invalid form submission.");
  const chunks: ArrayBuffer[]=[]; let total=0;
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){await reader.cancel();throw new ServiceError(413,"The upload is too large. Choose an image under 5 MB.");}chunks.push(Uint8Array.from(value).buffer);}
  return new Request(request.url,{method:"POST",headers:{"content-type":request.headers.get("content-type")!},body:new Blob(chunks)}).formData();
}
export async function fingerprint(request: Request, discriminator = "") {
  const secret = process.env.ABUSE_HASH_SECRET;
  if (!secret || secret.length < 32) throw new ServiceError(503,"Submissions are temporarily unavailable.");
  const ip = request.headers.get("cf-connecting-ip");
  if (!ip) throw new ServiceError(503,"Submissions are temporarily unavailable.");
  const ua = (request.headers.get("user-agent") || "").slice(0,256);
  const key = await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signed = await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(`${ip}|${ua}|${discriminator}`));
  return Array.from(new Uint8Array(signed),b=>b.toString(16).padStart(2,"0")).join("");
}
export async function verifyTurnstile(token: string, expectedHostname: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) throw new ServiceError(503,"Submissions are temporarily unavailable.");
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({secret,response:token}),signal:AbortSignal.timeout(7000)}).catch(()=>null);
  if (!res?.ok) throw new ServiceError(503,"Verification is temporarily unavailable. Try again later.");
  const result = await res.json() as {success:boolean;hostname?:string};
  if (!result.success || result.hostname !== expectedHostname) throw new ServiceError(400,"Please complete the verification and try again.");
}
export async function requireAdmin() {
  const user = await getChatGPTUser();
  const allowed = (process.env.ADMIN_EMAILS || "").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
  if (!user || !allowed.includes(user.email.toLowerCase())) throw new ServiceError(403,"Access denied.");
  return user;
}
export function errorResponse(error: unknown) {
  const e = error instanceof ServiceError ? error : new ServiceError(503,"Something went wrong. Try again later.");
  return Response.json({error:e.message},{status:e.status,headers:{"cache-control":"no-store"}});
}
