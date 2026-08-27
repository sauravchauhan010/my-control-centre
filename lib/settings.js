import { readTab, ensureTab, appendRow, updateRow } from "./sheets";
import { modules } from "./modules";

const SETTINGS_TAB = "Settings";
const HEADER = ["Module", "Public"];

// Settings live as their own tab inside the same spreadsheet used by
// the agents module — no separate sheet to create or share.
const SETTINGS_SPREADSHEET_ID = modules.agents.spreadsheetId;

/**
 * Returns { [moduleKey]: boolean } for every module, using the
 * Settings tab if a row exists, otherwise falling back to that
 * module's default `public` value from lib/modules.js.
 */
export async function getVisibilitySettings() {
  await ensureTab(SETTINGS_SPREADSHEET_ID, SETTINGS_TAB, HEADER);
  const { records } = await readTab(SETTINGS_SPREADSHEET_ID, SETTINGS_TAB);

  const overrides = {};
  records.forEach((r) => {
    if (r["Module"]) {
      overrides[r["Module"]] = String(r["Public"]).toUpperCase() === "TRUE";
    }
  });

  const result = {};
  Object.keys(modules).forEach((key) => {
    result[key] = key in overrides ? overrides[key] : Boolean(modules[key].public);
  });
  return result;
}

export async function getModuleVisibility(moduleKey) {
  const settings = await getVisibilitySettings();
  return settings[moduleKey];
}

/**
 * Sets (or creates) the visibility row for a module.
 */
export async function setModuleVisibility(moduleKey, isPublic) {
  await ensureTab(SETTINGS_SPREADSHEET_ID, SETTINGS_TAB, HEADER);
  const { records } = await readTab(SETTINGS_SPREADSHEET_ID, SETTINGS_TAB);
  const existing = records.find((r) => r["Module"] === moduleKey);

  if (existing) {
    await updateRow(SETTINGS_SPREADSHEET_ID, SETTINGS_TAB, existing._row, [
      moduleKey,
      isPublic ? "TRUE" : "FALSE",
    ]);
  } else {
    await appendRow(SETTINGS_SPREADSHEET_ID, SETTINGS_TAB, [
      moduleKey,
      isPublic ? "TRUE" : "FALSE",
    ]);
  }
}
