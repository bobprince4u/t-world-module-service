import mongoose from "mongoose";

import { Media } from "../../models/media.model.js";
import type {
  CloudinaryStorageProvider,
  S3StorageProvider,
} from "./storage-provider.js";

interface UploadMediaInput {
  userId: string;
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

interface MediaProviders {
  cloudinary: CloudinaryStorageProvider;
  s3: S3StorageProvider;
}

export function createMediaService(providers: MediaProviders) {
  return {
    async upload(input: UploadMediaInput) {
      if (!mongoose.isValidObjectId(input.userId)) {
        throw new Error("Invalid user ID");
      }

      const uploaded = await providers.cloudinary.upload(input.buffer, {
        filename: input.originalName,
        mimeType: input.mimeType,
      });

      return Media.create({
        userId: new mongoose.Types.ObjectId(input.userId),
        originalName: input.originalName,
        mimeType: input.mimeType,
        size: input.size,
        cloudinaryPublicId: uploaded.publicId,
        cloudinaryUrl: uploaded.url,
        status: "TEMPORARY",
      });
    },

    async promote(mediaId: string, userId: string) {
      if (!mongoose.isValidObjectId(mediaId)) {
        throw new Error("Invalid media ID");
      }

      if (!mongoose.isValidObjectId(userId)) {
        throw new Error("Invalid user ID");
      }

      const media = await Media.findOne({
        _id: mediaId,
        userId,
      } as never);

      if (!media) {
        throw new Error("Media not found");
      }

      if (media.status !== "TEMPORARY") {
        throw new Error("Media has already been promoted");
      }

      const promoted = await providers.s3.promote({
        sourceUrl: media.cloudinaryUrl,
        filename: media.originalName,
        mimeType: media.mimeType,
      });

      const updateResult = await Media.updateOne(
        {
          _id: media._id,
          userId,
          status: "TEMPORARY",
        } as never,
        {
          $set: {
            s3Key: promoted.key,
            s3Url: promoted.url,
            status: "PROMOTED",
          },
        },
        { runValidators: true },
      );

      if (updateResult.modifiedCount !== 1) {
        throw new Error("Media promotion could not be completed");
      }

      media.s3Key = promoted.key;
      media.s3Url = promoted.url;
      media.status = "PROMOTED";

      return media;
    },
  };
}
