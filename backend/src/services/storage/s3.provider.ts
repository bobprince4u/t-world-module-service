import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import type { S3StorageProvider, PromotedAsset } from "./storage-provider.js";

const bucket = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_REGION;

export const s3Provider: S3StorageProvider = {
  async promote(input): Promise<PromotedAsset> {
    const region = process.env.AWS_REGION;
    const bucket = process.env.AWS_S3_BUCKET;

    if (!region || !bucket) {
      throw new Error("AWS_REGION and AWS_S3_BUCKET must be configured");
    }

    const s3Client = new S3Client({ region });

    const response = await fetch(input.sourceUrl);

    if (!response.ok) {
      throw new Error(
        `Unable to retrieve Cloudinary asset: ${response.status}`,
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const key = `media/${Date.now()}-${input.filename}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: input.mimeType,
      }),
    );

    return {
      key,
      url: `https://${bucket}.s3.${region}.amazonaws.com/${key}`,
    };
  },
};
