import { Router } from "express";
import { publicUser, createLoginSession } from "../auth/sessions.js";
import { hashPassword } from "../auth/passwords.js";
import { countUsers, createUser } from "../db/users.js";
import {
  requireBoolean,
  requireNewPassword,
  requireString,
  ValidationError
} from "../validation.js";

function isUniqueConstraintError(error) {
  return error?.code === "SQLITE_CONSTRAINT_UNIQUE";
}

function requireAccepted(value, label) {
  if (requireBoolean(value, label) !== true) {
    throw new ValidationError(`${label} must be accepted`);
  }
}

export function createSetupRouter() {
  const router = Router();

  router.get("/status", (request, response) => {
    const db = request.app.locals.db;
    response.json({ needsFirstAdmin: countUsers(db) === 0 });
  });

  router.post("/first-admin", async (request, response, next) => {
    try {
      const db = request.app.locals.db;
      const config = request.app.locals.config;

      if (countUsers(db) !== 0) {
        response.status(409).json({ error: "setup_complete" });
        return;
      }

      const displayName = requireString(request.body?.displayName, "displayName");
      const email = requireString(request.body?.email, "email").toLowerCase();
      const password = requireNewPassword(request.body?.password);
      requireAccepted(request.body?.ageConfirmed, "ageConfirmed");
      requireAccepted(request.body?.rulesAccepted, "rulesAccepted");
      const passwordHash = await hashPassword(password);

      let admin;
      try {
        admin = db.transaction(() => {
          if (countUsers(db) !== 0) {
            return null;
          }

          return createUser(db, {
            email,
            displayName,
            passwordHash,
            role: "admin"
          });
        })();
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          response.status(409).json({ error: "setup_complete" });
          return;
        }
        throw error;
      }

      if (!admin) {
        response.status(409).json({ error: "setup_complete" });
        return;
      }

      createLoginSession(response, { db, config, user: admin });
      response.json({ user: publicUser(admin) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
