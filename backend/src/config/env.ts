import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(5000),

  MONGODB_URI: z
    .string()
    .min(1, "MONGODB_URI is required")
    .regex(/^mongodb(\+srv)?:\/\//, "Invalid MongoDB connection string"),

  FIREBASE_PROJECT_ID: z.string().min(1, "FIREBASE_PROJECT_ID is required"),

  FIREBASE_SERVICE_ACCOUNT_PATH: z
    .string()
    .min(1, "FIREBASE_SERVICE_ACCOUNT_PATH is required"),

  CLIENT_URL: z.string().url().default("http://localhost:5173"),

  AI_PROVIDER: z.enum(["mock", "gemini"]).default("mock"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment configuration:");
  console.error(z.treeifyError(result.error));
  throw new Error("Environment validation failed");
}

export const env = result.data;
