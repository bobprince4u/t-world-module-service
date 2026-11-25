import mongoose from "mongoose";

export type ConversionAsset = "MOCK_USDT" | "MOCK_ETH";

interface ContractConversionAttributes {
  userId: mongoose.Types.ObjectId;
  fromToken: string;
  toAsset: ConversionAsset;
  amount: number;
  exchangeRate: number;
  txHashMock: string;
  status: string;
  withdrawalStatus?: "WITHDRAWN";
  withdrawalNetwork?: string;
  withdrawalTxHashMock?: string;
  withdrawnAt?: Date;
}

const contractConversionSchema =
  new mongoose.Schema<ContractConversionAttributes>(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      fromToken: {
        type: String,
        required: true,
        trim: true,
      },
      toAsset: {
        type: String,
        enum: ["MOCK_USDT", "MOCK_ETH"],
        required: true,
      },
      amount: {
        type: Number,
        required: true,
        min: 0.01,
      },
      exchangeRate: {
        type: Number,
        required: true,
        min: 0,
      },
      txHashMock: {
        type: String,
        required: true,
        trim: true,
      },
      status: {
        type: String,
        required: true,
        trim: true,
      },
      withdrawalStatus: {
        type: String,
        enum: ["WITHDRAWN"],
      },
      withdrawalNetwork: {
        type: String,
        trim: true,
      },
      withdrawalTxHashMock: {
        type: String,
        trim: true,
      },
      withdrawnAt: {
        type: Date,
      },
    },
    {
      collection: "contract_conversions",
      timestamps: { createdAt: true, updatedAt: false },
      versionKey: false,
    },
  );

contractConversionSchema.index({ userId: 1, createdAt: -1 });

export const ContractConversion =
  mongoose.models.ContractConversion ??
  mongoose.model<ContractConversionAttributes>(
    "ContractConversion",
    contractConversionSchema,
  );
