export function getConfig(env = process.env) {
  return {
    port: Number(env.PORT || 8080),
    databasePath: env.DATABASE_PATH || "/data/app.db",
    sessionCookieName: env.SESSION_COOKIE_NAME || "gallery_session",
    sessionTtlDays: Number(env.SESSION_TTL_DAYS || 14),
    cookieSecure: env.COOKIE_SECURE === "true",
    nodeEnv: env.NODE_ENV || "development"
  };
}
