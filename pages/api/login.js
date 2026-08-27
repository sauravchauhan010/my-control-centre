import { createSessionToken, SESSION_COOKIE } from "../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end();
  }

  const { password } = req.body || {};
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return res.status(500).json({ error: "Admin login is not configured" });
  }

  if (password !== adminPassword) {
    return res.status(401).json({ error: "Incorrect password" });
  }

  const token = createSessionToken();
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
      7 * 24 * 60 * 60
    }${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );
  return res.status(200).json({ ok: true });
}
