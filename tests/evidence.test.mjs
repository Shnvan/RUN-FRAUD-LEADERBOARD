import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { MAX_EVIDENCE_EDGE, sanitizeAvatarBuffer, sanitizeImageBuffer } from "../lib/evidence-core.mjs";

test("evidence is re-encoded as bounded metadata-free WebP",async()=>{
  const input=await sharp({create:{width:5000,height:1200,channels:3,background:"#eee"}}).jpeg().withMetadata({orientation:6,exif:{IFD0:{Copyright:"private"}}}).toBuffer();
  const output=await sanitizeImageBuffer(input,"jpeg");
  const meta=await sharp(output).metadata();
  assert.equal(meta.format,"webp");
  assert.ok(Math.max(meta.width||0,meta.height||0)<=MAX_EVIDENCE_EDGE);
  assert.equal(meta.exif,undefined);
  assert.equal(meta.icc,undefined);
});

test("evidence rejects a forged declared image type",async()=>{
  const png=await sharp({create:{width:4,height:4,channels:3,background:"white"}}).png().toBuffer();
  await assert.rejects(()=>sanitizeImageBuffer(png,"jpeg"),/invalid image/);
});

test("evidence rejects multi-page input",async()=>{
  const frames=["A","B"].map(text=>({text:{text,width:8,height:8,channels:4,rgba:true}}));
  const animated=await sharp(frames,{join:{animated:true}}).webp({loop:0,delay:[100,100]}).toBuffer();
  await assert.rejects(()=>sanitizeImageBuffer(animated,"webp"));
});

test("seller avatar is centrally cropped and metadata-free",async()=>{
  const input=await sharp({create:{width:1200,height:600,channels:3,background:"#222"}}).jpeg().withMetadata({orientation:6,exif:{IFD0:{Copyright:"private"}}}).toBuffer();
  const output=await sanitizeAvatarBuffer(input,"jpeg");const meta=await sharp(output).metadata();
  assert.equal(meta.format,"webp");assert.equal(meta.width,512);assert.equal(meta.height,512);assert.equal(meta.exif,undefined);assert.equal(meta.icc,undefined);
});

test("seller avatar rejects animation and forged MIME declarations",async()=>{
  const png=await sharp({create:{width:4,height:4,channels:3,background:"white"}}).png().toBuffer();
  await assert.rejects(()=>sanitizeAvatarBuffer(png,"jpeg"),/invalid image/);
  const animated=await sharp(["A","B"].map(text=>({text:{text,width:8,height:8,channels:4,rgba:true}})),{join:{animated:true}}).webp({loop:0,delay:[100,100]}).toBuffer();
  await assert.rejects(()=>sanitizeAvatarBuffer(animated,"webp"));
});
