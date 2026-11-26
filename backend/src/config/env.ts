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

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  AI_PROVIDER: z.enum(["mock", "gemini"]).default("mock"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment configuration:");
  console.error(z.treeifyError(result.error));
  throw new Error("Environment validation failed");
}

export const env = result.data;
