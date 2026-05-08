import express from "express";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getConfig } from "./config.js";
import { openDatabase } from "./db/connection.js";
import { ValidationError } from "./validation.js";
import { attachAuth } from "./auth/sessions.js";
import { createAuthRouter } from "./routes/auth.js";
import { createSetupRouter } from "./routes/setup.js";
import { createAccountRequestsRouter } from "./routes/accountRequests.js";
import { createAdminRouter } from "./routes/admin.js";
import { createGalleryAccessRouter } from "./routes/galleryAccess.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const indexHtmlPath = path.join(distDir, "index.html");

export function shouldServeSpaFallback(request) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return false;
  }

  if (request.path.startsWith("/api/")) {
    return false;
  }

  if (!request.accepts("html") || path.extname(request.path)) {
    return false;
  }

  return true;
}

export function createApp({ config = getConfig(), db } = {}) {
  const app = express();
  const runtimeDb = db ?? openDatabase(config.databasePath);

  app.locals.config = config;
  app.locals.db = runtimeDb;

  app.use(express.json({ limit: "64kb" }));
  app.use(cookieParser());
  app.use(attachAuth);

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.use("/api/auth", createAuthRouter());
  app.use("/api/setup", createSetupRouter());
  app.use("/api/account-requests", createAccountRequestsRouter());
  app.use("/api/admin", createAdminRouter());
  app.use("/api/gallery-access", createGalleryAccessRouter());

  app.use((error, _request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
      response.status(400).json({ error: "invalid_json" });
      return;
    }

    if (error instanceof ValidationError) {
      response.status(400).json({ error: "validation_error", message: error.message });
      return;
    }

    console.error(error);
    response.status(500).json({ error: "server_error" });
  });

  app.use(express.static(distDir));

  app.use((request, response, next) => {
    if (!shouldServeSpaFallback(request)) {
      next();
      return;
    }

    response.sendFile(indexHtmlPath);
  });

  return app;
}
