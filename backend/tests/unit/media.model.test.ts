import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import { Media } from "../../src/models/media.model.js";

let mongo: MongoMemoryReplSet;

before(async () => {
  mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
  });

  await mongoose.connect(mongo.getUri());
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test("creates temporary media metadata", async () => {
  const userId = new mongoose.Types.ObjectId();

  const media = await Media.create({
    userId,
    originalName: "document.pdf",
    mimeType: "application/pdf",
    size: 1024,
    cloudinaryPublicId: "t-world/document",
    cloudinaryUrl: "https://res.cloudinary.com/demo/document.pdf",
  });

  assert.equal(media.userId.toString(), userId.toString());
  assert.equal(media.status, "TEMPORARY");
  assert.equal(media.s3Key, undefined);
  assert.equal(media.s3Url, undefined);
});

test("rejects media without a required Cloudinary reference", async () => {
  await assert.rejects(
    Media.create({
      userId: new mongoose.Types.ObjectId(),
      originalName: "document.pdf",
      mimeType: "application/pdf",
      size: 1024,
      cloudinaryUrl: "https://res.cloudinary.com/demo/document.pdf",
    }),
    { name: "ValidationError" },
  );
});

test("rejects zero-byte media", async () => {
  await assert.rejects(
    Media.create({
      userId: new mongoose.Types.ObjectId(),
      originalName: "empty.pdf",
      mimeType: "application/pdf",
      size: 0,
      cloudinaryPublicId: "t-world/empty",
      cloudinaryUrl: "https://res.cloudinary.com/demo/empty.pdf",
    }),
    { name: "ValidationError" },
  );
});
