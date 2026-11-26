import type { RequestHandler } from "express";

import { createMediaService } from "../services/storage/media.service.js";
import { cloudinaryProvider } from "../services/storage/cloudinary.provider.js";
import { s3Provider } from "../services/storage/s3.provider.js";

const mediaService = createMediaService({
  cloudinary: cloudinaryProvider,
  s3: s3Provider,
});

export const uploadMedia: RequestHandler = async (req, res, next) => {
  try {
    const user = req.authUser;
    const file = (
      req as typeof req & {
        file?: {
          buffer: Buffer;
          originalname: string;
          mimetype: string;
          size: number;
        };
      }
    ).file;

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!file) {
      res.status(400).json({
        success: false,
        message: "A file is required",
      });
      return;
    }

    const media = await mediaService.upload({
      userId: user.id,
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });

    res.status(201).json({
      success: true,
      media,
    });
  } catch (error) {
    next(error);
  }
};

export const promoteMedia: RequestHandler = async (req, res, next) => {
  try {
    const user = req.authUser;

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const mediaId = req.params.id;

    if (typeof mediaId !== "string") {
      res.status(400).json({ success: false, message: "Invalid media ID" });
      return;
    }

    const media = await mediaService.promote(mediaId, user.id);

    res.status(200).json({
      success: true,
      media,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Invalid media ID") {
        res.status(400).json({ success: false, message: error.message });
        return;
      }

      if (
        error.message === "Media not found" ||
        error.message === "Media has already been promoted"
      ) {
        res.status(404).json({ success: false, message: error.message });
        return;
      }
    }

    next(error);
  }
};
