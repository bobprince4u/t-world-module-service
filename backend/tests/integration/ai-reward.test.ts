import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import { AiRun } from "../../src/models/ai-run.model.js";
import { Content } from "../../src/models/content.model.js";
import { TokenTransaction } from "../../src/models/token-transaction.model.js";
import { User } from "../../src/models/user.model.js";
import { awardAiReward } from "../../src/services/ai/award-ai-reward.js";

let replicaSet: MongoMemoryReplSet;

before(async () => {
  replicaSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
  });

  await mongoose.connect(replicaSet.getUri(), {
    dbName: "t_world_reward_test",
  });
});

beforeEach(async () => {
  await Promise.all([
    AiRun.deleteMany({}),
    Content.deleteMany({}),
    TokenTransaction.deleteMany({}),
    User.deleteMany({}),
  ]);
});

after(async () => {
  await mongoose.disconnect();
  await replicaSet.stop();
});

async function createUser() {
  return User.create({
    firebaseUid: `firebase-${new mongoose.Types.ObjectId()}`,
    email: `user-${new mongoose.Types.ObjectId()}@example.com`,
    tokenBalance: 0,
  });
}

async function createContent(userId: mongoose.Types.ObjectId) {
  return Content.create({
    title: "Test content",
    body: "Test body",
    tags: ["test"],
    createdBy: userId,
  });
}

test("awards 5 tokens and records the AI run and ledger entry", async () => {
  const user = await createUser();
  const content = await createContent(user._id);

  const result = await awardAiReward({
    contentId: content.id,
    userId: user.id,
    output: "Test summary",
    latencyMs: 120,
    promptVersion: "v1",
  });

  assert.equal(result.tokenBalance, 5);
  assert.equal(result.tokensAwarded, 5);

  const updatedUser = await User.findById(user.id).lean();
  assert.equal(updatedUser?.tokenBalance, 5);

  const runs = await AiRun.find({ userId: user.id }).lean();
  assert.equal(runs.length, 1);
  assert.equal(runs[0]?.output, "Test summary");
  assert.equal(runs[0]?.tokensAwarded, 5);

  const transactions = await TokenTransaction.find({
    userId: user.id,
  }).lean();
  assert.equal(transactions.length, 1);
  assert.equal(transactions[0]?.type, "EARN");
  assert.equal(transactions[0]?.source, "AI_USAGE");
  assert.equal(transactions[0]?.amount, 5);
  assert.equal(transactions[0]?.balanceAfter, 5);
  assert.equal(transactions[0]?.referenceId, result.aiRunId);
});

test("rolls back the balance when saving the AI run fails", async () => {
  const user = await createUser();

  await assert.rejects(
    awardAiReward({
      contentId: "not-a-valid-object-id",
      userId: user.id,
      output: "Test summary",
      latencyMs: 120,
      promptVersion: "v1",
    }),
  );

  const updatedUser = await User.findById(user.id).lean();
  assert.equal(updatedUser?.tokenBalance, 0);
  assert.equal(await AiRun.countDocuments({ userId: user.id }), 0);
  assert.equal(await TokenTransaction.countDocuments({ userId: user.id }), 0);
});
