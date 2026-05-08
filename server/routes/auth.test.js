// @vitest-environment node

import bcrypt from "bcryptjs";
import http from "node:http";
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createUser } from "../db/users.js";
import { createSession } from "../db/sessions.js";
import { createApp } from "../index.js";
import { createTestDb } from "../test/testDb.js";

function createHarness() {
  const db = createTestDb();
  const config = {
    port: 0,
    databasePath: ":memory:",
    sessionCookieName: "gallery_session",
    sessionTtlDays: 14,
    cookieSecure: false,
    nodeEnv: "development"
  };

  return {
    db,
    app: createApp({ db, config }),
    config
  };
}

async function dispatch(app, { method, path, headers = {}, json }) {
  const body = json === undefined ? [] : [JSON.stringify(json)];
  const request = Readable.from(body);
  request.method = method;
  request.url = path;
  request.headers = {
    host: "localhost",
    accept: "application/json",
    ...headers
  };

  if (json !== undefined) {
    request.headers["content-type"] = "application/json";
    request.headers["content-length"] = Buffer.byteLength(JSON.stringify(json));
  }

  const response = new http.ServerResponse(request);
  const chunks = [];
  const originalEnd = response.end;
  let resolveResponse;
  let rejectResponse;

  response.end = function end(chunk, encoding, callback) {
    if (chunk) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
    }

    const result = originalEnd.call(this, chunk, encoding, callback);
    if (resolveResponse) {
      const rawBody = Buffer.concat(chunks).toString("utf8");
      const contentType = response.getHeader("content-type");
      resolveResponse({
        status: response.statusCode,
        headers: response.getHeaders(),
        body:
          contentType && String(contentType).includes("application/json") && rawBody
            ? JSON.parse(rawBody)
            : rawBody
      });
    }
    return result;
  };

  const finished = new Promise((resolve, reject) => {
    resolveResponse = resolve;
    rejectResponse = reject;

    response.once("error", reject);
  });

  app.handle(request, response);
  if (response.writableEnded) {
    const rawBody = Buffer.concat(chunks).toString("utf8");
    const contentType = response.getHeader("content-type");
    return {
      status: response.statusCode,
      headers: response.getHeaders(),
      body:
        contentType && String(contentType).includes("application/json") && rawBody
          ? JSON.parse(rawBody)
          : rawBody
    };
  }

  return finished;
}

function firstCookieHeader(headers) {
  const cookie = headers["set-cookie"];
  return Array.isArray(cookie) ? cookie[0] : cookie;
}

describe("/api/auth", () => {
  it("returns a null user for anonymous requests", async () => {
    const { app, db } = createHarness();

    await expect(dispatch(app, { method: "GET", path: "/api/auth/me" })).resolves.toMatchObject(
      {
        status: 200,
        body: { user: null }
      }
    );

    db.close();
  });

  it("rejects invalid login attempts with a generic error", async () => {
    const { app, db } = createHarness();
    createUser(db, {
      email: "member@example.com",
      displayName: "Member",
      passwordHash: bcrypt.hashSync("correct horse", 10),
      role: "member"
    });

    const response = await dispatch(app, {
      method: "POST",
      path: "/api/auth/login",
      json: { email: "member@example.com", password: "wrong password" }
    });

    expect(response).toMatchObject({
      status: 400,
      body: { error: "invalid_credentials" }
    });

    db.close();
  });

  it("logs a member in, exposes the public user, and sets an HttpOnly cookie", async () => {
    const { app, db } = createHarness();
    const user = createUser(db, {
      email: "member@example.com",
      displayName: "Member",
      passwordHash: bcrypt.hashSync("correct horse", 10),
      role: "member"
    });

    const loginResponse = await dispatch(app, {
      method: "POST",
      path: "/api/auth/login",
      json: { email: "member@example.com", password: "correct horse" }
    });

    expect(loginResponse).toMatchObject({
      status: 200,
      body: {
        user: {
          id: user.id,
          email: "member@example.com",
          displayName: "Member",
          role: "member"
        }
      }
    });

    const cookie = firstCookieHeader(loginResponse.headers);
    expect(cookie).toContain("gallery_session=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("Secure");

    const meResponse = await dispatch(app, {
      method: "GET",
      path: "/api/auth/me",
      headers: { cookie: cookie.split(";")[0] }
    });

    expect(meResponse).toMatchObject({
      status: 200,
      body: {
        user: {
          id: user.id,
          email: "member@example.com",
          displayName: "Member",
          role: "member"
        }
      }
    });

    db.close();
  });

  it("sets Secure on login cookies only when production cookieSecure config is true", async () => {
    const { app, db, config } = createHarness();
    config.nodeEnv = "production";
    config.cookieSecure = true;
    createUser(db, {
      email: "member@example.com",
      displayName: "Member",
      passwordHash: bcrypt.hashSync("correct horse", 10),
      role: "member"
    });

    const loginResponse = await dispatch(app, {
      method: "POST",
      path: "/api/auth/login",
      json: { email: "member@example.com", password: "correct horse" }
    });

    expect(firstCookieHeader(loginResponse.headers)).toContain("Secure");

    db.close();
  });

  it("deletes stale session rows when a cookie points to a hidden expired session", async () => {
    const { app, db } = createHarness();
    const user = createUser(db, {
      email: "member@example.com",
      displayName: "Member",
      passwordHash: bcrypt.hashSync("correct horse", 10),
      role: "member"
    });
    createSession(db, {
      id: "expired-session",
      userId: user.id,
      expiresAt: "2000-01-01T00:00:00.000Z"
    });

    const response = await dispatch(app, {
      method: "GET",
      path: "/api/auth/me",
      headers: { cookie: "gallery_session=expired-session" }
    });

    expect(response).toMatchObject({
      status: 200,
      body: { user: null }
    });
    expect(firstCookieHeader(response.headers)).toContain("gallery_session=");
    expect(
      db.prepare("SELECT COUNT(*) AS count FROM sessions WHERE id = ?").get("expired-session").count
    ).toBe(0);

    db.close();
  });

  it("deletes expired sessions before creating a new login session", async () => {
    const { app, db } = createHarness();
    const user = createUser(db, {
      email: "member@example.com",
      displayName: "Member",
      passwordHash: bcrypt.hashSync("correct horse", 10),
      role: "member"
    });
    createSession(db, {
      id: "expired-session",
      userId: user.id,
      expiresAt: "2000-01-01T00:00:00.000Z"
    });

    await dispatch(app, {
      method: "POST",
      path: "/api/auth/login",
      json: { email: "member@example.com", password: "correct horse" }
    });

    expect(
      db.prepare("SELECT COUNT(*) AS count FROM sessions WHERE id = ?").get("expired-session").count
    ).toBe(0);

    db.close();
  });

  it("logs the active session out and clears the cookie", async () => {
    const { app, db } = createHarness();

    createUser(db, {
      email: "member@example.com",
      displayName: "Member",
      passwordHash: bcrypt.hashSync("correct horse", 10),
      role: "member"
    });

    const loginResponse = await dispatch(app, {
      method: "POST",
      path: "/api/auth/login",
      json: { email: "member@example.com", password: "correct horse" }
    });
    const cookie = firstCookieHeader(loginResponse.headers).split(";")[0];

    const logoutResponse = await dispatch(app, {
      method: "POST",
      path: "/api/auth/logout",
      headers: { cookie }
    });
    expect(logoutResponse).toMatchObject({
      status: 200,
      body: { ok: true }
    });

    const clearedCookie = firstCookieHeader(logoutResponse.headers);
    expect(clearedCookie).toContain("gallery_session=");
    expect(clearedCookie).toContain("HttpOnly");
    expect(clearedCookie).toContain("SameSite=Lax");

    const meResponse = await dispatch(app, {
      method: "GET",
      path: "/api/auth/me",
      headers: { cookie }
    });

    expect(meResponse).toMatchObject({
      status: 200,
      body: { user: null }
    });

    db.close();
  });
});
