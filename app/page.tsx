import { HomeClient } from "@/components/home-client";
import { submissionsConfigured } from "@/lib/server";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Home({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  // Some customized Supabase email templates redirect to the site URL instead
  // of the requested callback. Finish the same PKCE flow if a code lands here.
  const { code } = await searchParams;
  if (code) redirect(`/auth/callback?code=${encodeURIComponent(code)}`);
  const siteKey=process.env.TURNSTILE_SITE_KEY?.trim()||"";
  return <HomeClient siteKey={siteKey} ready={submissionsConfigured()&&Boolean(siteKey)}/>;
}
