import assert from "node:assert/strict";
import test from "node:test";
import { aiSummarySchema } from "../../src/validators/ai-summary.validation.js";

test("accepts valid tone and length", () => {
  const result = aiSummarySchema.safeParse({
    tone: "friendly",
    length: "short",
  });

  assert.equal(result.success, true);
});

test("defaults tone and length when omitted", () => {
  const result = aiSummarySchema.safeParse({});

  assert.equal(result.success, true);

  if (result.success) {
    assert.deepEqual(result.data, {
      tone: "professional",
      length: "medium",
    });
  }
});

test("rejects unsupported tone or length", () => {
  assert.equal(
    aiSummarySchema.safeParse({ tone: "sarcastic", length: "short" }).success,
    false,
  );

  assert.equal(
    aiSummarySchema.safeParse({ tone: "friendly", length: "extra-long" })
      .success,
    false,
  );
});
