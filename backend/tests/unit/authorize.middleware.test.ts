/// <reference path="../../src/types/express.d.ts" />

import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request, Response, NextFunction } from "express";

import { authorize } from "../../src/middleware/authorize.middleware.js";

function createHarness(authUser?: Request["authUser"]) {
  const state: {
    status?: number;
    body?: unknown;
    nextCalled: boolean;
  } = { nextCalled: false };

  const req = { authUser } as Request;

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

  const next: NextFunction = () => {
    state.nextCalled = true;
  };

  return { req, res, next, state };
}

test("returns 401 when the request is unauthenticated", () => {
  const { req, res, next, state } = createHarness();

  authorize("admin")(req, res, next);

  assert.equal(state.status, 401);
  assert.equal(state.nextCalled, false);
});

test("returns 403 when the user's role is not allowed", () => {
  const { req, res, next, state } = createHarness({
    id: "user-1",
    firebaseUid: "firebase-1",
    email: "user@example.com",
    role: "user",
    tokenBalance: 0,
  });

  authorize("admin")(req, res, next);

  assert.equal(state.status, 403);
  assert.equal(state.nextCalled, false);
});

test("allows a user with an allowed role", () => {
  const { req, res, next, state } = createHarness({
    id: "admin-1",
    firebaseUid: "firebase-admin-1",
    email: "admin@example.com",
    role: "admin",
    tokenBalance: 0,
  });

  authorize("admin")(req, res, next);

  assert.equal(state.nextCalled, true);
  assert.equal(state.status, undefined);
});
