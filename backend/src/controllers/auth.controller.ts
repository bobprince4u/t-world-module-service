import type { Request, Response } from "express";

export function getCurrentUser(req: Request, res: Response): void {
  const user = req.authUser;

  if (!user) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "User profile retrieved successfully",
    data: {
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      role: user.role,
      tokenBalance: user.tokenBalance,
    },
  });
}
