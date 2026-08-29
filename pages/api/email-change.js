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

// The Done tab uses different header text for a few columns (see
// doneHeaderOverrides in lib/modules.js). readTab() keys each record
// by whatever's literally in the sheet's header row, so we translate
// those keys back to the canonical ones the rest of the app expects.
function normalizeDoneRecord(record) {
  const overrides = config.doneHeaderOverrides || {};
  const reversed = Object.fromEntries(
    Object.entries(overrides).map(([canonical, actual]) => [actual, canonical])
  );
  const normalized = {};
  Object.entries(record).forEach(([key, value]) => {
    normalized[reversed[key] || key] = value;
  });
  return normalized;
}

// Builds a row for the Done tab by reading its ACTUAL header order
// from the sheet (not assumed to match Pending's column order), so
// each value lands under the correct header regardless of how the
// columns are arranged on Done.
async function buildDoneRowValues(body) {
  const { headers } = await readTab(config.spreadsheetId, config.tabs.done);
  const overrides = config.doneHeaderOverrides || {};
  // actual Done header text -> canonical key
  const actualToCanonical = {};
  Object.entries(overrides).forEach(([canonical, actual]) => {
    actualToCanonical[actual] = canonical;
  });

  return headers.map((header) => {
    const canonicalKey = actualToCanonical[header] || header;
    if (canonicalKey === "Status") return "Done";
    return body[canonicalKey] ?? "";
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
      const normalized = tabKey === "done" ? records.map(normalizeDoneRecord) : records;
      return res.status(200).json({ records: normalized });
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
        const values = await buildDoneRowValues(body);
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
