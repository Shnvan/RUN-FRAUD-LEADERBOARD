import { redirect } from "next/navigation";
import { getChatGPTUser, chatGPTSignInPath } from "@/app/chatgpt-auth";
import { SiteShell } from "@/components/site-shell";
import { AdminClient } from "@/components/admin-client";
export const dynamic="force-dynamic";
export default async function AdminPage(){const user=await getChatGPTUser();if(!user)redirect(chatGPTSignInPath("/admin"));const allowed=(process.env.ADMIN_EMAILS||"").split(",").map(x=>x.trim().toLowerCase());if(!allowed.includes(user.email.toLowerCase()))return <SiteShell><main className="mx-auto max-w-[1160px] px-5 py-16"><h1 className="text-2xl font-semibold">Access denied</h1></main></SiteShell>;return <SiteShell><AdminClient email={user.email}/></SiteShell>}
