import assert from "node:assert/strict";
import test from "node:test";
import {
  AiTimeoutError,
  withTimeout,
} from "../../src/services/ai/with-timeout.js";

test("resolves when the operation completes before timeout", async () => {
  assert.equal(await withTimeout(Promise.resolve("done"), 100), "done");
});

test("rejects when the operation exceeds the timeout", async () => {
  await assert.rejects(
    withTimeout(new Promise<string>(() => {}), 5),
    AiTimeoutError,
  );
});

test("propagates an operation failure", async () => {
  await assert.rejects(
    withTimeout(Promise.reject(new Error("provider error")), 100),
    /provider error/,
  );
});
