import type { Request, Response, NextFunction, RequestHandler } from "express";

import { firebaseAuth } from "../config/firebase.js";
import { User } from "../models/user.model.js";
import type { UserRole } from "../models/user.model.js";

interface DecodedIdentity {
  uid: string;
  email?: string;
}

interface UserRecord {
  id: string;
  firebaseUid: string;
  email: string;
  role: UserRole;
  tokenBalance: number;
  save(): Promise<unknown>;
}

interface AuthDependencies {
  verifyIdToken(token: string, checkRevoked: boolean): Promise<DecodedIdentity>;
  findUserByUid(uid: string): Promise<UserRecord | null>;
  createUser(input: {
    firebaseUid: string;
    email: string;
    role: "user";
    tokenBalance: 0;
  }): Promise<UserRecord>;
}

function getErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return undefined;
}

export function createAuthenticate(
  dependencies: AuthDependencies,
): RequestHandler {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const authorization = req.get("authorization");
    const match = authorization?.match(/^Bearer\s+(\S+)$/i);
    const idToken = match?.[1];

    if (!idToken) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    try {
      const decodedToken = await dependencies.verifyIdToken(idToken, true);

      if (
        typeof decodedToken.email !== "string" ||
        !decodedToken.email.trim()
      ) {
        res.status(401).json({
          success: false,
          message: "A valid email address is required",
        });
        return;
      }

      const email = decodedToken.email.trim().toLowerCase();
      let user = await dependencies.findUserByUid(decodedToken.uid);

      if (!user) {
        try {
          user = await dependencies.createUser({
            firebaseUid: decodedToken.uid,
            email,
            role: "user",
            tokenBalance: 0,
          });
        } catch (error) {
          if (getErrorCode(error) !== "11000") {
            throw error;
          }

          user = await dependencies.findUserByUid(decodedToken.uid);

          if (!user) {
            res.status(409).json({
              success: false,
              message: "User profile conflicts with an existing account",
            });
            return;
          }
        }
      }

      if (user.email !== email) {
        user.email = email;
        await user.save();
      }

      req.authUser = {
        id: user.id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        role: user.role,
        tokenBalance: user.tokenBalance,
      };

      next();
    } catch (error) {
      const code = getErrorCode(error);

      if (code?.startsWith("auth/")) {
        res.status(401).json({
          success: false,
          message: "Invalid or expired authentication token",
        });
        return;
      }

      next(error);
    }
  };
}

export const authenticate = createAuthenticate({
  verifyIdToken: (token, checkRevoked) =>
    firebaseAuth.verifyIdToken(token, checkRevoked),

  findUserByUid: async (uid) => {
    const user = await User.findOne().where("firebaseUid").equals(uid).exec();

    return user;
  },

  createUser: async (input) => {
    const user = await User.create(input);

    if (!user) {
      throw new Error("User creation returned no document");
    }

    return user;
  },
});
