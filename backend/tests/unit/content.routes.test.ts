import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../../src/app.js";

test("POST /api/content rejects unauthenticated requests", async () => {
  const response = await request(app)
    .post("/api/content")
    .send({
      title: "Test title",
      body: "Test body",
      tags: ["test"],
    });

  assert.equal(response.status, 401);
});

test("GET /api/content rejects an invalid page value", async () => {
  const response = await request(app).get("/api/content?page=0");

  assert.equal(response.status, 400);
});
