import mongoose from "mongoose";

interface ContentAttributes {
  title: string;
  body: string;
  tags: string[];
  createdBy: mongoose.Types.ObjectId;
}

const contentSchema = new mongoose.Schema<ContentAttributes>(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    tags: { type: [String], default: [] },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    collection: "content_items",
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

export const Content =
  mongoose.models.Content ??
  mongoose.model<ContentAttributes>("Content", contentSchema);
