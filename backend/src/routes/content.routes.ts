import { Router } from "express";
import {
  createContent,
  getContentById,
  listContent,
} from "../controllers/content.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", authenticate, createContent);
router.get("/:id", getContentById);
router.get("/", listContent);

export default router;
