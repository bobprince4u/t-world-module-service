import type { RequestHandler } from "express";
import { Content } from "../models/content.model.js";
import { createContentSchema } from "../validators/content.validation.js";

type CreateContentRecord = (input: {
  title: string;
  body: string;
  tags: string[];
  createdBy: string;
}) => Promise<unknown>;

export function createContentController(
  createRecord: CreateContentRecord,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const parsed = createContentSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          message: "Invalid content data",
          errors: parsed.error.issues,
        });
        return;
      }

      const user = req.authUser;

      if (!user) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      const content = await createRecord({
        ...parsed.data,
        createdBy: user.id,
      });

      res.status(201).json({ content });
    } catch (error) {
      next(error);
    }
  };
}

export const createContent = createContentController((input) =>
  Content.create(input),
);
