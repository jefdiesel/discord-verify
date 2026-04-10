// Minimal HMAC-signed tokens for verify links and admin sessions.
// We sign a JSON payload with APP_SECRET so we don't need DB lookups for
// every request. KV is still used for one-time consumption / revocation.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function secret(): string {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 16) throw new Error("APP_SECRET must be set (>=16 chars)");
  return s;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

export function sign(payload: object): string {
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(createHmac("sha256", secret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verify<T = unknown>(token: string): T | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = b64url(createHmac("sha256", secret()).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

// Admin session cookie: signed payload with expiry.
export function isAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
