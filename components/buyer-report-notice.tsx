import {COMPACT_BUYER_REPORT_NOTICE,FULL_BUYER_REPORT_NOTICE} from "@/lib/buyer-report-notice.mjs";

export function BuyerReportNotice({variant="full",className=""}:{variant?:"full"|"compact";className?:string}){
  if(variant==="compact")return <p className={`text-xs leading-5 text-muted-foreground ${className}`.trim()}>{COMPACT_BUYER_REPORT_NOTICE}</p>;
  return <aside role="note" aria-label="Important notice about buyer reports" className={`border-2 border-foreground bg-[var(--warm-paper)] p-4 text-[var(--classic-ink)] ${className}`.trim()}>
    <p className="gallery-label">Important notice about buyer reports</p>
    <p className="mt-2 text-xs leading-5">{FULL_BUYER_REPORT_NOTICE}</p>
  </aside>;
}
