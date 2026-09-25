import test from "node:test";
import assert from "node:assert/strict";
import { money, normalizeHandle, validHandle, validPrice, validPurchaseDate, validQuantity } from "../lib/domain.ts";

test("historical amounts format without floating-point conversion",()=>{
  assert.equal(money("3000.00"),"₱3,000");
  assert.equal(money("1500.25"),"₱1,500.25");
  assert.equal(money("9007199254740993.00"),"₱9,007,199,254,740,993");
});
test("seller handles normalize to one identity",()=>{
  assert.equal(normalizeHandle(" @Seller123 "),"seller123");
  assert.ok(validHandle("@Seller123"));
  assert.equal(validHandle("person@example.com"),false);
});
test("server-side quantity, price and date rules reject malformed values",()=>{
  assert.ok(validQuantity("3"));assert.equal(validQuantity("2.5"),false);
  assert.ok(validPrice("1000.25"));assert.equal(validPrice("0"),false);assert.equal(validPrice("1000.999"),false);
  assert.equal(validPurchaseDate("2026-02-30"),false);
  assert.equal(validPurchaseDate("2099-01-01"),false);
});
