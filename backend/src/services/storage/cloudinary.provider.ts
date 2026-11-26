import { v2 as cloudinary } from "cloudinary";

import type {
  CloudinaryStorageProvider,
  UploadedAsset,
} from "./storage-provider.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const cloudinaryProvider: CloudinaryStorageProvider = {
  upload(buffer, options): Promise<UploadedAsset> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          folder: "t-world/media",
          public_id: `${Date.now()}-${options.filename.replace(/\.[^.]+$/, "")}`,
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error("Cloudinary upload failed"));
            return;
          }

          resolve({
            publicId: result.public_id,
            url: result.secure_url,
          });
        },
      );

      uploadStream.end(buffer);
    });
  },
};
