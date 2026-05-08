import Database from "better-sqlite3";
import { initializeSchema } from "../db/schema.js";

export function createTestDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  initializeSchema(db);
  return db;
}
