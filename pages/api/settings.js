import { isAuthenticated } from "../../lib/auth";
import { getVisibilitySettings, setModuleVisibility } from "../../lib/settings";
import { modules } from "../../lib/modules";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      // Visibility flags themselves aren't sensitive — the sidebar
      // needs this for every visitor to know what to show/hide.
      const settings = await getVisibilitySettings();
      return res.status(200).json({ settings });
    }

    if (req.method === "PUT") {
      if (!isAuthenticated(req)) {
        return res.status(401).json({ error: "Admin login required" });
      }
      const { moduleKey, public: isPublic } = req.body || {};
      if (!moduleKey || !(moduleKey in modules)) {
        return res.status(400).json({ error: "Unknown module" });
      }
      await setModuleVisibility(moduleKey, Boolean(isPublic));
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", ["GET", "PUT"]);
    return res.status(405).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
