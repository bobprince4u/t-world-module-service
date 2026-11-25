import mongoose from "mongoose";

export type TokenTransactionType = "EARN" | "CONVERT" | "WITHDRAW";
export type TokenTransactionSource = "AI_USAGE" | "MANUAL" | "SYSTEM";

interface TokenTransactionAttributes {
  userId: mongoose.Types.ObjectId;
  type: TokenTransactionType;
  source: TokenTransactionSource;
  amount: number;
  balanceAfter: number;
  referenceId: string;
}

const tokenTransactionSchema = new mongoose.Schema<TokenTransactionAttributes>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["EARN", "CONVERT", "WITHDRAW"],
      required: true,
    },
    source: {
      type: String,
      enum: ["AI_USAGE", "MANUAL", "SYSTEM"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    referenceId: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    collection: "token_transactions",
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

tokenTransactionSchema.index({ userId: 1, createdAt: -1 });

export const TokenTransaction =
  mongoose.models.TokenTransaction ??
  mongoose.model<TokenTransactionAttributes>(
    "TokenTransaction",
    tokenTransactionSchema,
  );
