import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenConversionSchema } from "../../src/validators/token-conversion.validation.js";

test("accepts valid MOCK_USDT conversion input", () => {
  assert.equal(
    tokenConversionSchema.safeParse({
      toAsset: "MOCK_USDT",
      amount: 100,
    }).success,
    true,
  );
});

test("accepts valid MOCK_ETH conversion input", () => {
  assert.equal(
    tokenConversionSchema.safeParse({
      toAsset: "MOCK_ETH",
      amount: 200,
    }).success,
    true,
  );
});

test("rejects unsupported assets", () => {
  assert.equal(
    tokenConversionSchema.safeParse({
      toAsset: "BTC",
      amount: 100,
    }).success,
    false,
  );
});

test("rejects missing or non-positive amounts", () => {
  assert.equal(
    tokenConversionSchema.safeParse({ toAsset: "MOCK_USDT" }).success,
    false,
  );

  assert.equal(
    tokenConversionSchema.safeParse({
      toAsset: "MOCK_USDT",
      amount: 0,
    }).success,
    false,
  );
});
