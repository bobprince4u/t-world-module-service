import { z } from "zod";

export const aiSummarySchema = z.object({
  tone: z.enum(["professional", "friendly", "simple"]).default("professional"),
  length: z.enum(["short", "medium", "long"]).default("medium"),
});
