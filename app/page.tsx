import { HomeClient } from "@/components/home-client";
import { configured } from "@/lib/server";
export const dynamic = "force-dynamic";
export default function Home() {return <HomeClient siteKey={process.env.TURNSTILE_SITE_KEY||""} ready={configured() && Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.ABUSE_HASH_SECRET)}/>}
