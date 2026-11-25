import { Router } from "express";
import { createContent } from "../controllers/content.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", authenticate, createContent);

export default router;
