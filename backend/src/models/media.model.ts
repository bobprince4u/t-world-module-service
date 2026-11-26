import mongoose from "mongoose";

export type MediaStatus = "TEMPORARY" | "PROMOTED";

interface MediaAttributes {
  userId: mongoose.Types.ObjectId;
  originalName: string;
  mimeType: string;
  size: number;
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  s3Key?: string;
  s3Url?: string;
  status: MediaStatus;
}

const mediaSchema = new mongoose.Schema<MediaAttributes>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 1 },
    cloudinaryPublicId: { type: String, required: true },
    cloudinaryUrl: { type: String, required: true },
    s3Key: { type: String },
    s3Url: { type: String },
    status: {
      type: String,
      enum: ["TEMPORARY", "PROMOTED"],
      default: "TEMPORARY",
      required: true,
    },
  },
  {
    collection: "media",
    timestamps: { createdAt: true, updatedAt: true },
    versionKey: false,
  },
);

mediaSchema.index({ userId: 1, createdAt: -1 });

export const Media =
  mongoose.models.Media ??
  mongoose.model<MediaAttributes>("Media", mediaSchema);
