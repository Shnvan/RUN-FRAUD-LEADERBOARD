import { redirect } from "next/navigation";
import { getCurrentUser, chatGPTSignInPath, isAdminEmailAllowed } from "@/app/chatgpt-auth";
import { SiteShell } from "@/components/site-shell";
import { AdminClient } from "@/components/admin-client";
import { AdminSignIn } from "@/components/admin-sign-in";
import { RetroWindow } from "@/components/retro-window";
export const dynamic="force-dynamic";
export default async function AdminPage(){const user=await getCurrentUser();if(!user){if(process.env.SUPABASE_URL)return <SiteShell><AdminSignIn/></SiteShell>;redirect(chatGPTSignInPath("/admin"));}if(user.provider!=="supabase"||!isAdminEmailAllowed(user.email))return <SiteShell><main className="archive-desk grid min-h-[60dvh] place-items-center"><RetroWindow title="PRIVATE WORKSPACE / ACCESS DENIED" tone="red" className="w-full max-w-lg"><h1 className="archive-heading">Access denied.</h1><p className="mt-4 text-sm">This account is not on the administrator allowlist.</p></RetroWindow></main></SiteShell>;if(user.aal!=="aal2")return <SiteShell><AdminSignIn initialEmail={user.email} authenticated/></SiteShell>;return <SiteShell><AdminClient email={user.email}/></SiteShell>}
