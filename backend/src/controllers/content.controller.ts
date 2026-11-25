import type { RequestHandler } from "express";
import { Content } from "../models/content.model.js";
import { createContentSchema } from "../validators/content.validation.js";
import { contentQuerySchema } from "../validators/content-query.validation.js";

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

const PAGE_SIZE = 10;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const listContent: RequestHandler = async (req, res, next) => {
  try {
    const parsed = contentQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid query parameters",
        errors: parsed.error.issues,
      });
      return;
    }

    const { tag, q, page } = parsed.data;

    const filter = {
      ...(tag ? { tags: tag } : {}),
      ...(q
        ? {
            $or: [
              { title: { $regex: escapeRegex(q), $options: "i" } },
              { body: { $regex: escapeRegex(q), $options: "i" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      Content.find(filter as never)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
      Content.countDocuments(filter as never),
    ]);

    res.status(200).json({
      items,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (error) {
    next(error);
  }
};
