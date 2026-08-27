import crypto from "crypto";

export const SESSION_COOKIE = "admin_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing SESSION_SECRET env var");
  }
  return secret;
}

function sign(payload) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

/**
 * Creates a signed session token: "<expiryTimestamp>.<signature>".
 * No external store needed — the signature proves it was issued by us.
 */
export function createSessionToken() {
  const expiry = Date.now() + SESSION_DURATION_MS;
  const payload = String(expiry);
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function isValidSessionToken(token) {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload);
  const valid =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) return false;

  return Number(payload) > Date.now();
}

/**
 * Reads the session cookie straight off the raw request headers
 * (works in Next.js API routes without extra dependencies).
 */
export function isAuthenticated(req) {
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return false;
  const token = decodeURIComponent(match.split("=")[1] || "");
  return isValidSessionToken(token);
}
