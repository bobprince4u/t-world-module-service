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
  convertUserTokens,
  withdrawUserTokens,
  getAllUserTokenBalances,
} from "../../src/controllers/token.controller.js";
import { ContractConversion } from "../../src/models/contract-conversion.model.js";

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
  requestBody: Record<string, unknown> = {},
) {
  const req = {
    authUser,
    query,
    body: requestBody,
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
  await Promise.all([
    User.deleteMany({}),
    TokenTransaction.deleteMany({}),
    ContractConversion.deleteMany({}),
  ]);

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

test("convertUserTokens converts tokens and returns the conversion result", async () => {
  const h = createHarness(
    authUser,
    {},
    {
      toAsset: "MOCK_USDT",
      amount: 100,
    },
  );

  // Give this user enough tokens for the conversion.
  await User.updateOne({ _id: userId }, { $set: { tokenBalance: 150 } });

  await convertUserTokens(h.req, h.res, h.next);

  assert.equal(h.statusCode, 200);

  const response = h.body as {
    message: string;
    convertedAmount: string;
    tokenBalance: number;
    txHashMock: string;
  };

  assert.equal(response.message, "Token conversion successful");
  assert.equal(response.convertedAmount, "1 MOCK_USDT");
  assert.equal(response.tokenBalance, 50);
  assert.match(response.txHashMock, /^0x[a-f0-9]{64}$/);

  const user = await User.findById(userId).lean();
  assert.equal(user?.tokenBalance, 50);

  assert.equal(await ContractConversion.countDocuments({ userId }), 1);
  assert.equal(
    await TokenTransaction.countDocuments({ userId, type: "CONVERT" }),
    1,
  );
});

test("convertUserTokens rejects unauthenticated requests", async () => {
  const h = createHarness(
    undefined,
    {},
    {
      toAsset: "MOCK_USDT",
      amount: 100,
    },
  );

  await convertUserTokens(h.req, h.res, h.next);

  assert.equal(h.statusCode, 401);
  assert.deepEqual(h.body, { message: "Authentication required" });
});

test("convertUserTokens rejects invalid conversion input", async () => {
  const h = createHarness(
    authUser,
    {},
    {
      toAsset: "INVALID_ASSET",
      amount: -10,
    },
  );

  await convertUserTokens(h.req, h.res, h.next);

  assert.equal(h.statusCode, 400);

  const response = h.body as { message: string };
  assert.equal(response.message, "Invalid conversion request");

  const user = await User.findById(userId).lean();
  assert.equal(user?.tokenBalance, 25);
});

test("convertUserTokens rejects insufficient token balance", async () => {
  const h = createHarness(
    authUser,
    {},
    {
      toAsset: "MOCK_USDT",
      amount: 100,
    },
  );

  await convertUserTokens(h.req, h.res, h.next);

  assert.equal(h.statusCode, 400);
  assert.deepEqual(h.body, { message: "Insufficient token balance" });

  const user = await User.findById(userId).lean();
  assert.equal(user?.tokenBalance, 25);
  assert.equal(await ContractConversion.countDocuments({ userId }), 0);
  assert.equal(
    await TokenTransaction.countDocuments({ userId, type: "CONVERT" }),
    0,
  );
});
test("withdrawUserTokens withdraws the authenticated user's converted assets", async () => {
  const conversion = await ContractConversion.create({
    userId,
    fromToken: "TOKEN",
    toAsset: "MOCK_USDT",
    amount: 100,
    exchangeRate: 0.01,
    txHashMock: `0x${"d".repeat(64)}`,
    status: "SUCCESS",
  });

  const h = createHarness(authUser);

  await withdrawUserTokens(h.req, h.res, h.next);

  assert.equal(h.statusCode, 200);

  const response = h.body as {
    status: string;
    network: string;
    txHashMock: string;
  };

  assert.deepEqual(response, {
    status: "SUCCESS",
    network: "Ethereum",
    txHashMock: response.txHashMock,
  });

  assert.match(response.txHashMock, /^0x[a-f0-9]{64}$/);

  const updatedConversion = await ContractConversion.findById(conversion._id);

  assert.equal(updatedConversion?.status, "SUCCESS");
  assert.equal(updatedConversion?.txHashMock, `0x${"d".repeat(64)}`);
  assert.equal(updatedConversion?.withdrawalStatus, "WITHDRAWN");
  assert.equal(updatedConversion?.withdrawalNetwork, "Ethereum");
  assert.equal(updatedConversion?.withdrawalTxHashMock, response.txHashMock);
  assert.ok(updatedConversion?.withdrawnAt instanceof Date);
});

test("withdrawUserTokens rejects unauthenticated requests", async () => {
  const h = createHarness();

  await withdrawUserTokens(h.req, h.res, h.next);

  assert.equal(h.statusCode, 401);
  assert.deepEqual(h.body, { message: "Authentication required" });
});

test("withdrawUserTokens rejects when no converted assets are eligible", async () => {
  const h = createHarness(authUser);

  await withdrawUserTokens(h.req, h.res, h.next);

  assert.equal(h.statusCode, 400);
  assert.deepEqual(h.body, {
    message: "No eligible converted assets to withdraw",
  });
});
test("getAllUserTokenBalances returns paginated user balances", async () => {
  await User.create({
    firebaseUid: "firebase-admin-1",
    email: "admin@example.com",
    role: "admin",
    tokenBalance: 500,
  });

  const h = createHarness({ ...authUser, role: "admin" }, { page: "1" });

  await getAllUserTokenBalances(h.req, h.res, h.next);

  assert.equal(h.statusCode, 200);

  const response = h.body as {
    users: Array<{
      email: string;
      role: string;
      tokenBalance: number;
    }>;
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };

  assert.equal(response.users.length, 3);
  assert.equal(response.pagination.total, 3);
  assert.equal(response.pagination.page, 1);
  assert.equal(response.pagination.pageSize, 10);
  assert.equal(response.pagination.totalPages, 1);

  assert.ok(
    response.users.every(
      (user) =>
        typeof user.email === "string" && typeof user.tokenBalance === "number",
    ),
  );
});

test("getAllUserTokenBalances rejects unauthenticated requests", async () => {
  const h = createHarness();

  await getAllUserTokenBalances(h.req, h.res, h.next);

  assert.equal(h.statusCode, 200);
});
