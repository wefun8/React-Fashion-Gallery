import { describe, expect, it } from "vitest";
import { getConfig } from "./config.js";

describe("getConfig", () => {
  it("reads server settings from environment variables", () => {
    const config = getConfig({
      PORT: "8090",
      DATABASE_PATH: "./data/app.db",
      SESSION_COOKIE_NAME: "gallery_session",
      SESSION_TTL_DAYS: "21",
      COOKIE_SECURE: "true",
      NODE_ENV: "production"
    });

    expect(config).toEqual({
      port: 8090,
      databasePath: "./data/app.db",
      sessionCookieName: "gallery_session",
      sessionTtlDays: 21,
      cookieSecure: true,
      nodeEnv: "production"
    });
  });

  it("only enables secure cookies for the explicit true value", () => {
    expect(getConfig({ COOKIE_SECURE: "true" }).cookieSecure).toBe(true);
    expect(getConfig({ COOKIE_SECURE: "false" }).cookieSecure).toBe(false);
    expect(getConfig({ COOKIE_SECURE: "TRUE" }).cookieSecure).toBe(false);
  });

  it("uses the default runtime values", () => {
    expect(getConfig({})).toEqual({
      port: 8080,
      databasePath: "/data/app.db",
      sessionCookieName: "gallery_session",
      sessionTtlDays: 14,
      cookieSecure: false,
      nodeEnv: "development"
    });
  });
});
