import { createServer } from "node:http";
import mongoose from "mongoose";

import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

async function startServer(): Promise<void> {
  try {
    // Connect to MongoDB before accepting requests.
    await connectDatabase();

    const server = createServer(app);

    server.listen(env.PORT, () => {
      console.log(`T-World API running at http://localhost:${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
    });

    // Graceful shutdown
    const shutdown = (signal: string): void => {
      console.log(`${signal} received. Shutting down...`);

      server.close(() => {
        void mongoose
          .disconnect()
          .then(() => {
            console.log("MongoDB disconnected successfully");
            process.exitCode = 0;
          })
          .catch((error: unknown) => {
            console.error("MongoDB shutdown error:", error);
            process.exitCode = 1;
          });
      });
    };

    process.once("SIGTERM", () => shutdown("SIGTERM"));
    process.once("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exitCode = 1;
  }
}

void startServer();
