import { Router } from "express";
import { requireAdmin, publicUser } from "../auth/sessions.js";
import { hashPassword } from "../auth/passwords.js";
import {
  findAccountRequestById,
  listAccountRequests,
  markRequestApproved,
  markRequestRejected
} from "../db/accountRequests.js";
import { createUser, findUserByEmail } from "../db/users.js";
import { requireNewPassword, ValidationError } from "../validation.js";

function isUniqueConstraintError(error) {
  return error?.code === "SQLITE_CONSTRAINT_UNIQUE";
}

function requestIdFromParam(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    throw new ValidationError("id must be a positive integer");
  }
  return id;
}

function optionalString(value, label) {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value !== "string") {
    throw new ValidationError(`${label} must be a string`);
  }
  return value.trim();
}

function sendPendingRequestError(response, db, id) {
  const existingRequest = findAccountRequestById(db, id);
  if (!existingRequest) {
    response.status(404).json({ error: "request_not_found" });
    return;
  }

  response.status(409).json({ error: "request_not_pending" });
}

export function createAdminRouter() {
  const router = Router();

  router.use(requireAdmin);

  router.get("/account-requests", (request, response) => {
    const db = request.app.locals.db;
    response.json({ requests: listAccountRequests(db) });
  });

  router.post("/account-requests/:id/approve", async (request, response, next) => {
    try {
      const db = request.app.locals.db;
      const id = requestIdFromParam(request.params.id);
      const password = requireNewPassword(request.body?.password);
      const passwordHash = await hashPassword(password);

      const result = db.transaction(() => {
        const accountRequest = findAccountRequestById(db, id);
        if (!accountRequest) {
          return { status: 404 };
        }
        if (accountRequest.status !== "pending") {
          return { status: 409 };
        }
        if (findUserByEmail(db, accountRequest.email)) {
          return { status: 409, error: "email_already_exists" };
        }

        const user = createUser(db, {
          email: accountRequest.email,
          displayName: accountRequest.displayName,
          passwordHash,
          role: "member"
        });
        const approvedRequest = markRequestApproved(db, { id, approvedUserId: user.id });
        if (!approvedRequest) {
          return { status: 409 };
        }

        return { status: 200, request: approvedRequest, user };
      })();

      if (result.status === 404) {
        response.status(404).json({ error: "request_not_found" });
        return;
      }
      if (result.status === 409) {
        response.status(409).json({ error: result.error || "request_not_pending" });
        return;
      }

      response.json({ request: result.request, user: publicUser(result.user) });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        response.status(409).json({ error: "email_already_exists" });
        return;
      }
      next(error);
    }
  });

  router.post("/account-requests/:id/reject", (request, response, next) => {
    try {
      const db = request.app.locals.db;
      const id = requestIdFromParam(request.params.id);
      const adminNote = optionalString(request.body?.adminNote, "adminNote");
      const rejectedRequest = markRequestRejected(db, { id, adminNote });

      if (!rejectedRequest) {
        sendPendingRequestError(response, db, id);
        return;
      }

      response.json({ request: rejectedRequest });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
