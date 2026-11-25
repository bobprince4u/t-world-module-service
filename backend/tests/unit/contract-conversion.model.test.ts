import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { ContractConversion } from "../../src/models/contract-conversion.model.js";

const validConversion = {
  userId: new mongoose.Types.ObjectId(),
  fromToken: "TWT",
  toAsset: "MOCK_USDT",
  amount: 10,
  exchangeRate: 1,
  txHashMock: "mock-tx-123",
  status: "SUCCESS",
};

test("accepts a valid contract conversion", async () => {
  const conversion = new ContractConversion(validConversion);

  await assert.doesNotReject(conversion.validate());
});

test("rejects an unsupported conversion asset", async () => {
  const conversion = new ContractConversion({
    ...validConversion,
    toAsset: "BTC",
  });

  await assert.rejects(
    conversion.validate(),
    (error: { errors?: Record<string, unknown> }) =>
      Boolean(error.errors?.toAsset),
  );
});

test("rejects a non-positive conversion amount", async () => {
  const conversion = new ContractConversion({
    ...validConversion,
    amount: 0,
  });

  await assert.rejects(
    conversion.validate(),
    (error: { errors?: Record<string, unknown> }) =>
      Boolean(error.errors?.amount),
  );
});
