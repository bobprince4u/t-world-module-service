import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.routes.js";
import contentRoutes from "./routes/content.routes.js";

import { env } from "./config/env.js";

const app = express();

// Security headers
app.use(helmet());

// Cross-origin request configuration
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);

// Request body parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Basic API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

app.use("/api", apiLimiter);

// Health check
app.get("/health", (_req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;

  res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    message: databaseConnected
      ? "T-World Module Service is healthy"
      : "Database connection unavailable",
    database: databaseConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);

app.use("/api/content", contentRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Central error handler
const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  console.error("Application error:", error);

  const message =
    env.NODE_ENV === "production"
      ? "Internal server error"
      : error instanceof Error
        ? error.message
        : "Unknown error";

  res.status(500).json({
    success: false,
    message,
  });
};

app.use(errorHandler);

export default app;
