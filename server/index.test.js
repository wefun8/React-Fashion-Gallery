// @vitest-environment node

import { describe, expect, it } from "vitest";
import { createTestDb } from "./test/testDb.js";
import { createApp, shouldServeSpaFallback } from "./index.js";

function requestShape({ method = "GET", path = "/", acceptsHtml = true } = {}) {
  return {
    method,
    path,
    accepts(type) {
      return type === "html" && acceptsHtml ? "html" : false;
    }
  };
}

describe("createApp", () => {
  it("stores runtime config on the app", () => {
    const db = createTestDb();
    const config = {
      port: 0,
      databasePath: "./data/app.db",
      sessionCookieName: "gallery_session",
      sessionTtlDays: 14,
      nodeEnv: "development"
    };

    const app = createApp({ config, db });

    expect(app.locals.config).toBe(config);
    expect(app.locals.db).toBe(db);

    db.close();
  });
});

describe("shouldServeSpaFallback", () => {
  it("serves the app shell for HTML navigation requests", () => {
    expect(
      shouldServeSpaFallback(
        requestShape({ method: "GET", path: "/gallery/deep-link", acceptsHtml: true })
      )
    ).toBe(true);
  });

  it("does not serve the app shell for API routes", () => {
    expect(
      shouldServeSpaFallback(
        requestShape({ method: "GET", path: "/api/health", acceptsHtml: true })
      )
    ).toBe(false);
  });

  it("does not serve the app shell for missing assets", () => {
    expect(
      shouldServeSpaFallback(
        requestShape({ method: "GET", path: "/assets/missing.js", acceptsHtml: true })
      )
    ).toBe(false);
  });

  it("does not serve the app shell for non-HTML requests", () => {
    expect(
      shouldServeSpaFallback(
        requestShape({ method: "GET", path: "/gallery/deep-link", acceptsHtml: false })
      )
    ).toBe(false);
  });

  it("does not serve the app shell for non-navigation methods", () => {
    expect(
      shouldServeSpaFallback(
        requestShape({ method: "POST", path: "/gallery/deep-link", acceptsHtml: true })
      )
    ).toBe(false);
  });
});
