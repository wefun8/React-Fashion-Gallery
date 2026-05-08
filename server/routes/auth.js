import { Router } from "express";
import { publicUser, createLoginSession, clearLoginSession } from "../auth/sessions.js";
import { verifyPassword } from "../auth/passwords.js";
import { requireString, ValidationError } from "../validation.js";
import { findUserByEmail } from "../db/users.js";

const DUMMY_PASSWORD_HASH =
  "$2b$12$JIm2f73nAKTw0VqN8tEasugqyqFGvETifSjHKx0o5dmegp8Z6tsWm";

function sendInvalidCredentials(response) {
  response.status(400).json({ error: "invalid_credentials" });
}

export function createAuthRouter() {
  const router = Router();

  router.get("/me", (request, response) => {
    response.json({ user: publicUser(request.user) });
  });

  router.post("/login", async (request, response, next) => {
    try {
      const db = request.app.locals.db;
      const config = request.app.locals.config;
      const email = requireString(request.body?.email, "email").toLowerCase();
      const password = requireString(request.body?.password, "password");
      const user = findUserByEmail(db, email);
      const passwordHash = user?.passwordHash || DUMMY_PASSWORD_HASH;
      const passwordMatches = await verifyPassword(password, passwordHash);

      if (!user || user.status !== "active" || !passwordMatches) {
        sendInvalidCredentials(response);
        return;
      }

      createLoginSession(response, { db, config, user });
      response.json({ user: publicUser(user) });
    } catch (error) {
      if (error instanceof ValidationError) {
        sendInvalidCredentials(response);
        return;
      }

      next(error);
    }
  });

  router.post("/logout", (request, response) => {
    const db = request.app.locals.db;
    const config = request.app.locals.config;

    clearLoginSession(response, {
      db,
      config,
      sessionId: request.session?.id
    });

    response.json({ ok: true });
  });

  return router;
}
