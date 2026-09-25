import { redirect } from "next/navigation";
import { getCurrentUser, chatGPTSignInPath, isAdminEmailAllowed } from "@/app/chatgpt-auth";
import { SiteShell } from "@/components/site-shell";
import { AdminClient } from "@/components/admin-client";
import { AdminSignIn } from "@/components/admin-sign-in";
export const dynamic="force-dynamic";
export default async function AdminPage(){const user=await getCurrentUser();if(!user){if(process.env.SUPABASE_URL)return <SiteShell><AdminSignIn/></SiteShell>;redirect(chatGPTSignInPath("/admin"));}if(user.provider!=="supabase"||!isAdminEmailAllowed(user.email))return <SiteShell><main className="mx-auto max-w-[1240px] px-5 py-24 md:px-8"><p className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Private workspace</p><h1 className="mt-4 text-5xl font-semibold tracking-[-.07em]">Access denied.</h1><p className="mt-4 text-sm text-muted-foreground">This account is not on the administrator allowlist.</p></main></SiteShell>;if(user.aal!=="aal2")return <SiteShell><AdminSignIn initialEmail={user.email} authenticated/></SiteShell>;return <SiteShell><AdminClient email={user.email}/></SiteShell>}
