import test from "node:test";
import assert from "node:assert/strict";
import {COMPACT_BUYER_REPORT_NOTICE,FULL_BUYER_REPORT_NOTICE,validBuyerAttestation} from "../lib/buyer-report-notice.mjs";

test("purchase attestation accepts only the explicit true value",()=>{
  assert.equal(validBuyerAttestation("true"),true);
  for(const value of [undefined,null,"","false",true,1])assert.equal(validBuyerAttestation(value),false);
});

test("buyer report notices describe claims and calculated totals accurately",()=>{
  assert.match(FULL_BUYER_REPORT_NOTICE,/does not independently verify every transaction/);
  assert.match(FULL_BUYER_REPORT_NOTICE,/calculations from approved, still-open reports/);
  assert.match(COMPACT_BUYER_REPORT_NOTICE,/not independently verified/);
  assert.doesNotMatch(`${FULL_BUYER_REPORT_NOTICE} ${COMPACT_BUYER_REPORT_NOTICE}`,/verified purchases|proven fraud|verified sales/i);
});
