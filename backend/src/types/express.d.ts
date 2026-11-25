import type { UserRole } from "../models/user.model.js";

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        firebaseUid: string;
        email: string;
        role: UserRole;
        tokenBalance: number;
      };
    }
  }
}

export {};
