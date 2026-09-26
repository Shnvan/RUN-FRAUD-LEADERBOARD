import {notFound} from "next/navigation";
import {AdminClient,type Queue} from "@/components/admin-client";
import {SiteShell} from "@/components/site-shell";

const now="2026-09-27T00:00:00Z",sellerId="00000000-0000-4000-8000-000000000011",purchaseId="00000000-0000-4000-8000-000000000021";
const item={id:"00000000-0000-4000-8000-000000000031",account_type_slug:"chatgpt",custom_label:null,quantity:8,unit_price:"1250.00",total_amount:"10000.00",sort_order:0};
const fixture:Queue={
  pending:[{id:purchaseId,seller_id:sellerId,buyer_username:"qa_buyer",quantity:null,unit_price:null,total_amount:"10000.00",loss_issue:"refund_not_received",loss_details:"Controlled local fixture for moderation layout testing.",reported_unresolved_amount:"10000.00",unresolved_amount:"10000.00",loss_status:"pending",flags:["review_required"],evidence_path:null,evidence_sanitized:false,linked_duplicate_id:null,submitter_fingerprint:"qa-fixture-fingerprint",created_at:now,sellers:{username:"very_long_seller_handle_for_responsive_quality"},purchase_account_types:[],purchase_items:[item]}],
  losses:[{id:"00000000-0000-4000-8000-000000000022",buyer_username:"qa_buyer",quantity:null,unit_price:null,total_amount:"10000.00",loss_issue:"not_delivered",loss_details:"Approved local fixture with a large unresolved amount.",reported_unresolved_amount:"10000.00",unresolved_amount:"987654321.12",loss_status:"open",moderation_reason:"Fixture review",created_at:now,sellers:{username:"very_long_seller_handle_for_responsive_quality"},purchase_account_types:[],purchase_items:[item]}],
  corrections:[{id:"00000000-0000-4000-8000-000000000041",purchase_id:purchaseId,issue_type:"amount_incorrect",contact_email:"fixture@example.invalid",details:"Controlled correction fixture.",created_at:now}],
  sellers:[{id:sellerId,username:"very_long_seller_handle_for_responsive_quality",status:"active",avatar_path:null,avatar_updated_at:null,created_at:now},{id:"00000000-0000-4000-8000-000000000012",username:"second_fixture_seller",status:"suspended",avatar_path:null,avatar_updated_at:null,created_at:now}],
  audit:[{id:1,actor:"fixture@example.invalid",action:"approve",target_type:"purchase",reason:"Fixture audit event",created_at:now}],
  blocked:[{fingerprint:"qa-fixture-fingerprint",blocked_at:now,blocked_by:"fixture@example.invalid"}],
  security:[{id:1,event_type:"mfa_step_up",outcome:"success",request_id:"qa-request",detail:{fixture:true},created_at:now}],
  accountTypes:[{slug:"chatgpt",label:"ChatGPT"},{slug:"other",label:"Other"}],
};

export default function AdminQaFixture(){
  if(process.env.NODE_ENV!=="development")notFound();
  return <SiteShell><AdminClient email="fixture@example.invalid" fixture={fixture}/></SiteShell>;
}
