import { HomeClient } from "@/components/home-client";
import { submissionsConfigured } from "@/lib/server";
export const dynamic = "force-dynamic";
export default function Home() {return <HomeClient siteKey={process.env.TURNSTILE_SITE_KEY||""} ready={submissionsConfigured()}/>}
