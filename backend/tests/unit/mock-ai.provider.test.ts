import assert from "node:assert/strict";
import test from "node:test";
import { MockAiProvider } from "../../src/services/ai/mock-ai.provider.js";

const provider = new MockAiProvider();

test("mock provider includes the requested tone and summarizes the input", async () => {
  const result = await provider.summarize({
    title: "Healthy Habits",
    body: "Drink water and get enough sleep.",
    tone: "friendly",
    length: "short",
  });

  assert.equal(
    result,
    "[friendly summary] Healthy Habits. Drink water and get enough sleep.",
  );
});

test("mock provider limits short summaries to 30 words", async () => {
  const body = Array.from({ length: 40 }, (_, i) => `word${i + 1}`).join(" ");

  const result = await provider.summarize({
    title: "Title",
    body,
    tone: "simple",
    length: "short",
  });

  const summary = result.replace("[simple summary] ", "");
  assert.equal(summary.split(/\s+/).length, 30);
});

test("mock provider produces longer output for long than short", async () => {
  const body = Array.from({ length: 120 }, (_, i) => `word${i + 1}`).join(" ");

  const shortResult = await provider.summarize({
    title: "Title",
    body,
    tone: "professional",
    length: "short",
  });

  const longResult = await provider.summarize({
    title: "Title",
    body,
    tone: "professional",
    length: "long",
  });

  assert.ok(longResult.length > shortResult.length);
});
