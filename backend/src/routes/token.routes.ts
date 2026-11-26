import { Router } from "express";
import {
  getTokenBalance,
  getTokenHistory,
  convertUserTokens,
  withdrawUserTokens,
  getAllUserTokenBalances,
} from "../controllers/token.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const router = Router();

router.get("/balance", authenticate, getTokenBalance);
router.get("/history", authenticate, getTokenHistory);
router.post("/convert", authenticate, convertUserTokens);
router.post("/withdraw", authenticate, withdrawUserTokens);
router.get("/users", authenticate, authorize("admin"), getAllUserTokenBalances);
export default router;
