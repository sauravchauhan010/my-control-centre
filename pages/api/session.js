import { isAuthenticated } from "../../lib/auth";

export default async function handler(req, res) {
  return res.status(200).json({ authenticated: isAuthenticated(req) });
}
