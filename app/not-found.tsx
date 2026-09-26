import Link from "next/link";
import {SiteShell} from "@/components/site-shell";
import {RecordTrigger} from "@/components/record-trigger";
import {RetroWindow} from "@/components/retro-window";
import {ReactionImage,BlinkSticker} from "@/components/old-web-art";

export default function NotFound(){return <SiteShell><main className="archive-desk grid min-h-[60dvh] place-items-center"><RetroWindow title="MISSING_CASE_FILE.EXE / 404" tone="red" className="w-full max-w-2xl" chrome="dialog"><div className="error-state-layout"><div data-qa-protected="404-copy"><div className="flex items-center gap-4"><BlinkSticker kind="warning"/><div><span className="archive-stamp">Missing page</span><h1 className="archive-heading mt-2">This page could not be found.</h1></div></div><p className="mt-5 text-sm leading-6">The address may be outdated, mistyped, or no longer available.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/" className="archive-button archive-button--paper">Back to index</Link><RecordTrigger className="archive-button archive-button--red"/></div></div><div className="error-state-art" aria-hidden="true"><ReactionImage name="sad-clown"/></div></div></RetroWindow></main></SiteShell>}
