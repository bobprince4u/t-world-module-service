import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import type { Request, Response } from "express";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import { User } from "../../src/models/user.model.js";
import { TokenTransaction } from "../../src/models/token-transaction.model.js";
import {
  getTokenBalance,
  getTokenHistory,
} from "../../src/controllers/token.controller.js";

let replicaSet: MongoMemoryReplSet;

type AuthUser = {
  id: string;
  firebaseUid: string;
  email: string;
  role: "admin" | "user";
};

function createHarness(
  authUser?: AuthUser,
  query: Record<string, string> = {},
) {
  const req = {
    authUser,
    query,
  } as unknown as Request;

  let statusCode = 200;
  let body: unknown;
  let forwardedError: unknown;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(value: unknown) {
      body = value;
      return this;
    },
  } as unknown as Response;

  const next = (error?: unknown) => {
    forwardedError = error;
  };

  return {
    req,
    res,
    next,
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
    get forwardedError() {
      return forwardedError;
    },
  };
}

let userId: string;
let otherUserId: string;
let authUser: AuthUser;

before(async () => {
  replicaSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
  });

  await mongoose.connect(replicaSet.getUri(), {
    dbName: "t_world_tokens_test",
  });
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), TokenTransaction.deleteMany({})]);

  const user = await User.create({
    firebaseUid: "firebase-user-1",
    email: "user1@example.com",
    role: "user",
    tokenBalance: 25,
  });

  const otherUser = await User.create({
    firebaseUid: "firebase-user-2",
    email: "user2@example.com",
    role: "user",
    tokenBalance: 100,
  });

  userId = user.id;
  otherUserId = otherUser.id;

  authUser = {
    id: userId,
    firebaseUid: user.firebaseUid,
    email: user.email,
    role: user.role,
  };
});

after(async () => {
  await mongoose.disconnect();
  await replicaSet.stop();
});

test("getTokenBalance returns the authenticated user's balance", async () => {
  const h = createHarness(authUser);

  await getTokenBalance(h.req, h.res, h.next);

  assert.equal(h.statusCode, 200);
  assert.deepEqual(h.body, { tokenBalance: 25 });
  assert.equal(h.forwardedError, undefined);
});

test("getTokenBalance rejects unauthenticated requests", async () => {
  const h = createHarness();

  await getTokenBalance(h.req, h.res, h.next);

  assert.equal(h.statusCode, 401);
  assert.deepEqual(h.body, { message: "Authentication required" });
});

test("getTokenBalance returns 404 when the user profile is missing", async () => {
  const h = createHarness({
    ...authUser,
    id: new mongoose.Types.ObjectId().toString(),
  });

  await getTokenBalance(h.req, h.res, h.next);

  assert.equal(h.statusCode, 404);
  assert.deepEqual(h.body, { message: "User profile not found" });
});

test("getTokenHistory returns only the authenticated user's transactions", async () => {
  await TokenTransaction.create([
    {
      userId,
      type: "EARN",
      source: "AI_USAGE",
      amount: 5,
      balanceAfter: 5,
      referenceId: "ai-run-1",
      createdAt: new Date("2026-01-01T10:00:00.000Z"),
    },
    {
      userId: otherUserId,
      type: "EARN",
      source: "AI_USAGE",
      amount: 5,
      balanceAfter: 5,
      referenceId: "other-ai-run",
      createdAt: new Date("2026-01-01T11:00:00.000Z"),
    },
  ]);

  const h = createHarness(authUser);

  await getTokenHistory(h.req, h.res, h.next);

  const body = h.body as {
    transactions: Array<{
      userId: mongoose.Types.ObjectId;
      referenceId: string;
    }>;
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };

  assert.equal(h.statusCode, 200);
  assert.equal(body.transactions.length, 1);
  assert.equal(body.transactions[0].referenceId, "ai-run-1");
  assert.equal(body.pagination.page, 1);
  assert.equal(body.pagination.pageSize, 10);
  assert.equal(body.pagination.total, 1);
  assert.equal(body.pagination.totalPages, 1);
});

test("getTokenHistory rejects unauthenticated requests", async () => {
  const h = createHarness();

  await getTokenHistory(h.req, h.res, h.next);

  assert.equal(h.statusCode, 401);
  assert.deepEqual(h.body, { message: "Authentication required" });
});

test("getTokenHistory rejects invalid page values", async () => {
  const h = createHarness(authUser, { page: "0" });

  await getTokenHistory(h.req, h.res, h.next);

  assert.equal(h.statusCode, 400);
  assert.deepEqual(h.body, { message: "Invalid page value" });
});
