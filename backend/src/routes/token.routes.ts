import { Router } from "express";
import {
  getTokenBalance,
  getTokenHistory,
  convertUserTokens,
} from "../controllers/token.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/balance", authenticate, getTokenBalance);
router.get("/history", authenticate, getTokenHistory);
router.post("/convert", authenticate, convertUserTokens);

export default router;
