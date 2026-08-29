import { readTab, ensureTab, appendRow, deleteRow, getSheetIdByTitle } from "./sheets";
import { modules } from "./modules";

const TAB = "SalesPeople";
const HEADER = ["Name"];

// Lives in the same spreadsheet as Agent Information — one shared
// list, reused by every dropdown that needs salesperson names.
const SPREADSHEET_ID = modules.agents.spreadsheetId;

export async function getSalesPeople() {
  await ensureTab(SPREADSHEET_ID, TAB, HEADER);
  const { records } = await readTab(SPREADSHEET_ID, TAB);
  return records
    .map((r) => ({ name: r["Name"], _row: r._row }))
    .filter((r) => r.name);
}

export async function addSalesPerson(name) {
  await ensureTab(SPREADSHEET_ID, TAB, HEADER);
  await appendRow(SPREADSHEET_ID, TAB, [name]);
}

export async function removeSalesPerson(row) {
  const sheetId = await getSheetIdByTitle(SPREADSHEET_ID, TAB);
  await deleteRow(SPREADSHEET_ID, sheetId, row - 1);
}
