import { Router } from "express";
import multer from "multer";

import { uploadMedia, promoteMedia } from "../controllers/media.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

router.post("/upload", authenticate, upload.single("file"), uploadMedia);
router.post("/:id/promote", authenticate, promoteMedia);

export default router;
