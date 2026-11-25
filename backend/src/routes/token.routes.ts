import { Router } from "express";
import {
  getTokenBalance,
  getTokenHistory,
  convertUserTokens,
  withdrawUserTokens,
} from "../controllers/token.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/balance", authenticate, getTokenBalance);
router.get("/history", authenticate, getTokenHistory);
router.post("/convert", authenticate, convertUserTokens);
router.post("/withdraw", authenticate, withdrawUserTokens);

export default router;
