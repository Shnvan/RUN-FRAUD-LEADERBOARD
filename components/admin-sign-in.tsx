"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export function AdminSignIn({ url, publishableKey }: { url: string; publishableKey: string }) {
  const supabase = useMemo(() => createBrowserClient(url, publishableKey), [url, publishableKey]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSending(true);
    try {
      const { error: requestError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=%2Fadmin`,
          shouldCreateUser: false,
        },
      });
      if (requestError) throw requestError;
      setMessage("If this address is an existing administrator account, a sign-in link is on its way.");
    } catch {
      setError("We couldn’t send a sign-in link. Check the address and try again.");
    } finally {
      setSending(false);
    }
  }

  return <main className="mx-auto grid min-h-[65dvh] max-w-[1240px] place-items-center px-5 py-16 md:px-8">
    <form onSubmit={submit} className="w-full max-w-md space-y-6 border border-foreground/20 bg-card p-6 sm:p-8">
      <div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Private workspace</p><h1 className="mt-3 text-4xl font-semibold tracking-[-.07em]">Admin sign in</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Use the email address on the administrator allowlist. We’ll email you a one-time sign-in link.</p></div>
      <div><label htmlFor="admin-email" className="mb-2 block text-xs font-semibold">Administrator email</label><input id="admin-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)} className="h-12 w-full border border-foreground/25 bg-background px-3"/></div>
      {error&&<p role="alert" className="border border-foreground p-3 text-sm">{error}</p>}
      {message&&<p role="status" className="border border-foreground p-3 text-sm leading-5">{message}</p>}
      <button disabled={sending} className="min-h-12 w-full bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-50">{sending?"Sending…":"Email me a sign-in link"}</button>
    </form>
  </main>;
}
