import test from "node:test";
import assert from "node:assert/strict";
import {parseAccountTypes} from "../lib/account-types.mjs";

test("account types are distinct and sorted",()=>{
  assert.deepEqual(parseAccountTypes('["gemini","chatgpt","gemini"]',"").slugs,["chatgpt","gemini"]);
});
test("account types require at least one known value",()=>{
  assert.throws(()=>parseAccountTypes("[]",""),/invalid_account_types/);
  assert.throws(()=>parseAccountTypes('["unknown"]',""),/invalid_account_types/);
});
test("Other requires a bounded normalized custom label",()=>{
  assert.deepEqual(parseAccountTypes('["other"]',"  Custom   service  "),{slugs:["other"],other:"Custom service"});
  assert.throws(()=>parseAccountTypes('["other"]',"x"),/invalid_other_account_type/);
  assert.throws(()=>parseAccountTypes('["chatgpt"]',"Custom"),/invalid_other_account_type/);
});
