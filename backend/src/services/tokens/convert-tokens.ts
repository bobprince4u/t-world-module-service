import crypto from "node:crypto";
import mongoose from "mongoose";

import { ContractConversion } from "../../models/contract-conversion.model.js";
import { TokenTransaction } from "../../models/token-transaction.model.js";
import { User } from "../../models/user.model.js";

type ConversionAsset = "MOCK_USDT" | "MOCK_ETH";

interface ConvertTokensInput {
  userId: string;
  toAsset: ConversionAsset;
  amount: number;
}

const MOCK_RATES: Record<ConversionAsset, number> = {
  MOCK_USDT: 1 / 100,
  MOCK_ETH: 0.01 / 200,
};

export async function convertTokens(input: ConvertTokensInput) {
  const session = await mongoose.startSession();

  try {
    let result:
      | {
          txHashMock: string;
          convertedAmount: string;
          tokenBalance: number;
        }
      | undefined;

    await session.withTransaction(async () => {
      const userObjectId = new mongoose.Types.ObjectId(input.userId);
      const exchangeRate = MOCK_RATES[input.toAsset];
      const convertedAmount = input.amount * exchangeRate;

      const updateResult = await User.collection.updateOne(
        {
          _id: userObjectId,
          tokenBalance: { $gte: input.amount },
        },
        {
          $inc: { tokenBalance: -input.amount },
        },
        { session },
      );

      if (updateResult.matchedCount !== 1) {
        const userExists = await User.collection.findOne(
          { _id: userObjectId },
          { session, projection: { _id: 1 } },
        );

        if (!userExists) {
          throw new Error("User not found");
        }

        throw new Error("Insufficient token balance");
      }

      const updatedUser = await User.collection.findOne(
        { _id: userObjectId },
        { session, projection: { tokenBalance: 1 } },
      );

      if (!updatedUser) {
        throw new Error("User not found");
      }

      const txHashMock = `0x${crypto.randomBytes(32).toString("hex")}`;

      const conversion = new ContractConversion({
        userId: userObjectId,
        fromToken: "TOKEN",
        toAsset: input.toAsset,
        amount: input.amount,
        exchangeRate,
        txHashMock,
        status: "SUCCESS",
      });

      await conversion.save({ session });

      const transaction = new TokenTransaction({
        userId: userObjectId,
        type: "CONVERT",
        source: "SYSTEM",
        amount: input.amount,
        balanceAfter: updatedUser.tokenBalance,
        referenceId: conversion._id.toString(),
      });

      await transaction.save({ session });

      result = {
        txHashMock,
        convertedAmount: `${convertedAmount} ${input.toAsset}`,
        tokenBalance: updatedUser.tokenBalance,
      };
    });

    if (!result) {
      throw new Error("Token conversion transaction did not complete");
    }

    return result;
  } finally {
    await session.endSession();
  }
}
