function now() {
  return new Date().toISOString();
}

function rowToRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    contact: row.contact,
    reason: row.reason,
    ageConfirmed: Boolean(row.age_confirmed),
    rulesAccepted: Boolean(row.rules_accepted),
    status: row.status,
    adminNote: row.admin_note || "",
    approvedUserId: row.approved_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createAccountRequest(db, input) {
  const timestamp = now();
  const result = db
    .prepare(
      `INSERT INTO account_requests
       (display_name, email, contact, reason, age_confirmed, rules_accepted, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
    )
    .run(
      String(input.displayName || "").trim(),
      String(input.email || "").trim().toLowerCase(),
      String(input.contact || "").trim(),
      String(input.reason || "").trim(),
      input.ageConfirmed ? 1 : 0,
      input.rulesAccepted ? 1 : 0,
      timestamp,
      timestamp
    );
  return findAccountRequestById(db, result.lastInsertRowid);
}

export function findAccountRequestById(db, id) {
  return rowToRequest(db.prepare("SELECT * FROM account_requests WHERE id = ?").get(id));
}

export function listAccountRequests(db) {
  return db
    .prepare("SELECT * FROM account_requests ORDER BY created_at DESC, id DESC")
    .all()
    .map(rowToRequest);
}

export function markRequestApproved(db, { id, approvedUserId }) {
  const timestamp = now();
  const result = db.prepare(
    `UPDATE account_requests
     SET status = 'approved', approved_user_id = ?, updated_at = ?
     WHERE id = ? AND status = 'pending'`
  ).run(approvedUserId, timestamp, id);
  if (result.changes !== 1) return null;
  return findAccountRequestById(db, id);
}

export function markRequestRejected(db, { id, adminNote }) {
  const timestamp = now();
  const result = db.prepare(
    `UPDATE account_requests
     SET status = 'rejected', admin_note = ?, updated_at = ?
     WHERE id = ? AND status = 'pending'`
  ).run(String(adminNote || "").trim(), timestamp, id);
  if (result.changes !== 1) return null;
  return findAccountRequestById(db, id);
}
