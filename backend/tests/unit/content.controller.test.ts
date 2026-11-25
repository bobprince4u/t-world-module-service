/// <reference path="../../src/types/express.d.ts" />

import test from "node:test";
import assert from "node:assert/strict";
import { createContentController } from "../../src/controllers/content.controller.js";

test("creates content using the authenticated user's id", async () => {
  let capturedInput: unknown;

  const handler = createContentController(async (input) => {
    capturedInput = input;
    return { id: "content-1", ...input };
  });

  const req = {
    body: {
      title: "Test title",
      body: "Test body",
      tags: ["test"],
      createdBy: "attacker-supplied-id",
    },
    authUser: {
      id: "authenticated-user-id",
      firebaseUid: "firebase-uid",
      email: "user@example.com",
      role: "user" as const,
      tokenBalance: 0,
    },
  } as unknown as import("express").Request;

  let statusCode = 0;
  let responseBody: unknown;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      responseBody = body;
      return this;
    },
  } as unknown as import("express").Response;

  let forwardedError: unknown;
  const next = (error?: unknown) => {
    forwardedError = error;
  };

  await handler(req, res, next);

  assert.equal(forwardedError, undefined);
  assert.equal(statusCode, 201);
  assert.deepEqual(capturedInput, {
    title: "Test title",
    body: "Test body",
    tags: ["test"],
    createdBy: "authenticated-user-id",
  });
  assert.ok(responseBody);
});
