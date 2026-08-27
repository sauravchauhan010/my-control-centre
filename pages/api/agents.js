import { readTab, appendRow, updateRow } from "../../lib/sheets";
import { modules } from "../../lib/modules";

const config = modules.agents;

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { records } = await readTab(config.spreadsheetId, config.tabName);
      return res.status(200).json({ records });
    }

    if (req.method === "POST") {
      const body = req.body;

      // Auto-generate "No." as (current max + 1).
      const { records } = await readTab(config.spreadsheetId, config.tabName);
      const maxNo = records.reduce((max, r) => {
        const n = parseInt(r["No."], 10);
        return Number.isFinite(n) && n > max ? n : max;
      }, 0);
      const nextNo = maxNo + 1;

      const values = config.columns.map((col) => {
        if (col.key === "No.") return nextNo;
        return body[col.key] ?? "";
      });

      await appendRow(config.spreadsheetId, config.tabName, values);
      return res.status(201).json({ ok: true, no: nextNo });
    }

    if (req.method === "PUT") {
      const body = req.body;
      const { _row } = body;
      if (!_row) {
        return res.status(400).json({ error: "_row is required to update a record" });
      }

      const values = config.columns.map((col) => body[col.key] ?? "");
      await updateRow(config.spreadsheetId, config.tabName, _row, values);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", ["GET", "POST", "PUT"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
