import { HomeClient } from "@/components/home-client";
import { submissionsConfigured } from "@/lib/server";
export const dynamic = "force-dynamic";
export default function Home() {
  const siteKey=process.env.TURNSTILE_SITE_KEY?.trim()||"";
  return <HomeClient siteKey={siteKey} ready={submissionsConfigured()&&Boolean(siteKey)}/>;
}
