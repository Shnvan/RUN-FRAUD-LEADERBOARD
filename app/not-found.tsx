import Link from "next/link";
import {SiteShell} from "@/components/site-shell";
import {RecordTrigger} from "@/components/record-trigger";
import {RetroWindow} from "@/components/retro-window";
import {ReactionImage,BlinkSticker} from "@/components/old-web-art";

export default function NotFound(){return <SiteShell><main className="archive-desk grid min-h-[60dvh] place-items-center"><RetroWindow title="MISSING_CASE_FILE.EXE / 404" tone="red" className="w-full max-w-2xl" chrome="dialog" overflow="visible"><ReactionImage name="sad-clown" className="absolute -right-14 -top-20 hidden w-40 sm:block"/><div className="flex items-center gap-4"><BlinkSticker kind="warning"/><div><span className="archive-stamp">No entry</span><h1 className="archive-heading mt-2">No public report yet.</h1></div></div><p className="mt-5 text-sm leading-6">This handle has no approved open loss reports in the index.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/" className="archive-button archive-button--paper">Back to index</Link><RecordTrigger className="archive-button archive-button--red text-[#251634]"/></div></RetroWindow></main></SiteShell>}
