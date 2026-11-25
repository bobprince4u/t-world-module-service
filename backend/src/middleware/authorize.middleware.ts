import type { RequestHandler } from "express";
import type { UserRole } from "../models/user.model.js";

export function authorize(...allowedRoles: UserRole[]): RequestHandler {
  return (req, res, next): void => {
    const user = req.authUser;

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
      });
      return;
    }

    next();
  };
}
