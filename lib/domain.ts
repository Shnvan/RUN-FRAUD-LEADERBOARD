export const money = (value: string | number | null | undefined) => {
  const raw = typeof value === "number" ? value.toFixed(2) : String(value ?? "0");
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(raw);
  if (!match) return "₱0";
  const whole = new Intl.NumberFormat("en-PH").format(BigInt(match[2]));
  const cents = (match[3] || "").padEnd(2,"0");
  return `${match[1]}₱${whole}${cents && cents !== "00" ? `.${cents}` : ""}`;
};

export const normalizeHandle = (value: string) => value.trim().replace(/^@+/, "").toLowerCase();
export const validHandle = (value: string) => /^[a-z0-9._-]{2,64}$/.test(normalizeHandle(value));
export const validPrice = (value: string) => /^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/.test(value) && Number(value) >= .01 && Number(value) <= 1000000;
export const validQuantity = (value: string) => /^[1-9]\d{0,4}$/.test(value) && Number(value) <= 10000;
export const cents = (value:string):bigint|null => {
  const match=/^(0|[1-9]\d{0,13})(?:\.(\d{1,2}))?$/.exec(value);
  return match ? BigInt(match[1])*BigInt(100)+BigInt((match[2]||"").padEnd(2,"0")) : null;
};
export const validUnresolvedAmount = (amount:string,quantity:string,unitPrice:string) => {
  const value=cents(amount),price=cents(unitPrice);
  return validQuantity(quantity) && validPrice(unitPrice) && value!==null && price!==null && value>BigInt(0) && value<=BigInt(quantity)*price;
};
export const manilaToday = () => new Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit"}).format(new Date());
export const validPurchaseDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value && value >= "2000-01-01" && value <= manilaToday();

export type SellerLossStats = { id:string; username:string; normalized_username:string; unresolved_amount:string; report_count:number };
export type PublicLoss = { id:string; seller_id:string; username:string; normalized_username:string; purchase_date:string; quantity:number; unit_price:string; total_amount:string; unresolved_amount:string; loss_issue:"not_delivered"|"refund_not_received"|"other_unresolved"; created_at:string };
export type LossOverview = { totals:{unresolved_amount:string;report_count:number;visible_sellers:number}; leaders:SellerLossStats[]; recent:PublicLoss[] };
