import "server-only";
import { ServiceError } from "@/lib/server";
import { MAX_EVIDENCE_BYTES, sanitizeAvatarBuffer, sanitizeImageBuffer } from "@/lib/evidence-core.mjs";

const ALLOWED=new Set(["image/jpeg","image/png","image/webp"]);
const FORMAT_BY_MIME:Record<string,string>={"image/jpeg":"jpeg","image/png":"png","image/webp":"webp"};
export async function sanitizeEvidence(file:File):Promise<File>{
  if(file.size<=0||file.size>MAX_EVIDENCE_BYTES||!ALLOWED.has(file.type))throw new ServiceError(400,"Choose a JPG, PNG, or WebP image under 5 MB.","evidence_rejected");
  const source=Buffer.from(await file.arrayBuffer());
  try{
    const output=await sanitizeImageBuffer(source,FORMAT_BY_MIME[file.type]);
    return new File([new Uint8Array(output)],"evidence.webp",{type:"image/webp"});
  }catch{throw new ServiceError(400,"That image is malformed, animated, or too large to process.","evidence_rejected");}
}
export async function sanitizeSellerAvatar(file:File):Promise<File>{
  if(file.size<=0||file.size>MAX_EVIDENCE_BYTES||!ALLOWED.has(file.type))throw new ServiceError(400,"Choose a JPG, PNG, or WebP image under 5 MB.","avatar_rejected");
  try{
    const output=await sanitizeAvatarBuffer(Buffer.from(await file.arrayBuffer()),FORMAT_BY_MIME[file.type]);
    return new File([new Uint8Array(output)],"avatar.webp",{type:"image/webp"});
  }catch{throw new ServiceError(400,"That image is malformed, animated, or too large to process.","avatar_rejected");}
}
