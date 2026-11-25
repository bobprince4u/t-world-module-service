import { z } from "zod";

export const contentIdSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid content ID"),
});
