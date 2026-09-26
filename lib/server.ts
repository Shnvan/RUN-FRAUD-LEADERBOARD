import "server-only";
import { getCurrentUser, isAdminEmailAllowed } from "@/app/chatgpt-auth";

export class ServiceError extends Error { constructor(public status: number, message: string,public code="service_error") { super(message); } }
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify(body),cache:"no-store",signal:AbortSignal.timeout(10000)});
  if (!res.ok) {
    const payload = await res.json().catch(()=>({message:"database_error"})) as {message?:string};
    const code = payload.message ?? "database_error";
    if (code === "rate_limited") throw new ServiceError(429,"Too many requests. Try again later.","rate_limited");
    if (code === "circuit_open") throw new ServiceError(503,"Submissions are temporarily paused. Try again later.","circuit_open");
    if (code === "seller_unavailable") throw new ServiceError(400,"This seller is unavailable.");
    if (code === "record_unavailable") throw new ServiceError(404,"We couldn't find that record.");
    if (code.startsWith("invalid_") || code === "details_too_long") throw new ServiceError(400,"Check the information and try again.");
    throw new ServiceError(503,"We couldn't save this right now. Try again later.");
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
export async function publicDbRpc<T>(name:string,body:unknown):Promise<T>{
  const url=process.env.SUPABASE_URL?.replace(/\/$/,"");
  const key=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY;
  if(!url||!key)throw new ServiceError(503,"Records are temporarily unavailable.");
  const response=await fetch(`${url}/rest/v1/rpc/${name}`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new ServiceError(503,"Records are temporarily unavailable.");
  return response.json() as Promise<T>;
}
export async function recordSecurityEvent(eventType:string,outcome:string,fingerprintValue:string|null,requestId:string|null,detail:Record<string,unknown>={}){
  try{await dbRpc("log_security_event",{p_event_type:eventType.slice(0,80),p_outcome:outcome.slice(0,40),p_fingerprint:fingerprintValue,p_request_id:requestId?.slice(0,200)||null,p_detail:detail});}catch{/* Security telemetry must never disclose details or replace the primary response. */}
}
export async function uploadEvidence(file: File, path: string) {
  const {url,key} = config();
  const bucket = process.env.SUPABASE_EVIDENCE_BUCKET || "private-evidence";
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":file.type,"cache-control":"private, max-age=0","x-upsert":"false"},body:await file.arrayBuffer(),signal:AbortSignal.timeout(15000)});
  if (!res.ok) throw new ServiceError(503,"We couldn't save the evidence. Try again later.");
}
export async function deleteEvidence(path: string) {
  const {url,key} = config();
  const bucket = process.env.SUPABASE_EVIDENCE_BUCKET || "private-evidence";
  const response=await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {method:"DELETE",headers:{apikey:key,Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(10000)}).catch(()=>null);
  return Boolean(response?.ok||response?.status===404);
}
export async function listEvidenceObjects(){
  const {url,key}=config();
  const bucket=process.env.SUPABASE_EVIDENCE_BUCKET||"private-evidence";
  const response=await fetch(`${url}/storage/v1/object/list/${encodeURIComponent(bucket)}`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify({prefix:"",limit:1000,offset:0,sortBy:{column:"created_at",order:"asc"}}),cache:"no-store",signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new ServiceError(503,"Evidence storage is temporarily unavailable.");
  return response.json() as Promise<Array<{name:string;created_at?:string}>>;
}
export async function readEvidence(path: string): Promise<Response> {
  const {url,key} = config();
  const bucket = process.env.SUPABASE_EVIDENCE_BUCKET || "private-evidence";
  return fetch(`${url}/storage/v1/object/authenticated/${bucket}/${path}`, {headers:{apikey:key,Authorization:`Bearer ${key}`},cache:"no-store"});
}
const sellerImageBucket=()=>process.env.SUPABASE_SELLER_IMAGE_BUCKET||"seller-profile-images";
export async function requirePrivateSellerImageBucket(){
  const {url,key}=config();const bucket=sellerImageBucket();
  const response=await fetch(`${url}/storage/v1/bucket/${encodeURIComponent(bucket)}`,{headers:{apikey:key,Authorization:`Bearer ${key}`},cache:"no-store"});
  if(!response.ok)throw new ServiceError(503,"Seller image storage is temporarily unavailable.");
  const info=await response.json() as {public?:boolean};if(info.public!==false)throw new ServiceError(503,"Seller image storage is not private.");
}
export async function uploadSellerImage(file:File,path:string){
  const {url,key}=config();const response=await fetch(`${url}/storage/v1/object/${sellerImageBucket()}/${path}`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"image/webp","cache-control":"public, max-age=31536000, immutable","x-upsert":"false"},body:await file.arrayBuffer(),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new ServiceError(503,"We couldn't save the seller image.");
}
export async function deleteSellerImage(path:string){
  const {url,key}=config();const response=await fetch(`${url}/storage/v1/object/${sellerImageBucket()}/${path}`,{method:"DELETE",headers:{apikey:key,Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(10000)}).catch(()=>null);
  return Boolean(response?.ok||response?.status===404);
}
export async function readSellerImage(path:string){
  const {url,key}=config();return fetch(`${url}/storage/v1/object/authenticated/${sellerImageBucket()}/${path}`,{headers:{apikey:key,Authorization:`Bearer ${key}`},cache:"no-store",signal:AbortSignal.timeout(10000)});
}
export async function listSellerImageObjects(){
  const {url,key}=config();const bucket=sellerImageBucket();const found:Array<{name:string;created_at?:string}>=[];
  async function walk(prefix=""){
    let offset=0;while(true){const response=await fetch(`${url}/storage/v1/object/list/${encodeURIComponent(bucket)}`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify({prefix,limit:100,offset,sortBy:{column:"created_at",order:"asc"}}),cache:"no-store",signal:AbortSignal.timeout(10000)});if(!response.ok)throw new ServiceError(503,"Seller image storage is temporarily unavailable.");const objects=await response.json() as Array<{id?:string|null;name?:string;metadata?:unknown;created_at?:string}>;if(!objects.length)break;for(const object of objects){if(!object.name)continue;const name=prefix?`${prefix}/${object.name}`:object.name;if(object.id==null||object.metadata==null)await walk(name);else found.push({name,created_at:object.created_at});}offset+=objects.length;if(objects.length<100)break;}
  }
  await walk();return found;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}
export function validUuid(value: unknown): value is string { return typeof value === "string" && UUID_RE.test(value); }
export async function boundedJson<T extends Record<string, unknown>>(request: Request, maxBytes = 32*1024): Promise<T> {
  const contentType=request.headers.get("content-type")?.split(";",1)[0]?.trim().toLowerCase();
  if(contentType!=="application/json")throw new ServiceError(415,"Send this request as JSON.");
  const declared=Number(request.headers.get("content-length")||0);
  if(Number.isFinite(declared)&&declared>maxBytes)throw new ServiceError(413,"The request is too large.");
  const reader=request.body?.getReader();
  if(!reader)throw new ServiceError(400,"Invalid request.");
  const chunks:Uint8Array[]=[];let total=0;
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){await reader.cancel();throw new ServiceError(413,"The request is too large.");}chunks.push(value);}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  try{const value=JSON.parse(new TextDecoder().decode(bytes));if(!value||typeof value!=="object"||Array.isArray(value))throw new Error();return value as T;}catch{throw new ServiceError(400,"Invalid JSON request.");}
}
export async function boundedFormData(request: Request, maxBytes = 6*1024*1024) {
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) throw new ServiceError(400,"Invalid form submission.");
  const reader=request.body?.getReader();
  if (!reader) throw new ServiceError(400,"Invalid form submission.");
  const chunks: ArrayBuffer[]=[]; let total=0;
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){await reader.cancel();throw new ServiceError(413,"The upload is too large. Choose an image under 5 MB.");}chunks.push(Uint8Array.from(value).buffer);}
  return new Request(request.url,{method:"POST",headers:{"content-type":request.headers.get("content-type")!},body:new Blob(chunks)}).formData();
}
async function keyedDigest(value:string) {
  const secret = process.env.ABUSE_HASH_SECRET;
  if (!secret || secret.length < 32) throw new ServiceError(503,"Submissions are temporarily unavailable.");
  const key = await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signed = await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signed),b=>b.toString(16).padStart(2,"0")).join("");
}
export async function networkFingerprint(request: Request, discriminator = "") {
  const forwardedIp = process.env.VERCEL === "1"
    ? request.headers.get("x-vercel-forwarded-for")
    : request.headers.get("cf-connecting-ip");
  const ip = forwardedIp || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!ip) throw new ServiceError(503,"Submissions are temporarily unavailable.");
  return keyedDigest(`network|${ip}|${discriminator}`);
}
export async function contentFingerprint(discriminator:string){
  return keyedDigest(`content|${discriminator}`);
}
export function clientIp(request:Request){
  const trusted=process.env.VERCEL==="1"?request.headers.get("x-vercel-forwarded-for"):request.headers.get("cf-connecting-ip");
  return (trusted||request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"").slice(0,64);
}
export async function verifyTurnstile(token: string, expectedHostname: string, request:Request, action:string, idempotencyKey:string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) throw new ServiceError(503,"Submissions are temporarily unavailable.");
  if(!token||token.length>2048||!validUuid(idempotencyKey))throw new ServiceError(400,"Please complete the verification and try again.","turnstile_rejected");
  const body=new URLSearchParams({secret,response:token,idempotency_key:idempotencyKey});
  const ip=clientIp(request);if(ip)body.set("remoteip",ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body,signal:AbortSignal.timeout(7000)}).catch(()=>null);
  if (!res?.ok) throw new ServiceError(503,"Verification is temporarily unavailable. Try again later.","turnstile_unavailable");
  const result = await res.json() as {success:boolean;hostname?:string;action?:string};
  if (!result.success || result.hostname !== expectedHostname || result.action!==action) throw new ServiceError(400,"Please complete the verification and try again.","turnstile_rejected");
}
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.provider!=="supabase" || !isAdminEmailAllowed(user.email) || user.aal!=="aal2") throw new ServiceError(403,"Access denied.","access_denied");
  return user;
}
export function errorResponse(error: unknown) {
  const e = error instanceof ServiceError ? error : new ServiceError(503,"Something went wrong. Try again later.");
  return Response.json({error:e.message},{status:e.status,headers:{"cache-control":"no-store"}});
}
