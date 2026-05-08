// @vitest-environment node

import bcrypt from "bcryptjs";
import http from "node:http";
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createUser, findUserByEmail } from "../db/users.js";
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

function validRequest(overrides = {}) {
  return {
    displayName: "Future Member",
    email: "future@example.com",
    contact: "future@example.com",
    reason: "I would like to join this gallery community.",
    ageConfirmed: true,
    rulesAccepted: true,
    ...overrides
  };
}

describe("setup and account request routes", () => {
  it("reports setup status and creates the first admin only once with a login cookie", async () => {
    const { app, db } = createHarness();

    await expect(dispatch(app, { method: "GET", path: "/api/setup/status" })).resolves.toMatchObject(
      {
        status: 200,
        body: { needsFirstAdmin: true }
      }
    );

    const setupResponse = await dispatch(app, {
      method: "POST",
      path: "/api/setup/first-admin",
      json: {
        displayName: "Admin One",
        email: "Admin@Example.com",
        password: "correct horse",
        ageConfirmed: true,
        rulesAccepted: true
      }
    });

    expect(setupResponse).toMatchObject({
      status: 200,
      body: {
        user: {
          email: "admin@example.com",
          displayName: "Admin One",
          role: "admin"
        }
      }
    });
    expect(firstCookieHeader(setupResponse.headers)).toContain("gallery_session=");
    expect(firstCookieHeader(setupResponse.headers)).toContain("HttpOnly");

    await expect(dispatch(app, { method: "GET", path: "/api/setup/status" })).resolves.toMatchObject(
      {
        status: 200,
        body: { needsFirstAdmin: false }
      }
    );

    await expect(
      dispatch(app, {
        method: "POST",
        path: "/api/setup/first-admin",
        json: {}
      })
    ).resolves.toMatchObject({
      status: 409,
      body: { error: "setup_complete" }
    });

    db.close();
  });

  it("creates pending account requests and validates confirmations and minimum reason length", async () => {
    const { app, db } = createHarness();

    await expect(
      dispatch(app, {
        method: "POST",
        path: "/api/account-requests",
        json: validRequest({ reason: "too short" })
      })
    ).resolves.toMatchObject({
      status: 400,
      body: { error: "validation_error" }
    });

    await expect(
      dispatch(app, {
        method: "POST",
        path: "/api/account-requests",
        json: validRequest({ ageConfirmed: false })
      })
    ).resolves.toMatchObject({
      status: 400,
      body: { error: "validation_error" }
    });

    await expect(
      dispatch(app, {
        method: "POST",
        path: "/api/account-requests",
        json: validRequest({ rulesAccepted: false })
      })
    ).resolves.toMatchObject({
      status: 400,
      body: { error: "validation_error" }
    });

    await expect(
      dispatch(app, {
        method: "POST",
        path: "/api/account-requests",
        json: {
          reason: "This request has enough detail.",
          ageConfirmed: true,
          rulesAccepted: true
        }
      })
    ).resolves.toMatchObject({
      status: 400,
      body: { error: "validation_error" }
    });

    const response = await dispatch(app, {
      method: "POST",
      path: "/api/account-requests",
      json: validRequest()
    });

    expect(response).toMatchObject({
      status: 201,
      body: {
        request: {
          displayName: "Future Member",
          email: "future@example.com",
          contact: "future@example.com",
          reason: "I would like to join this gallery community.",
          ageConfirmed: true,
          rulesAccepted: true,
          status: "pending"
        }
      }
    });
    expect(findUserByEmail(db, "future@example.com")).toBeNull();

    db.close();
  });

  it("allows only admins to list account requests", async () => {
    const { app, db } = createHarness();
    createUser(db, {
      email: "admin@example.com",
      displayName: "Admin",
      passwordHash: bcrypt.hashSync("correct horse", 10),
      role: "admin"
    });
    createUser(db, {
      email: "member@example.com",
      displayName: "Member",
      passwordHash: bcrypt.hashSync("correct horse", 10),
      role: "member"
    });
    await dispatch(app, {
      method: "POST",
      path: "/api/account-requests",
      json: validRequest()
    });

    await expect(
      dispatch(app, { method: "GET", path: "/api/admin/account-requests" })
    ).resolves.toMatchObject({
      status: 401,
      body: { error: "unauthorized" }
    });

    const memberCookie = await login(app, {
      email: "member@example.com",
      password: "correct horse"
    });
    await expect(
      dispatch(app, {
        method: "GET",
        path: "/api/admin/account-requests",
        headers: { cookie: memberCookie }
      })
    ).resolves.toMatchObject({
      status: 403,
      body: { error: "forbidden" }
    });

    const adminCookie = await login(app, {
      email: "admin@example.com",
      password: "correct horse"
    });
    await expect(
      dispatch(app, {
        method: "GET",
        path: "/api/admin/account-requests",
        headers: { cookie: adminCookie }
      })
    ).resolves.toMatchObject({
      status: 200,
      body: {
        requests: [
          {
            email: "future@example.com",
            status: "pending"
          }
        ]
      }
    });

    db.close();
  });

  it("requires admin access for request approval and rejection", async () => {
    const { app, db } = createHarness();
    createUser(db, {
      email: "member@example.com",
      displayName: "Member",
      passwordHash: bcrypt.hashSync("correct horse", 10),
      role: "member"
    });
    const requestResponse = await dispatch(app, {
      method: "POST",
      path: "/api/account-requests",
      json: validRequest()
    });

    await expect(
      dispatch(app, {
        method: "POST",
        path: `/api/admin/account-requests/${requestResponse.body.request.id}/approve`,
        json: { password: "member horse" }
      })
    ).resolves.toMatchObject({
      status: 401,
      body: { error: "unauthorized" }
    });

    const memberCookie = await login(app, {
      email: "member@example.com",
      password: "correct horse"
    });

    await expect(
      dispatch(app, {
        method: "POST",
        path: `/api/admin/account-requests/${requestResponse.body.request.id}/approve`,
        headers: { cookie: memberCookie },
        json: { password: "member horse" }
      })
    ).resolves.toMatchObject({
      status: 403,
      body: { error: "forbidden" }
    });

    await expect(
      dispatch(app, {
        method: "POST",
        path: `/api/admin/account-requests/${requestResponse.body.request.id}/reject`,
        headers: { cookie: memberCookie },
        json: { adminNote: "No access." }
      })
    ).resolves.toMatchObject({
      status: 403,
      body: { error: "forbidden" }
    });

    db.close();
  });

  it("approves pending requests by creating a member and marking the request approved", async () => {
    const { app, db } = createHarness();
    createUser(db, {
      email: "admin@example.com",
      displayName: "Admin",
      passwordHash: bcrypt.hashSync("correct horse", 10),
      role: "admin"
    });
    const requestResponse = await dispatch(app, {
      method: "POST",
      path: "/api/account-requests",
      json: validRequest()
    });
    const adminCookie = await login(app, {
      email: "admin@example.com",
      password: "correct horse"
    });

    const approveResponse = await dispatch(app, {
      method: "POST",
      path: `/api/admin/account-requests/${requestResponse.body.request.id}/approve`,
      headers: { cookie: adminCookie },
      json: { password: "member horse" }
    });

    expect(approveResponse).toMatchObject({
      status: 200,
      body: {
        request: {
          id: requestResponse.body.request.id,
          status: "approved"
        },
        user: {
          email: "future@example.com",
          displayName: "Future Member",
          role: "member"
        }
      }
    });

    const user = findUserByEmail(db, "future@example.com");
    expect(user).toMatchObject({ role: "member", status: "active" });
    expect(await bcrypt.compare("member horse", user.passwordHash)).toBe(true);

    await expect(
      dispatch(app, {
        method: "POST",
        path: "/api/admin/account-requests/999/approve",
        headers: { cookie: adminCookie },
        json: { password: "member horse" }
      })
    ).resolves.toMatchObject({
      status: 404,
      body: { error: "request_not_found" }
    });

    await expect(
      dispatch(app, {
        method: "POST",
        path: `/api/admin/account-requests/${requestResponse.body.request.id}/approve`,
        headers: { cookie: adminCookie },
        json: { password: "member horse" }
      })
    ).resolves.toMatchObject({
      status: 409,
      body: { error: "request_not_pending" }
    });

    db.close();
  });

  it("rejects overlong new passwords before hashing", async () => {
    const { app, db } = createHarness();
    createUser(db, {
      email: "admin@example.com",
      displayName: "Admin",
      passwordHash: bcrypt.hashSync("correct horse", 10),
      role: "admin"
    });
    const requestResponse = await dispatch(app, {
      method: "POST",
      path: "/api/account-requests",
      json: validRequest({ email: "longpass@example.com" })
    });
    const adminCookie = await login(app, {
      email: "admin@example.com",
      password: "correct horse"
    });

    await expect(
      dispatch(app, {
        method: "POST",
        path: `/api/admin/account-requests/${requestResponse.body.request.id}/approve`,
        headers: { cookie: adminCookie },
        json: { password: "x".repeat(73) }
      })
    ).resolves.toMatchObject({
      status: 400,
      body: { error: "validation_error" }
    });

    expect(findUserByEmail(db, "longpass@example.com")).toBeNull();

    db.close();
  });

  it("rejects pending requests with an optional admin note", async () => {
    const { app, db } = createHarness();
    createUser(db, {
      email: "admin@example.com",
      displayName: "Admin",
      passwordHash: bcrypt.hashSync("correct horse", 10),
      role: "admin"
    });
    const requestResponse = await dispatch(app, {
      method: "POST",
      path: "/api/account-requests",
      json: validRequest({ email: "reject@example.com" })
    });
    const adminCookie = await login(app, {
      email: "admin@example.com",
      password: "correct horse"
    });

    const rejectResponse = await dispatch(app, {
      method: "POST",
      path: `/api/admin/account-requests/${requestResponse.body.request.id}/reject`,
      headers: { cookie: adminCookie },
      json: { adminNote: "Not enough detail yet." }
    });

    expect(rejectResponse).toMatchObject({
      status: 200,
      body: {
        request: {
          id: requestResponse.body.request.id,
          status: "rejected",
          adminNote: "Not enough detail yet."
        }
      }
    });

    db.close();
  });
});
