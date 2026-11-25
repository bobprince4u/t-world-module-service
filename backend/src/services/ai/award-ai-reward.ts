import mongoose from "mongoose";
import { AiRun } from "../../models/ai-run.model.js";
import { TokenTransaction } from "../../models/token-transaction.model.js";
import { User } from "../../models/user.model.js";

const AI_REWARD_TOKENS = 5;

interface AwardAiRewardInput {
  contentId: string;
  userId: string;
  output: string;
  latencyMs: number;
  promptVersion: string;
}

export async function awardAiReward(input: AwardAiRewardInput) {
  const session = await mongoose.startSession();

  try {
    let result:
      | {
          aiRunId: string;
          tokenBalance: number;
          tokensAwarded: number;
        }
      | undefined;

    await session.withTransaction(async () => {
      const userObjectId = new mongoose.Types.ObjectId(input.userId);

      const updateResult = await User.collection.updateOne(
        { _id: userObjectId },
        { $inc: { tokenBalance: AI_REWARD_TOKENS } },
        { session },
      );

      if (updateResult.matchedCount !== 1) {
        throw new Error("User not found while awarding AI reward");
      }

      const updatedUser = await User.collection.findOne(
        { _id: userObjectId },
        { session },
      );

      if (!updatedUser) {
        throw new Error("User not found while awarding AI reward");
      }
      const aiRun = new AiRun({
        contentId: input.contentId,
        userId: input.userId,
        promptVersion: input.promptVersion,
        status: "SUCCESS",
        output: input.output,
        latencyMs: input.latencyMs,
        tokensAwarded: AI_REWARD_TOKENS,
      });

      await aiRun.save({ session });

      const transaction = new TokenTransaction({
        userId: input.userId,
        type: "EARN",
        source: "AI_USAGE",
        amount: AI_REWARD_TOKENS,
        balanceAfter: updatedUser.tokenBalance,
        referenceId: aiRun._id.toString(),
      });

      await transaction.save({ session });

      result = {
        aiRunId: aiRun._id.toString(),
        tokenBalance: updatedUser.tokenBalance,
        tokensAwarded: AI_REWARD_TOKENS,
      };
    });

    if (!result) {
      throw new Error("AI reward transaction did not complete");
    }

    return result;
  } finally {
    await session.endSession();
  }
}
