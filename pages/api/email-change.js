import {
  readTab,
  appendRow,
  updateRow,
  deleteRow,
  getSheetIdByTitle,
} from "../../lib/sheets";
import { modules } from "../../lib/modules";
import { isAuthenticated } from "../../lib/auth";
import { getModuleVisibility } from "../../lib/settings";

const config = modules.emailChange;

function tabNameFor(tabKey) {
  if (tabKey === "done") return config.tabs.done;
  return config.tabs.pending;
}

function valuesFromBody(body) {
  return config.columns.map((col) => {
    if (col.key === "Date" && !body["Date"]) {
      return new Date().toLocaleDateString("en-GB"); // dd/mm/yyyy
    }
    return body[col.key] ?? "";
  });
}

export default async function handler(req, res) {
  try {
    const isPublic = await getModuleVisibility("emailChange");
    if ((req.method !== "GET" || !isPublic) && !isAuthenticated(req)) {
      return res.status(401).json({ error: "Admin login required" });
    }

    if (req.method === "GET") {
      const tabKey = req.query.tab === "done" ? "done" : "pending";
      const { records } = await readTab(config.spreadsheetId, tabNameFor(tabKey));
      return res.status(200).json({ records });
    }

    if (req.method === "POST") {
      const values = valuesFromBody(req.body || {});
      await appendRow(config.spreadsheetId, config.tabs.pending, values);
      return res.status(201).json({ ok: true });
    }

    if (req.method === "PUT") {
      const body = req.body || {};

      // Moving a request from Pending to Done: append to Done with
      // Status forced to "Done", then remove the original row.
      if (body.action === "markDone") {
        const { _row } = body;
        if (!_row) {
          return res.status(400).json({ error: "_row is required" });
        }
        const values = config.columns.map((col) =>
          col.key === "Status" ? "Done" : body[col.key] ?? ""
        );
        await appendRow(config.spreadsheetId, config.tabs.done, values);

        const sheetId = await getSheetIdByTitle(config.spreadsheetId, config.tabs.pending);
        await deleteRow(config.spreadsheetId, sheetId, _row - 1);
        return res.status(200).json({ ok: true });
      }

      // Plain edit of a row in whichever tab it currently lives in.
      const { _row, tab } = body;
      if (!_row) {
        return res.status(400).json({ error: "_row is required" });
      }
      const values = config.columns.map((col) => body[col.key] ?? "");
      await updateRow(config.spreadsheetId, tabNameFor(tab), _row, values);
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { _row, tab } = req.body || {};
      if (!_row) {
        return res.status(400).json({ error: "_row is required" });
      }
      const sheetId = await getSheetIdByTitle(config.spreadsheetId, tabNameFor(tab));
      await deleteRow(config.spreadsheetId, sheetId, _row - 1);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
