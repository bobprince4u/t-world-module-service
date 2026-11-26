import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import { User } from "../../src/models/user.model.js";
import { Media } from "../../src/models/media.model.js";
import { createMediaService } from "../../src/services/storage/media.service.js";

let replicaSet: MongoMemoryReplSet;
let userId: string;
let otherUserId: string;

const cloudinary = {
  upload: async () => ({
    publicId: "t-world/test-asset",
    url: "https://cloudinary.example/test-asset",
  }),
};

const s3 = {
  promote: async () => ({
    key: "media/test-asset",
    url: "https://s3.example/media/test-asset",
  }),
};

const mediaService = createMediaService({ cloudinary, s3 });

before(async () => {
  replicaSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
  });

  await mongoose.connect(replicaSet.getUri(), {
    dbName: "t_world_media_test",
  });
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Media.deleteMany({})]);

  const [user, otherUser] = await Promise.all([
    User.create({
      firebaseUid: "media-user",
      email: "media@example.com",
      role: "user",
      tokenBalance: 0,
    }),
    User.create({
      firebaseUid: "other-media-user",
      email: "other-media@example.com",
      role: "user",
      tokenBalance: 0,
    }),
  ]);

  userId = user.id;
  otherUserId = otherUser.id;
});

after(async () => {
  await mongoose.disconnect();
  await replicaSet.stop();
});

test("uploads asset to Cloudinary and stores temporary metadata", async () => {
  const media = await mediaService.upload({
    userId,
    buffer: Buffer.from("test"),
    originalName: "test.txt",
    mimeType: "text/plain",
    size: 4,
  });

  assert.equal(media.status, "TEMPORARY");
  assert.equal(media.cloudinaryPublicId, "t-world/test-asset");
  assert.equal(media.s3Key, undefined);
});

test("promotes owned temporary media and updates its database reference", async () => {
  const media = await mediaService.upload({
    userId,
    buffer: Buffer.from("test"),
    originalName: "test.txt",
    mimeType: "text/plain",
    size: 4,
  });

  const promoted = await mediaService.promote(media.id, userId);
  const stored = await Media.findOne({ _id: media.id }).lean();

  assert.equal(promoted.status, "PROMOTED");
  assert.equal(stored?.status, "PROMOTED");
  assert.equal(stored?.s3Key, "media/test-asset");
  assert.equal(stored?.s3Url, "https://s3.example/media/test-asset");
});

test("leaves media temporary when S3 promotion fails", async () => {
  const media = await mediaService.upload({
    userId,
    buffer: Buffer.from("test"),
    originalName: "test.txt",
    mimeType: "text/plain",
    size: 4,
  });

  const failingService = createMediaService({
    cloudinary,
    s3: {
      promote: async () => {
        throw new Error("S3 transfer failed");
      },
    },
  });

  await assert.rejects(
    failingService.promote(media.id, userId),
    /S3 transfer failed/,
  );

  const stored = await Media.findOne({ _id: media.id }).lean();

  assert.equal(stored?.status, "TEMPORARY");
  assert.equal(stored?.s3Key, undefined);
  assert.equal(stored?.s3Url, undefined);
});

test("does not allow another user to promote the media", async () => {
  const media = await mediaService.upload({
    userId,
    buffer: Buffer.from("test"),
    originalName: "test.txt",
    mimeType: "text/plain",
    size: 4,
  });

  await assert.rejects(
    mediaService.promote(media.id, otherUserId),
    /Media not found/,
  );

  const stored = await Media.findOne({ _id: media.id }).lean();
  assert.equal(stored?.status, "TEMPORARY");
});
