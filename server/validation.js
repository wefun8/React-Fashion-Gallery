export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

export function requireString(value, label = "value") {
  if (typeof value !== "string") {
    throw new ValidationError(`${label} must be a string`);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new ValidationError(`${label} must not be empty`);
  }

  return trimmed;
}

export function requireBoolean(value, label = "value") {
  if (typeof value !== "boolean") {
    throw new ValidationError(`${label} must be a boolean`);
  }

  return value;
}

export function requireNewPassword(value, label = "password") {
  const password = requireString(value, label);
  const byteLength = Buffer.byteLength(password, "utf8");

  if (password.length < 8) {
    throw new ValidationError(`${label} must be at least 8 characters`);
  }

  if (byteLength > 72) {
    throw new ValidationError(`${label} must be at most 72 bytes`);
  }

  return password;
}
