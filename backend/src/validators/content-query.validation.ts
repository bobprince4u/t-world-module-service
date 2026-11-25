import { z } from "zod";

const optionalQueryString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().optional(),
);

export const contentQuerySchema = z.object({
  tag: optionalQueryString,
  q: optionalQueryString,
  page: z.preprocess(
    (value) => (value === undefined || value === "" ? "1" : value),
    z.coerce.number().int().positive(),
  ),
});
