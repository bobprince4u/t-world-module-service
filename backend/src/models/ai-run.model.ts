import mongoose from "mongoose";

export type AiRunStatus = "SUCCESS" | "FAILED";

interface AiRunAttributes {
  contentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  promptVersion: string;
  status: AiRunStatus;
  output: string | null;
  latencyMs: number;
  tokensAwarded: number;
}

const aiRunSchema = new mongoose.Schema<AiRunAttributes>(
  {
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Content",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    promptVersion: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      required: true,
    },
    output: {
      type: String,
      default: null,
    },
    latencyMs: {
      type: Number,
      required: true,
      min: 0,
    },
    tokensAwarded: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    collection: "ai_runs",
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

aiRunSchema.index({ userId: 1, createdAt: -1 });
aiRunSchema.index({ contentId: 1, createdAt: -1 });

export const AiRun =
  mongoose.models.AiRun ??
  mongoose.model<AiRunAttributes>("AiRun", aiRunSchema);
