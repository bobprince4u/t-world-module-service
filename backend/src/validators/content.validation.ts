import { z } from "zod";

export const createContentSchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().min(1),
  tags: z.array(z.string().trim().min(1)).optional().default([]),
});
