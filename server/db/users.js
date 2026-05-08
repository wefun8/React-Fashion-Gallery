function now() {
  return new Date().toISOString();
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function countUsers(db) {
  return db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
}

export function createUser(db, { email, displayName, passwordHash, role }) {
  const timestamp = now();
  const result = db
    .prepare(
      `INSERT INTO users (email, display_name, password_hash, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?)`
    )
    .run(normalizeEmail(email), String(displayName || "").trim(), passwordHash, role, timestamp, timestamp);
  return findUserById(db, result.lastInsertRowid);
}

export function findUserById(db, id) {
  return rowToUser(db.prepare("SELECT * FROM users WHERE id = ?").get(id));
}

export function findUserByEmail(db, email) {
  return rowToUser(db.prepare("SELECT * FROM users WHERE email = ?").get(normalizeEmail(email)));
}
