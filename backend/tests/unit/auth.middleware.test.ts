/// <reference path="../../src/types/express.d.ts" />
import assert from "node:assert/strict";
import { test } from "node:test";

import type { Request, Response, NextFunction } from "express";

import { createAuthenticate } from "../../src/middleware/auth.middleware.js";

import type { UserRole } from "../../src/models/user.model.js";

interface FakeUser {
  id: string;
  firebaseUid: string;
  email: string;
  role: UserRole;
  tokenBalance: number;
  save: () => Promise<void>;
}

function createHarness(authorization?: string) {
  const state: {
    status?: number;
    body?: unknown;
    authUser?: Request["authUser"];
    nextCalled: boolean;
    error?: unknown;
  } = {
    nextCalled: false,
  };

  const req = {
    get: (header: string) =>
      header.toLowerCase() === "authorization" ? authorization : undefined,
  } as Request;

  const res = {
    status(code: number) {
      state.status = code;
      return this;
    },
    json(body: unknown) {
      state.body = body;
      return this;
    },
  } as Response;

  const next: NextFunction = (error?: unknown) => {
    if (error) {
      state.error = error;
    } else {
      state.nextCalled = true;
    }
  };

  return { req, res, next, state };
}

function makeUser(overrides: Partial<FakeUser> = {}): FakeUser {
  return {
    id: "user-123",
    firebaseUid: "firebase-123",
    email: "person@example.com",
    role: "user",
    tokenBalance: 0,
    save: async () => {},
    ...overrides,
  };
}

test("rejects a missing authorization header", async () => {
  const { req, res, next, state } = createHarness();

  const middleware = createAuthenticate({
    verifyIdToken: async () => {
      throw new Error("Should not verify without a token");
    },
    findUserByUid: async () => null,
    createUser: async () => makeUser(),
  });

  await middleware(req, res, next);

  assert.equal(state.status, 401);
  assert.deepEqual(state.body, {
    success: false,
    message: "Authentication required",
  });
  assert.equal(state.nextCalled, false);
});

test("rejects an invalid Firebase token", async () => {
  const { req, res, next, state } = createHarness("Bearer invalid");

  const middleware = createAuthenticate({
    verifyIdToken: async () => {
      throw Object.assign(new Error("Invalid token"), {
        code: "auth/invalid-id-token",
      });
    },
    findUserByUid: async () => null,
    createUser: async () => makeUser(),
  });

  await middleware(req, res, next);

  assert.equal(state.status, 401);
  assert.deepEqual(state.body, {
    success: false,
    message: "Invalid or expired authentication token",
  });
});

test("creates a user profile and attaches it to the request", async () => {
  const { req, res, next, state } = createHarness("Bearer valid-token");
  let createdInput: unknown;

  const middleware = createAuthenticate({
    verifyIdToken: async (token, checkRevoked) => {
      assert.equal(token, "valid-token");
      assert.equal(checkRevoked, true);
      return {
        uid: "firebase-123",
        email: " Person@Example.com ",
      };
    },
    findUserByUid: async () => null,
    createUser: async (input) => {
      createdInput = input;
      return makeUser({ email: "person@example.com" });
    },
  });

  await middleware(req, res, next);

  assert.deepEqual(createdInput, {
    firebaseUid: "firebase-123",
    email: "person@example.com",
    role: "user",
    tokenBalance: 0,
  });
  assert.equal(state.nextCalled, true);
  assert.deepEqual(req.authUser, {
    id: "user-123",
    firebaseUid: "firebase-123",
    email: "person@example.com",
    role: "user",
    tokenBalance: 0,
  });
});

test("preserves an existing user's role and token balance", async () => {
  const { req, res, next, state } = createHarness("Bearer valid-token");
  const existingUser = makeUser({
    role: "admin",
    tokenBalance: 25,
  });

  const middleware = createAuthenticate({
    verifyIdToken: async () => ({
      uid: "firebase-123",
      email: "person@example.com",
    }),
    findUserByUid: async () => existingUser,
    createUser: async () => {
      throw new Error("Should not create an existing user");
    },
  });

  await middleware(req, res, next);

  assert.equal(state.nextCalled, true);
  assert.equal(req.authUser?.role, "admin");
  assert.equal(req.authUser?.tokenBalance, 25);
});
