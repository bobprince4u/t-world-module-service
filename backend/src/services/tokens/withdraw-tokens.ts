import crypto from "node:crypto";
import mongoose from "mongoose";

import { ContractConversion } from "../../models/contract-conversion.model.js";

interface WithdrawTokensInput {
  userId: string;
}

export async function withdrawTokens(input: WithdrawTokensInput) {
  const session = await mongoose.startSession();

  try {
    let result:
      | {
          status: "SUCCESS";
          network: "Ethereum";
          txHashMock: string;
        }
      | undefined;

    await session.withTransaction(async () => {
      const txHashMock = `0x${crypto.randomBytes(32).toString("hex")}`;

      const conversions = await ContractConversion.find({
        userId: new mongoose.Types.ObjectId(input.userId),
        status: "SUCCESS",
        withdrawalStatus: { $exists: false },
      } as never).session(session);

      if (conversions.length === 0) {
        throw new Error("No eligible converted assets to withdraw");
      }

      const withdrawnAt = new Date();

      await ContractConversion.updateMany(
        {
          _id: { $in: conversions.map((conversion) => conversion._id) },
          withdrawalStatus: { $exists: false },
        },
        {
          $set: {
            withdrawalStatus: "WITHDRAWN",
            withdrawalNetwork: "Ethereum",
            withdrawalTxHashMock: txHashMock,
            withdrawnAt,
          },
        },
        { session },
      );

      result = {
        status: "SUCCESS",
        network: "Ethereum",
        txHashMock,
      };
    });

    if (!result) {
      throw new Error("Withdrawal transaction did not complete");
    }

    return result;
  } finally {
    await session.endSession();
  }
}
