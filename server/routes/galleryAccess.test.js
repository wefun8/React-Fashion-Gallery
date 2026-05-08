// @vitest-environment node

import bcrypt from "bcryptjs";
import http from "node:http";
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createUser } from "../db/users.js";
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

  response.end = function end(chunk, encoding, callback) {
    if (chunk) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
    }

    const result = originalEnd.call(this, chunk, encoding, callback);
    if (resolveResponse) {
      resolveResponse(readResponse(response, chunks));
    }
    return result;
  };

  const finished = new Promise((resolve, reject) => {
    resolveResponse = resolve;
    response.once("error", reject);
  });

  app.handle(request, response);
  if (response.writableEnded) {
    return readResponse(response, chunks);
  }

  return finished;
}

function readResponse(response, chunks) {
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

function firstCookieHeader(headers) {
  const cookie = headers["set-cookie"];
  return Array.isArray(cookie) ? cookie[0] : cookie;
}

async function login(app, { email, password }) {
  const response = await dispatch(app, {
    method: "POST",
    path: "/api/auth/login",
    json: { email, password }
  });

  return firstCookieHeader(response.headers).split(";")[0];
}

describe("/api/gallery-access", () => {
  it("reports visitor access state and restricted tags", async () => {
    const { app, db } = createHarness();

    await expect(
      dispatch(app, { method: "GET", path: "/api/gallery-access" })
    ).resolves.toMatchObject({
      status: 200,
      body: {
        authenticated: false,
        role: null,
        restrictedTags: ["members", "private"]
      }
    });

    db.close();
  });

  it("reports logged-in member and admin roles", async () => {
    const { app, db } = createHarness();
    createUser(db, {
      email: "member@example.com",
      displayName: "Member",
      passwordHash: bcrypt.hashSync("correct horse", 10),
      role: "member"
    });
    createUser(db, {
      email: "admin@example.com",
      displayName: "Admin",
      passwordHash: bcrypt.hashSync("correct horse", 10),
      role: "admin"
    });

    const memberCookie = await login(app, {
      email: "member@example.com",
      password: "correct horse"
    });
    await expect(
      dispatch(app, {
        method: "GET",
        path: "/api/gallery-access",
        headers: { cookie: memberCookie }
      })
    ).resolves.toMatchObject({
      status: 200,
      body: { authenticated: true, role: "member" }
    });

    const adminCookie = await login(app, {
      email: "admin@example.com",
      password: "correct horse"
    });
    await expect(
      dispatch(app, {
        method: "GET",
        path: "/api/gallery-access",
        headers: { cookie: adminCookie }
      })
    ).resolves.toMatchObject({
      status: 200,
      body: { authenticated: true, role: "admin" }
    });

    db.close();
  });
});
