import { isAuthenticated } from "../../lib/auth";
import { getSalesPeople, addSalesPerson, removeSalesPerson } from "../../lib/salesPeople";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      // Read is admin-only too — this list only shows up inside
      // add/edit forms, which are already admin-gated in the UI.
      if (!isAuthenticated(req)) {
        return res.status(401).json({ error: "Admin login required" });
      }
      const people = await getSalesPeople();
      return res.status(200).json({ people });
    }

    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: "Admin login required" });
    }

    if (req.method === "POST") {
      const { name } = req.body || {};
      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Name is required" });
      }
      await addSalesPerson(name.trim());
      return res.status(201).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { row } = req.body || {};
      if (!row) {
        return res.status(400).json({ error: "row is required" });
      }
      await removeSalesPerson(row);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    return res.status(405).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
