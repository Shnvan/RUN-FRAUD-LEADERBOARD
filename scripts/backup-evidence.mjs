import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const destination=process.argv[2];
const url=process.env.SUPABASE_URL?.replace(/\/$/,"");
const key=process.env.SUPABASE_SECRET_KEY;
const bucket=process.env.SUPABASE_EVIDENCE_BUCKET;
if(!destination||!url||!key||!bucket)throw new Error("Backup configuration is incomplete.");
await mkdir(destination,{recursive:true});
let offset=0,total=0;
while(true){
  const list=await fetch(`${url}/storage/v1/object/list/${encodeURIComponent(bucket)}`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify({prefix:"",limit:100,offset,sortBy:{column:"name",order:"asc"}})});
  if(!list.ok)throw new Error(`Evidence listing failed (${list.status}).`);
  const objects=await list.json();if(!Array.isArray(objects)||objects.length===0)break;
  for(const object of objects){const name=object&&typeof object.name==="string"?object.name:"";if(!/^[0-9a-f-]{36}\.webp$/i.test(name))continue;const response=await fetch(`${url}/storage/v1/object/authenticated/${encodeURIComponent(bucket)}/${encodeURIComponent(name)}`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});if(!response.ok)throw new Error(`Evidence download failed (${response.status}).`);await writeFile(path.join(destination,name),Buffer.from(await response.arrayBuffer()));total++;}
  offset+=objects.length;if(objects.length<100)break;
}
await writeFile(path.join(destination,"manifest.json"),JSON.stringify({createdAt:new Date().toISOString(),objects:total},null,2));
