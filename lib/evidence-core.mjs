import sharp from "sharp";

export const MAX_EVIDENCE_PIXELS=40_000_000;
export const MAX_EVIDENCE_EDGE=4096;
export const MAX_EVIDENCE_BYTES=5*1024*1024;

export async function sanitizeImageBuffer(source,expectedFormat){
  const image=sharp(source,{failOn:"warning",limitInputPixels:MAX_EVIDENCE_PIXELS,animated:false,sequentialRead:true});
  const meta=await image.metadata();
  if(meta.format!==expectedFormat||!meta.width||!meta.height||(meta.pages&&meta.pages>1)||meta.width*meta.height>MAX_EVIDENCE_PIXELS)throw new Error("invalid image");
  const output=await image.rotate().resize({width:MAX_EVIDENCE_EDGE,height:MAX_EVIDENCE_EDGE,fit:"inside",withoutEnlargement:true}).webp({quality:92,smartSubsample:true}).toBuffer();
  if(output.length>MAX_EVIDENCE_BYTES)throw new Error("sanitized image too large");
  return output;
}
