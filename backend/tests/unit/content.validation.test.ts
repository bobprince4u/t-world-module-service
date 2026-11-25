import test from "node:test";
import assert from "node:assert/strict";
import { createContentSchema } from "../../src/validators/content.validation.js";

test("accepts valid content and defaults tags to an empty array", () => {
  const result = createContentSchema.safeParse({
    title: "  Test title  ",
    body: "Content body",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.title, "Test title");
    assert.deepEqual(result.data.tags, []);
  }
});

test("rejects blank title and body", () => {
  const result = createContentSchema.safeParse({
    title: "   ",
    body: "",
  });

  assert.equal(result.success, false);
});

test("rejects tags that are blank strings", () => {
  const result = createContentSchema.safeParse({
    title: "Test title",
    body: "Content body",
    tags: ["   "],
  });

  assert.equal(result.success, false);
});
