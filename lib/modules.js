// Each module maps one workflow to one Google Sheet tab.
// Adding a new tab later = adding a new entry here, plus a
// page + API route that reuse the shared Table/Form components.

export const modules = {
  agents: {
    key: "agents",
    label: "Agent Information",
    spreadsheetId:
      process.env.AGENTS_SPREADSHEET_ID ||
      "1Cy6mVtsMxp2jpok6tZ4zEs1ymjjfUsuKQSw6qNwEGEs",
    tabName: "Sheet1",
    // Order must match the sheet's header row exactly.
    columns: [
      { key: "No.", label: "No.", type: "auto" },
      { key: "Company Name", label: "Company Name", type: "text", required: true },
      { key: "AGT CODE", label: "AGT Code", type: "text", required: true },
      {
        key: "Assigned Person",
        label: "Assigned Person",
        type: "select",
        required: true,
        // Placeholder list — swap in your real sales team names.
        options: ["Salesperson A", "Salesperson B", "Salesperson C"],
      },
      { key: "Remarks", label: "Remarks", type: "text" },
    ],
  },
};
