import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      dbName: "t_world",
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    });

    console.log("MongoDB connected successfully");
    console.log(`Database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
}
