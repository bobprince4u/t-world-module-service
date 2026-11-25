import { Router } from "express";
import { createSummarizeController } from "../controllers/ai.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { MockAiProvider } from "../services/ai/mock-ai.provider.js";

const router = Router();
const summarize = createSummarizeController(new MockAiProvider());

router.post("/:id/ai/summarize", authenticate, summarize);

export default router;
