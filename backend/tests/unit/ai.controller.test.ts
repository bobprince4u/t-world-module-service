import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response, NextFunction } from "express";
import { createSummarizeController } from "../../src/controllers/ai.controller.js";
import type { AiProvider } from "../../src/services/ai/ai-provider.js";

function invokeController(
  handler: ReturnType<typeof createSummarizeController>,
  options: {
    id?: string;
    body?: unknown;
    authenticated?: boolean;
  } = {},
) {
  let statusCode = 200;
  let responseBody: unknown;
  let forwardedError: unknown;

  const req = {
    params: options.id ? { id: options.id } : {},
    body: options.body ?? {},
    authUser:
      options.authenticated === false
        ? undefined
        : {
            id: "user-1",
            firebaseUid: "firebase-1",
            email: "test@example.com",
            role: "user",
            tokenBalance: 0,
          },
  } as unknown as Request;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      responseBody = body;
      return this;
    },
  } as unknown as Response;

  const next: NextFunction = (error?: unknown) => {
    forwardedError = error;
  };

  return Promise.resolve(handler(req, res, next)).then(() => ({
    statusCode,
    responseBody,
    forwardedError,
  }));
}

const provider: AiProvider = {
  async summarize(input) {
    return `Summary: ${input.title}`;
  },
};

test("returns a summary and reward details for authenticated valid input", async () => {
  const handler = createSummarizeController(
    provider,
    async () => ({
      title: "Test title",
      body: "Test body",
    }),
    15_000,
    async (input) => {
      assert.equal(input.contentId, "507f1f77bcf86cd799439011");
      assert.equal(input.userId, "user-1");
      assert.equal(input.output, "Summary: Test title");
      assert.equal(input.promptVersion, "v1");

      return {
        aiRunId: "ai-run-1",
        tokensAwarded: 5,
        tokenBalance: 5,
      };
    },
  );

  const result = await invokeController(handler, {
    id: "507f1f77bcf86cd799439011",
    body: { tone: "friendly", length: "short" },
  });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.responseBody, {
    summary: "Summary: Test title",
    aiRunId: "ai-run-1",
    tokensAwarded: 5,
    tokenBalance: 5,
  });
});

test("rejects a malformed content ID", async () => {
  const handler = createSummarizeController(provider, async () => null);

  const result = await invokeController(handler, { id: "bad-id" });

  assert.equal(result.statusCode, 400);
});

test("returns 404 when content does not exist", async () => {
  const handler = createSummarizeController(provider, async () => null);

  const result = await invokeController(handler, {
    id: "507f1f77bcf86cd799439011",
  });

  assert.equal(result.statusCode, 404);
});

test("rejects invalid summary options", async () => {
  const handler = createSummarizeController(provider, async () => ({
    title: "Test title",
    body: "Test body",
  }));

  const result = await invokeController(handler, {
    id: "507f1f77bcf86cd799439011",
    body: { tone: "unsupported" },
  });

  assert.equal(result.statusCode, 400);
});

test("rejects unauthenticated requests", async () => {
  const handler = createSummarizeController(provider);

  const result = await invokeController(handler, {
    id: "507f1f77bcf86cd799439011",
    authenticated: false,
  });

  assert.equal(result.statusCode, 401);
});

test("returns 504 when the provider times out", async () => {
  const slowProvider: AiProvider = {
    summarize: () => new Promise<string>(() => {}),
  };

  const handler = createSummarizeController(
    slowProvider,
    async () => ({ title: "Title", body: "Body" }),
    5,
  );

  const result = await invokeController(handler, {
    id: "507f1f77bcf86cd799439011",
    body: {},
  });

  assert.equal(result.statusCode, 504);
});

test("returns 502 when the provider fails", async () => {
  const failingProvider: AiProvider = {
    summarize: async () => {
      throw new Error("provider failure");
    },
  };

  const handler = createSummarizeController(failingProvider, async () => ({
    title: "Title",
    body: "Body",
  }));

  const result = await invokeController(handler, {
    id: "507f1f77bcf86cd799439011",
    body: {},
  });

  assert.equal(result.statusCode, 502);
});
