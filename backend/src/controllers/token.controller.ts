import type { RequestHandler } from "express";
import { User } from "../models/user.model.js";
import { TokenTransaction } from "../models/token-transaction.model.js";
import { convertTokens } from "../services/tokens/convert-tokens.js";
import { tokenConversionSchema } from "../validators/token-conversion.validation.js";

export const getTokenBalance: RequestHandler = async (req, res, next) => {
  try {
    const user = req.authUser;

    if (!user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const account = await User.findOne({ _id: user.id } as never)
      .select("tokenBalance")
      .lean();

    if (!account) {
      res.status(404).json({ message: "User profile not found" });
      return;
    }

    res.status(200).json({ tokenBalance: account.tokenBalance });
  } catch (error) {
    next(error);
  }
};

export const getTokenHistory: RequestHandler = async (req, res, next) => {
  try {
    const user = req.authUser;

    if (!user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const page = Number(req.query.page ?? 1);

    if (!Number.isInteger(page) || page < 1) {
      res.status(400).json({ message: "Invalid page value" });
      return;
    }

    const pageSize = 10;
    const filter = { userId: user.id } as never;

    const [transactions, total] = await Promise.all([
      TokenTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      TokenTransaction.countDocuments(filter),
    ]);

    res.status(200).json({
      transactions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const convertUserTokens: RequestHandler = async (req, res, next) => {
  try {
    const user = req.authUser;

    if (!user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const validation = tokenConversionSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        message: "Invalid conversion request",
        errors: validation.error.flatten(),
      });
      return;
    }

    try {
      const result = await convertTokens({
        userId: user.id,
        ...validation.data,
      });

      res.status(200).json({
        message: "Token conversion successful",
        ...result,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Insufficient token balance") {
          res.status(400).json({ message: error.message });
          return;
        }

        if (error.message === "User not found") {
          res.status(404).json({ message: "User profile not found" });
          return;
        }
      }

      throw error;
    }
  } catch (error) {
    next(error);
  }
};
