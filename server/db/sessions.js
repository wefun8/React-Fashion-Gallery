function rowToSession(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    expiresAt: row.expires_at,
    createdAt: row.created_at
  };
}

export function createSession(db, { id, userId, expiresAt }) {
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
  ).run(id, userId, expiresAt, createdAt);
  return findSessionById(db, id);
}

export function findSessionById(db, id) {
  return rowToSession(
    db.prepare("SELECT * FROM sessions WHERE id = ? AND expires_at > ?").get(id, new Date().toISOString())
  );
}

export function deleteSession(db, id) {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
}

export function deleteExpiredSessions(db) {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(new Date().toISOString());
}
