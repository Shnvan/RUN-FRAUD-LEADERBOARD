/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Factor={id:string;name:string};
type Stage="login"|"loading"|"enroll"|"mfa";
type AuthReply={state?:"enroll"|"mfa";factors?:Factor[];factorId?:string;qrCode?:string;secret?:string;error?:string};

export function AdminSignIn({initialEmail="",authenticated=false}:{initialEmail?:string;authenticated?:boolean}){
  const router=useRouter();
  const [stage,setStage]=useState<Stage>(authenticated?"loading":"login");
  const [email,setEmail]=useState(initialEmail),[password,setPassword]=useState(""),[code,setCode]=useState("");
  const [factors,setFactors]=useState<Factor[]>([]),[factorId,setFactorId]=useState(""),[qrCode,setQrCode]=useState(""),[secret,setSecret]=useState("");
  const [error,setError]=useState(""),[busy,setBusy]=useState(false);
  async function read(response:Response){const data=await response.json() as AuthReply;if(!response.ok)throw new Error(data.error||"Sign-in could not be completed.");return data;}
  async function beginEnrollment(){setBusy(true);setError("");try{const data=await read(await fetch("/api/auth/mfa/enroll",{method:"POST"}));if(data.state==="mfa"){setFactors(data.factors||[]);setFactorId(data.factors?.[0]?.id||"");setStage("mfa");}else{setFactorId(data.factorId||"");setQrCode(data.qrCode||"");setSecret(data.secret||"");setStage("enroll");}}catch(e){setError(e instanceof Error?e.message:"MFA setup failed.");setStage("login");}finally{setBusy(false)}}
  // This bootstrap intentionally runs only when the server-provided auth state changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{if(!authenticated)return;const timer=window.setTimeout(()=>void beginEnrollment(),0);return()=>window.clearTimeout(timer);},[authenticated]);
  async function login(event:React.FormEvent){event.preventDefault();setBusy(true);setError("");try{const data=await read(await fetch("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password})}));setPassword("");if(data.state==="mfa"){setFactors(data.factors||[]);setFactorId(data.factors?.[0]?.id||"");setStage("mfa");}else await beginEnrollment();}catch(e){setError(e instanceof Error?e.message:"Sign-in failed.");}finally{setBusy(false)}}
  async function verify(event:React.FormEvent){event.preventDefault();setBusy(true);setError("");try{await read(await fetch("/api/auth/mfa/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({factorId,code})}));router.push("/admin");router.refresh();}catch(e){setError(e instanceof Error?e.message:"The authenticator code was not accepted.");setCode("");}finally{setBusy(false)}}
  return <main className="mx-auto grid min-h-[65dvh] max-w-[1240px] place-items-center px-5 py-16 md:px-8"><div className="retro-window retro-window--navy w-full max-w-md bg-card p-6 sm:p-8">
    <div className="retro-titlebar -mx-6 -mt-6 mb-5 sm:-mx-8 sm:-mt-8"><span className="retro-titlebar__dots" aria-hidden="true"><i/><i/><i/></span>PRIVATE WORKSPACE / AUTHENTICATION</div><p className="gallery-label text-muted-foreground">Admin access</p><h1 className="archive-heading mt-3">Admin sign in</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Password and an authenticator code are required. Public account creation is disabled.</p>
    {stage==="login"&&<form onSubmit={login} className="mt-7 space-y-5"><div><label htmlFor="admin-email" className="mb-2 block text-xs font-semibold">Administrator email</label><input id="admin-email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} className="h-12 w-full border border-foreground/25 bg-background px-3"/></div><div><label htmlFor="admin-password" className="mb-2 block text-xs font-semibold">Password</label><input id="admin-password" type="password" autoComplete="current-password" required minLength={12} maxLength={256} value={password} onChange={e=>setPassword(e.target.value)} className="h-12 w-full border border-foreground/25 bg-background px-3"/></div><button disabled={busy} className="min-h-12 w-full bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-50">{busy?"Checking…":"Continue"}</button></form>}
    {stage==="loading"&&<p role="status" className="mt-7 text-sm">Loading administrator security…</p>}
    {stage==="enroll"&&<form onSubmit={verify} className="mt-7 space-y-5"><div className="border border-foreground/20 p-4"><p className="text-sm font-semibold">Set up an authenticator</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Scan this code, then enter the six-digit code. After signing in, add a second factor from the Security section.</p>{qrCode&&<img src={qrCode} alt="Authenticator enrollment QR code" className="mx-auto mt-4 size-48"/>}<p className="mt-3 break-all font-mono text-[11px]">Manual key: {secret}</p></div><CodeInput code={code} setCode={setCode}/><button disabled={busy} className="min-h-12 w-full bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-50">{busy?"Verifying…":"Verify and sign in"}</button></form>}
    {stage==="mfa"&&<form onSubmit={verify} className="mt-7 space-y-5">{factors.length>1&&<div><label htmlFor="admin-factor" className="mb-2 block text-xs font-semibold">Authenticator</label><select id="admin-factor" value={factorId} onChange={e=>setFactorId(e.target.value)} className="h-12 w-full border border-foreground/25 bg-background px-3">{factors.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></div>}<CodeInput code={code} setCode={setCode}/><button disabled={busy} className="min-h-12 w-full bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-50">{busy?"Verifying…":"Sign in"}</button></form>}
    {error&&<p role="alert" className="mt-5 border border-foreground p-3 text-sm">{error}</p>}
  </div></main>;
}

function CodeInput({code,setCode}:{code:string;setCode:(value:string)=>void}){return <div><label htmlFor="admin-code" className="mb-2 block text-xs font-semibold">Six-digit authenticator code</label><input id="admin-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))} className="h-12 w-full border border-foreground/25 bg-background px-3 font-mono text-lg tracking-[.3em]"/></div>}
