import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request:NextRequest){
  const url=process.env.SUPABASE_URL?.replace(/\/$/,"");
  const key=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY;
  if(!url||!key)return NextResponse.next({request});
  let response=NextResponse.next({request});
  const supabase=createServerClient(url,key,{cookieOptions:{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/"},cookies:{getAll:()=>request.cookies.getAll(),setAll(values){values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,{...options,httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/"}));}}});
  await supabase.auth.getUser();
  return response;
}

export const config={matcher:["/((?!_next/static|_next/image|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]};
