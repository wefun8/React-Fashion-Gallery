import { describe, expect, it } from "vitest";
import { createTestDb } from "../test/testDb.js";
import { countUsers, createUser, findUserByEmail } from "./users.js";
import {
  createAccountRequest,
  findAccountRequestById,
  listAccountRequests,
  markRequestApproved,
  markRequestRejected
} from "./accountRequests.js";
import {
  createSession,
  deleteExpiredSessions,
  findSessionById
} from "./sessions.js";

describe("database schema", () => {
  it("creates users and account requests", () => {
    const db = createTestDb();

    expect(countUsers(db)).toBe(0);

    const user = createUser(db, {
      email: "Admin@Example.com",
      displayName: "Admin",
      passwordHash: "hash",
      role: "admin"
    });

    expect(user.role).toBe("admin");
    expect(countUsers(db)).toBe(1);
    expect(findUserByEmail(db, "admin@example.com").id).toBe(user.id);

    const request = createAccountRequest(db, {
      displayName: "Visitor",
      email: "visitor@example.com",
      contact: "@visitor",
      reason: "Please approve me.",
      ageConfirmed: true,
      rulesAccepted: true
    });

    expect(request.status).toBe("pending");
    expect(listAccountRequests(db)[0].id).toBe(request.id);

    db.close();
  });

  it("rejects duplicate normalized user emails", () => {
    const db = createTestDb();

    createUser(db, {
      email: "Admin@Example.com",
      displayName: "Admin",
      passwordHash: "hash",
      role: "admin"
    });

    expect(() =>
      createUser(db, {
        email: " admin@example.com ",
        displayName: "Other Admin",
        passwordHash: "hash",
        role: "admin"
      })
    ).toThrow();

    db.close();
  });

  it("rejects invalid user roles", () => {
    const db = createTestDb();

    expect(() =>
      createUser(db, {
        email: "visitor@example.com",
        displayName: "Visitor",
        passwordHash: "hash",
        role: "visitor"
      })
    ).toThrow();

    db.close();
  });

  it("enforces session user foreign keys and cascades user deletes", () => {
    const db = createTestDb();

    expect(() =>
      createSession(db, {
        id: "missing-user",
        userId: 404,
        expiresAt: "2999-01-01T00:00:00.000Z"
      })
    ).toThrow();

    const user = createUser(db, {
      email: "member@example.com",
      displayName: "Member",
      passwordHash: "hash",
      role: "member"
    });

    const session = createSession(db, {
      id: "member-session",
      userId: user.id,
      expiresAt: "2999-01-01T00:00:00.000Z"
    });

    expect(session.userId).toBe(user.id);

    db.prepare("DELETE FROM users WHERE id = ?").run(user.id);

    expect(findSessionById(db, "member-session")).toBeNull();

    db.close();
  });

  it("removes expired sessions without deleting future sessions", () => {
    const db = createTestDb();
    const user = createUser(db, {
      email: "member@example.com",
      displayName: "Member",
      passwordHash: "hash",
      role: "member"
    });

    createSession(db, {
      id: "expired-session",
      userId: user.id,
      expiresAt: "2000-01-01T00:00:00.000Z"
    });
    createSession(db, {
      id: "future-session",
      userId: user.id,
      expiresAt: "2999-01-01T00:00:00.000Z"
    });

    expect(findSessionById(db, "expired-session")).toBeNull();
    expect(findSessionById(db, "future-session").id).toBe("future-session");

    deleteExpiredSessions(db);

    expect(findSessionById(db, "expired-session")).toBeNull();
    expect(findSessionById(db, "future-session").id).toBe("future-session");

    db.close();
  });

  it("lists account requests newest first", () => {
    const db = createTestDb();

    const first = createAccountRequest(db, {
      displayName: "First",
      email: "first@example.com",
      contact: "@first",
      reason: "First request.",
      ageConfirmed: true,
      rulesAccepted: true
    });
    const second = createAccountRequest(db, {
      displayName: "Second",
      email: "second@example.com",
      contact: "@second",
      reason: "Second request.",
      ageConfirmed: true,
      rulesAccepted: true
    });

    expect(listAccountRequests(db).map((request) => request.id)).toEqual([second.id, first.id]);

    db.close();
  });

  it("only transitions pending account requests once", () => {
    const db = createTestDb();
    const admin = createUser(db, {
      email: "admin@example.com",
      displayName: "Admin",
      passwordHash: "hash",
      role: "admin"
    });

    const approvalRequest = createAccountRequest(db, {
      displayName: "Approve Me",
      email: "approve@example.com",
      contact: "@approve",
      reason: "Please approve me.",
      ageConfirmed: true,
      rulesAccepted: true
    });

    const approved = markRequestApproved(db, {
      id: approvalRequest.id,
      approvedUserId: admin.id
    });

    expect(approved.status).toBe("approved");
    expect(markRequestRejected(db, { id: approvalRequest.id, adminNote: "Nope." })).toBeNull();
    expect(findAccountRequestById(db, approvalRequest.id).status).toBe("approved");

    const rejectionRequest = createAccountRequest(db, {
      displayName: "Reject Me",
      email: "reject@example.com",
      contact: "@reject",
      reason: "Please reject me.",
      ageConfirmed: true,
      rulesAccepted: true
    });

    const rejected = markRequestRejected(db, {
      id: rejectionRequest.id,
      adminNote: "Not enough detail."
    });

    expect(rejected.status).toBe("rejected");
    expect(markRequestApproved(db, { id: rejectionRequest.id, approvedUserId: admin.id })).toBeNull();
    expect(findAccountRequestById(db, rejectionRequest.id).status).toBe("rejected");

    db.close();
  });
});
