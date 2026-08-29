import { google } from "googleapis";

let cachedClient = null;

/**
 * Authenticates using a service account. Credentials come from env vars
 * so the private key never touches the repo.
 */
function getAuthClient() {
  if (cachedClient) return cachedClient;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY env vars"
    );
  }

  cachedClient = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return cachedClient;
}

function getSheetsApi() {
  const auth = getAuthClient();
  return google.sheets({ version: "v4", auth });
}

/**
 * Reads an entire tab (assumes row 1 = headers) and returns
 * an array of plain objects keyed by header name, plus the
 * 1-based sheet row number for each record (for later updates).
 */
export async function readTab(spreadsheetId, tabName) {
  const sheets = getSheetsApi();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}`,
  });

  const rows = res.data.values || [];
  if (rows.length === 0) return { headers: [], records: [] };

  const [headers, ...dataRows] = rows;
  const records = dataRows.map((row, i) => {
    const record = { _row: i + 2 }; // +2: 1-indexed, plus header row
    headers.forEach((h, idx) => {
      record[h] = row[idx] ?? "";
    });
    return record;
  });

  return { headers, records };
}

/**
 * Appends a single row to the end of a tab. `values` must be
 * in the same column order as the sheet's header row.
 *
 * Deliberately does NOT use the Sheets API's built-in "append"
 * (which guesses where the data ends) — that heuristic can leave a
 * blank row gap if the sheet has extra formatting/reserved rows
 * below the actual data. Instead we count filled rows in column A
 * ourselves and write directly to the next row.
 */
export async function appendRow(spreadsheetId, tabName, values) {
  const sheets = getSheetsApi();

  const colA = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!A:A`,
  });
  const usedRows = (colA.data.values || []).length;
  const nextRow = usedRows + 1;

  const lastCol = String.fromCharCode(64 + values.length);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A${nextRow}:${lastCol}${nextRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}

/**
 * Overwrites a specific row (1-based sheet row number, header row = 1).
 */
export async function updateRow(spreadsheetId, tabName, rowNumber, values) {
  const sheets = getSheetsApi();
  const lastCol = String.fromCharCode(64 + values.length); // A, B, C...
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A${rowNumber}:${lastCol}${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}

/**
 * Ensures a tab exists with the given header row. If the tab is
 * missing, creates it and writes the header. If it exists but is
 * empty, writes the header. Safe to call every time — cheap to check.
 */
export async function ensureTab(spreadsheetId, tabName, headerRow) {
  const sheets = getSheetsApi();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = meta.data.sheets.find((s) => s.properties.title === tabName);

  if (!existing) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tabName } } }],
      },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tabName}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [headerRow] },
    });
    return;
  }

  const check = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!A1:A1`,
  });
  if (!check.data.values || check.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tabName}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [headerRow] },
    });
  }
}

/**
 * Looks up the numeric sheetId (gid) for a tab, given its title.
 * Needed because deleteDimension requires the numeric id, not the name.
 */
export async function getSheetIdByTitle(spreadsheetId, tabName) {
  const sheets = getSheetsApi();
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = res.data.sheets.find(
    (s) => s.properties.title === tabName
  );
  if (!sheet) {
    throw new Error(`Tab "${tabName}" not found in spreadsheet`);
  }
  return sheet.properties.sheetId;
}

/**
 * Deletes a row entirely (shifts rows below it up), given the tab's
 * numeric sheetId (not the tab name) and a 0-based row index.
 */
export async function deleteRow(spreadsheetId, sheetId, rowIndex0Based) {
  const sheets = getSheetsApi();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex0Based,
              endIndex: rowIndex0Based + 1,
            },
          },
        },
      ],
    },
  });
}
