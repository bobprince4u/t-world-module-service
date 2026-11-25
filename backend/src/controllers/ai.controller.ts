import type { RequestHandler } from "express";
import type { AiProvider } from "../services/ai/ai-provider.js";
import { Content } from "../models/content.model.js";
import { aiSummarySchema } from "../validators/ai-summary.validation.js";
import { AiTimeoutError, withTimeout } from "../services/ai/with-timeout.js";

type FindContent = (id: string) => Promise<{
  title: string;
  body: string;
} | null>;

const findContent: FindContent = async (id) => {
  const content = await Content.findOne({ _id: id } as never).lean();
  return content ? { title: content.title, body: content.body } : null;
};

export function createSummarizeController(
  provider: AiProvider,
  lookupContent: FindContent = findContent,
  timeoutMs = 15_000,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const user = req.authUser;

      if (!user) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      const params = req.params as { id?: string };
      const id = params.id;

      if (!id || !/^[a-f\d]{24}$/i.test(id)) {
        res.status(400).json({ message: "Invalid content ID" });
        return;
      }

      const parsed = aiSummarySchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          message: "Invalid summary options",
          errors: parsed.error.issues,
        });
        return;
      }

      const content = await lookupContent(id);

      if (!content) {
        res.status(404).json({ message: "Content not found" });
        return;
      }

      try {
        const summary = await withTimeout(
          provider.summarize({
            title: content.title,
            body: content.body,
            ...parsed.data,
          }),
          timeoutMs,
        );

        res.status(200).json({ summary });
      } catch (error) {
        if (error instanceof AiTimeoutError) {
          res.status(504).json({ message: "AI provider timed out" });
          return;
        }

        res.status(502).json({ message: "AI provider failed" });
      }
    } catch (error) {
      next(error);
    }
  };
}
