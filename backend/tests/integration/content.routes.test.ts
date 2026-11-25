import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import app from "../../src/app.js";
import { Content } from "../../src/models/content.model.js";

let replicaSet: MongoMemoryReplSet;

const createdBy = new mongoose.Types.ObjectId();

before(async () => {
  replicaSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
  });

  await mongoose.connect(replicaSet.getUri(), {
    dbName: "t_world_test",
  });
});

beforeEach(async () => {
  await Content.deleteMany({});
});

after(async () => {
  await mongoose.disconnect();
  await replicaSet.stop();
});

async function seedContent(title: string, body: string, tags: string[]) {
  return Content.create({
    title,
    body,
    tags,
    createdBy,
  });
}

test("GET /api/content returns content items and pagination metadata", async () => {
  await seedContent("Node.js Fundamentals", "Learn Node.js", ["backend"]);
  await seedContent("React Fundamentals", "Learn React", ["frontend"]);

  const response = await request(app).get("/api/content");

  assert.equal(response.status, 200);
  assert.equal(response.body.items.length, 2);
  assert.deepEqual(response.body.pagination, {
    page: 1,
    pageSize: 10,
    total: 2,
    totalPages: 1,
  });
});

test("GET /api/content filters content by tag", async () => {
  await seedContent("Node.js Guide", "Backend development", ["backend"]);
  await seedContent("React Guide", "Frontend development", ["frontend"]);

  const response = await request(app)
    .get("/api/content")
    .query({ tag: "backend" });

  assert.equal(response.status, 200);
  assert.equal(response.body.items.length, 1);
  assert.equal(response.body.items[0].title, "Node.js Guide");
});

test("GET /api/content searches title and body case-insensitively", async () => {
  await seedContent("Node.js Guide", "Building scalable applications", [
    "backend",
  ]);

  await seedContent("React Guide", "Building user interfaces", ["frontend"]);

  const response = await request(app)
    .get("/api/content")
    .query({ q: "SCALABLE" });

  assert.equal(response.status, 200);
  assert.equal(response.body.items.length, 1);
  assert.equal(response.body.items[0].title, "Node.js Guide");
});

test("GET /api/content paginates results", async () => {
  for (let index = 1; index <= 12; index += 1) {
    await seedContent(`Content ${index}`, `Body ${index}`, ["backend"]);
  }

  const response = await request(app).get("/api/content").query({ page: 2 });

  assert.equal(response.status, 200);
  assert.equal(response.body.items.length, 2);
  assert.equal(response.body.pagination.page, 2);
  assert.equal(response.body.pagination.total, 12);
  assert.equal(response.body.pagination.totalPages, 2);
});

test("GET /api/content sorts newest items first", async () => {
  const older = await seedContent("Older content", "Older body", []);
  const newer = await seedContent("Newer content", "Newer body", []);

  await Content.collection.updateOne(
    { _id: older._id },
    { $set: { createdAt: new Date("2025-01-01T00:00:00.000Z") } },
  );

  await Content.collection.updateOne(
    { _id: newer._id },
    { $set: { createdAt: new Date("2026-01-01T00:00:00.000Z") } },
  );

  const response = await request(app).get("/api/content");

  assert.equal(response.status, 200);
  assert.equal(response.body.items[0].title, "Newer content");
  assert.equal(response.body.items[1].title, "Older content");
});

test("GET /api/content/:id returns an existing content item", async () => {
  const created = await Content.create({
    title: "Test content",
    body: "Content body",
    tags: ["test"],
    createdBy: new mongoose.Types.ObjectId(),
  });

  const response = await request(app).get(`/api/content/${created.id}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.content.title, "Test content");
});

test("GET /api/content/:id returns 404 for a valid but nonexistent ID", async () => {
  const id = new mongoose.Types.ObjectId().toString();

  const response = await request(app).get(`/api/content/${id}`);

  assert.equal(response.status, 404);
  assert.equal(response.body.message, "Content not found");
});

test("GET /api/content/:id returns 400 for a malformed ID", async () => {
  const response = await request(app).get("/api/content/not-an-id");

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Invalid content ID");
});
