import {mkdir,writeFile} from "node:fs/promises";
import path from "node:path";

const destination=process.argv[2];
const bucketEnv=process.argv[3]||"SUPABASE_EVIDENCE_BUCKET";
const url=process.env.SUPABASE_URL?.replace(/\/$/,"");
const key=process.env.SUPABASE_SECRET_KEY;
const bucket=process.env[bucketEnv];
if(!destination||!url||!key||!bucket)throw new Error(`Backup configuration is incomplete for ${bucketEnv}.`);
await mkdir(destination,{recursive:true});
const objectNames=[];
async function walk(prefix=""){
  let offset=0;
  while(true){
    const response=await fetch(`${url}/storage/v1/object/list/${encodeURIComponent(bucket)}`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify({prefix,limit:100,offset,sortBy:{column:"name",order:"asc"}})});
    if(!response.ok)throw new Error(`Storage listing failed for ${bucket} (${response.status}).`);
    const objects=await response.json();if(!Array.isArray(objects)||objects.length===0)break;
    for(const object of objects){
      const name=object&&typeof object.name==="string"?object.name:"";if(!name)continue;
      const objectPath=prefix?`${prefix}/${name}`:name;
      if(object.id===null||object.metadata===null)await walk(objectPath);
      else if(objectPath.endsWith(".webp"))objectNames.push(objectPath);
    }
    offset+=objects.length;if(objects.length<100)break;
  }
}
await walk();
for(const objectPath of objectNames){
  const response=await fetch(`${url}/storage/v1/object/authenticated/${encodeURIComponent(bucket)}/${objectPath.split("/").map(encodeURIComponent).join("/")}`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
  if(!response.ok)throw new Error(`Storage download failed for ${bucket} (${response.status}).`);
  const target=path.join(destination,...objectPath.split("/"));await mkdir(path.dirname(target),{recursive:true});await writeFile(target,Buffer.from(await response.arrayBuffer()));
}
await writeFile(path.join(destination,"manifest.json"),JSON.stringify({createdAt:new Date().toISOString(),bucket,objects:objectNames.length,paths:objectNames},null,2));
