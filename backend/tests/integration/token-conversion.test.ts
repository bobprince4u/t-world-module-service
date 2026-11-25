import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import { User } from "../../src/models/user.model.js";
import { TokenTransaction } from "../../src/models/token-transaction.model.js";
import { ContractConversion } from "../../src/models/contract-conversion.model.js";
import { convertTokens } from "../../src/services/tokens/convert-tokens.js";
import { withdrawTokens } from "../../src/services/tokens/withdraw-tokens.js";

let replicaSet: MongoMemoryReplSet;
let userId: string;

before(async () => {
  replicaSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
  });

  await mongoose.connect(replicaSet.getUri(), {
    dbName: "t_world_conversion_test",
  });
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    TokenTransaction.deleteMany({}),
    ContractConversion.deleteMany({}),
  ]);

  const user = await User.create({
    firebaseUid: "conversion-user",
    email: "conversion@example.com",
    role: "user",
    tokenBalance: 250,
  });

  userId = user.id;
});

after(async () => {
  await mongoose.disconnect();
  await replicaSet.stop();
});

test("converts tokens to MOCK_USDT and records the conversion and ledger entry", async () => {
  const result = await convertTokens({
    userId,
    toAsset: "MOCK_USDT",
    amount: 100,
  });

  assert.equal(result.convertedAmount, "1 MOCK_USDT");
  assert.equal(typeof result.txHashMock, "string");
  assert.equal(result.tokenBalance, 150);

  const user = await User.findById(userId).lean();
  const conversions = await ContractConversion.find({ userId }).lean();
  const transactions = await TokenTransaction.find({ userId }).lean();

  assert.equal(user?.tokenBalance, 150);
  assert.equal(conversions.length, 1);
  assert.equal(conversions[0].toAsset, "MOCK_USDT");
  assert.equal(conversions[0].amount, 100);
  assert.equal(conversions[0].exchangeRate, 0.01);
  assert.equal(conversions[0].status, "SUCCESS");

  assert.equal(transactions.length, 1);
  assert.equal(transactions[0].type, "CONVERT");
  assert.equal(transactions[0].amount, 100);
  assert.equal(transactions[0].balanceAfter, 150);
});

test("converts tokens to MOCK_ETH using the assessment's mock rate", async () => {
  const result = await convertTokens({
    userId,
    toAsset: "MOCK_ETH",
    amount: 200,
  });

  assert.equal(result.convertedAmount, "0.01 MOCK_ETH");
  assert.equal(result.tokenBalance, 50);

  const conversion = await ContractConversion.findOne({ userId }).lean();

  assert.equal(conversion?.toAsset, "MOCK_ETH");
  assert.equal(conversion?.exchangeRate, 0.00005);
});

test("rejects conversion when the user has insufficient tokens", async () => {
  await assert.rejects(
    convertTokens({
      userId,
      toAsset: "MOCK_USDT",
      amount: 300,
    }),
    /Insufficient token balance/,
  );

  const user = await User.findById(userId).lean();

  assert.equal(user?.tokenBalance, 250);
  assert.equal(await ContractConversion.countDocuments({ userId }), 0);
  assert.equal(await TokenTransaction.countDocuments({ userId }), 0);
});

test("withdraws converted assets and preserves the original conversion hash", async () => {
  const originalHash = `0x${"a".repeat(64)}`;

  await ContractConversion.create({
    userId,
    fromToken: "TOKEN",
    toAsset: "MOCK_USDT",
    amount: 100,
    exchangeRate: 0.01,
    txHashMock: originalHash,
    status: "SUCCESS",
  });

  const result = await withdrawTokens({ userId });

  assert.equal(result.status, "SUCCESS");
  assert.equal(result.network, "Ethereum");
  assert.match(result.txHashMock, /^0x[a-f0-9]{64}$/);

  const conversion = await ContractConversion.findOne({ userId }).lean();

  assert.equal(conversion?.status, "SUCCESS");
  assert.equal(conversion?.txHashMock, originalHash);
  assert.equal(conversion?.withdrawalStatus, "WITHDRAWN");
  assert.equal(conversion?.withdrawalNetwork, "Ethereum");
  assert.equal(conversion?.withdrawalTxHashMock, result.txHashMock);
  assert.ok(conversion?.withdrawnAt instanceof Date);
});

test("rejects a second withdrawal of already withdrawn assets", async () => {
  await ContractConversion.create({
    userId,
    fromToken: "TOKEN",
    toAsset: "MOCK_USDT",
    amount: 100,
    exchangeRate: 0.01,
    txHashMock: `0x${"b".repeat(64)}`,
    status: "SUCCESS",
  });

  await withdrawTokens({ userId });

  await assert.rejects(
    withdrawTokens({ userId }),
    /No eligible converted assets to withdraw/,
  );
});

test("rejects withdrawal when no eligible conversions exist", async () => {
  await assert.rejects(
    withdrawTokens({ userId }),
    /No eligible converted assets to withdraw/,
  );
});

test("does not withdraw another user's converted assets", async () => {
  const otherUser = await User.create({
    firebaseUid: "other-withdrawal-user",
    email: "other-withdrawal@example.com",
    role: "user",
    tokenBalance: 100,
  });

  await ContractConversion.create({
    userId: otherUser.id,
    fromToken: "TOKEN",
    toAsset: "MOCK_USDT",
    amount: 100,
    exchangeRate: 0.01,
    txHashMock: `0x${"c".repeat(64)}`,
    status: "SUCCESS",
  });

  await assert.rejects(
    withdrawTokens({ userId }),
    /No eligible converted assets to withdraw/,
  );

  const conversion = await ContractConversion.findOne({
    userId: otherUser.id,
  }).lean();

  assert.equal(conversion?.withdrawalStatus, undefined);
});
