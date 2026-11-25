import { z } from "zod";

export const tokenConversionSchema = z.object({
  toAsset: z.enum(["MOCK_USDT", "MOCK_ETH"]),
  amount: z.number().positive().finite(),
});
