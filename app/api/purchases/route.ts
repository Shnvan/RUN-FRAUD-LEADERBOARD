// Historical purchases remain stored, but ordinary purchase submissions are closed.
export async function POST(){
  return Response.json({error:"Purchase-only submissions are closed. Use the unresolved loss report form."},
    {status:410,headers:{"cache-control":"no-store"}});
}
