import { Router } from "express";
import { createAccountRequest } from "../db/accountRequests.js";
import { requireBoolean, requireString, ValidationError } from "../validation.js";

function requireAccepted(value, label) {
  if (requireBoolean(value, label) !== true) {
    throw new ValidationError(`${label} must be accepted`);
  }
}

function validateAccountRequest(body = {}) {
  const displayName = requireString(body.displayName, "displayName");
  const email = requireString(body.email, "email").toLowerCase();
  const contact = requireString(body.contact, "contact");
  const reason = requireString(body.reason, "reason");
  if (reason.length < 10) {
    throw new ValidationError("reason must be at least 10 characters");
  }

  requireAccepted(body.ageConfirmed, "ageConfirmed");
  requireAccepted(body.rulesAccepted, "rulesAccepted");

  return {
    displayName,
    email,
    contact,
    reason,
    ageConfirmed: true,
    rulesAccepted: true
  };
}

export function createAccountRequestsRouter() {
  const router = Router();

  router.post("/", (request, response, next) => {
    try {
      const db = request.app.locals.db;
      const accountRequest = createAccountRequest(db, validateAccountRequest(request.body));
      response.status(201).json({ request: accountRequest });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
