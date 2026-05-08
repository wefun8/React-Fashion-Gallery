import bcrypt from "bcryptjs";

const HASH_ROUNDS = 12;

export function hashPassword(password) {
  return bcrypt.hash(String(password), HASH_ROUNDS);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(String(password), String(hash));
}
