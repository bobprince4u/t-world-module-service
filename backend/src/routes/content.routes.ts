import { Router } from "express";
import {
  createContent,
  listContent,
} from "../controllers/content.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", authenticate, createContent);
router.get("/", listContent);

export default router;
