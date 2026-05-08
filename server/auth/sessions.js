import { nanoid } from "nanoid";
import {
  deleteExpiredSessions,
  deleteSession,
  createSession,
  findSessionById
} from "../db/sessions.js";
import { findUserById } from "../db/users.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isSecureCookieEnabled(config = {}) {
  return config.nodeEnv === "production" && config.cookieSecure === true;
}

function buildCookieOptions(config = {}) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookieEnabled(config),
    path: "/",
    maxAge: Number(config.sessionTtlDays || 14) * MS_PER_DAY
  };
}

function buildClearCookieOptions(config = {}) {
  const { maxAge, ...cookieOptions } = buildCookieOptions(config);
  return cookieOptions;
}

export function publicUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role
  };
}

export function createLoginSession(response, { db, config, user }) {
  deleteExpiredSessions(db);

  const id = nanoid();
  const expiresAt = new Date(Date.now() + Number(config.sessionTtlDays || 14) * MS_PER_DAY).toISOString();
  const session = createSession(db, { id, userId: user.id, expiresAt });

  response.cookie(config.sessionCookieName, session.id, buildCookieOptions(config));
  return session;
}

export function clearLoginSession(response, { db, config, sessionId }) {
  if (sessionId) {
    deleteSession(db, sessionId);
  }

  response.clearCookie(config.sessionCookieName, buildClearCookieOptions(config));
}

export function attachAuth(request, response, next) {
  const { db, config } = request.app.locals;
  const sessionId = request.cookies?.[config.sessionCookieName];

  request.session = null;
  request.user = null;

  if (!sessionId) {
    next();
    return;
  }

  const session = findSessionById(db, sessionId);
  if (!session) {
    deleteSession(db, sessionId);
    response.clearCookie(config.sessionCookieName, buildClearCookieOptions(config));
    next();
    return;
  }

  const user = findUserById(db, session.userId);
  if (!user || user.status !== "active") {
    deleteSession(db, session.id);
    response.clearCookie(config.sessionCookieName, buildClearCookieOptions(config));
    next();
    return;
  }

  request.session = session;
  request.user = publicUser(user);
  next();
}

export function requireAdmin(request, response, next) {
  if (!request.user) {
    response.status(401).json({ error: "unauthorized" });
    return;
  }

  if (request.user.role !== "admin") {
    response.status(403).json({ error: "forbidden" });
    return;
  }

  next();
}
