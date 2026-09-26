import test from "node:test";
import assert from "node:assert/strict";
import {canonicalItems,itemTotals,parseReportItems} from "../lib/report-items.mjs";

test("itemized reports calculate exact totals",()=>{
  const items=parseReportItems([{accountType:"chatgpt",quantity:"3",unitPrice:"0.01"},{accountType:"adobe",quantity:2,unitPrice:"1500"}]);
  assert.deepEqual(itemTotals(items),{accounts:5,total:"3000.03"});
});
test("item rows allow repeated products at different prices",()=>{
  const items=parseReportItems([{accountType:"chatgpt",quantity:1,unitPrice:"100"},{accountType:"chatgpt",quantity:2,unitPrice:"80"}]);
  assert.equal(items.length,2);assert.equal(itemTotals(items).total,"260.00");
});
test("item rows enforce limits and Other labels",()=>{
  assert.throws(()=>parseReportItems([]),/invalid_items/);
  assert.throws(()=>parseReportItems(Array.from({length:9},()=>({accountType:"chatgpt",quantity:1,unitPrice:"1"}))),/invalid_items/);
  assert.throws(()=>parseReportItems([{accountType:"other",quantity:1,unitPrice:"1",otherAccountType:"x"}]),/invalid_other/);
  assert.equal(parseReportItems([{accountType:"other",quantity:1,unitPrice:"1",otherAccountType:"  Custom  app "}])[0].otherAccountType,"Custom app");
});
test("duplicate fingerprint representation ignores row order",()=>{
  const a=parseReportItems([{accountType:"claude",quantity:1,unitPrice:"2"},{accountType:"chatgpt",quantity:2,unitPrice:"1"}]);
  assert.equal(canonicalItems(a),canonicalItems([...a].reverse()));
});
