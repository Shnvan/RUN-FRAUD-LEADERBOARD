import { dbRpc, errorResponse, fingerprint, sameOrigin, verifyTurnstile, ServiceError } from "@/lib/server";
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new ServiceError(403,"Request not allowed.");
    const {purchaseId,issueType,email,details,turnstileToken} = await request.json() as Record<string,string>;
    if (!/^[0-9a-f-]{36}$/i.test(purchaseId || "")) throw new ServiceError(400,"Choose a public record.");
    if (!["wrong_seller","wrong_amount","duplicate","not_a_purchase","refund_received","loss_resolved","other"].includes(issueType)) throw new ServiceError(400,"Choose an issue type.");
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ServiceError(400,"Enter an email address so we can follow up.");
    if ((details || "").length > 500) throw new ServiceError(400,"Keep details under 500 characters.");
    await verifyTurnstile(turnstileToken || "",new URL(request.url).hostname);
    const id = await dbRpc<string>("submit_correction",{p_purchase:purchaseId,p_issue:issueType,p_email:email,p_details:details || "",p_fingerprint:await fingerprint(request)});
    return Response.json({id},{status:201});
  } catch(error) {return errorResponse(error);}
}
