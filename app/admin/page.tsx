import { redirect } from "next/navigation";
import { getChatGPTUser, chatGPTSignInPath } from "@/app/chatgpt-auth";
import { SiteShell } from "@/components/site-shell";
import { AdminClient } from "@/components/admin-client";
export const dynamic="force-dynamic";
export default async function AdminPage(){const user=await getChatGPTUser();if(!user)redirect(chatGPTSignInPath("/admin"));const allowed=(process.env.ADMIN_EMAILS||"").split(",").map(x=>x.trim().toLowerCase());if(!allowed.includes(user.email.toLowerCase()))return <SiteShell><main className="mx-auto max-w-[1240px] px-5 py-24 md:px-8"><p className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Private workspace</p><h1 className="mt-4 text-5xl font-semibold tracking-[-.07em]">Access denied.</h1><p className="mt-4 text-sm text-muted-foreground">This account is not on the administrator allowlist.</p></main></SiteShell>;return <SiteShell><AdminClient email={user.email}/></SiteShell>}
