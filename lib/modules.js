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
    // If true, anyone can VIEW this module's data without logging in
    // (editing always requires admin, regardless of this flag).
    // Set to false for modules that should be admin-only end to end,
    // e.g. Email Change Requests.
    public: true,
    // Order must match the sheet's header row exactly.
    columns: [
      { key: "No.", label: "No.", type: "auto", auto: true },
      { key: "Company Name", label: "Company Name", type: "text", required: true },
      { key: "AGT CODE", label: "AGT Code", type: "text", required: true },
      {
        key: "Assigned Person",
        label: "Assigned Person",
        type: "select",
        required: true,
        // Options come from the shared, admin-editable list managed
        // at /settings (see lib/salesPeople.js) — not hardcoded here.
        dynamicOptions: "salesPeople",
      },
      { key: "Remarks", label: "Remarks", type: "text" },
    ],
  },

  emailChange: {
    key: "emailChange",
    label: "Email Change Requests",
    spreadsheetId:
      process.env.EMAIL_CHANGE_SPREADSHEET_ID ||
      "17tjvU196KNMhbhSwIV1mzxJwdM24pNcJWKzq_aNfHJo",
    // Two tabs instead of one — open requests live in Pending, and
    // are moved (not just flagged) to Done when resolved.
    tabs: { pending: "Pending", done: "Done" },
    // The Done tab has the same columns in the same order, but a few
    // headers are worded differently there. Map: canonical key (as
    // used everywhere in the app) -> actual header text on Done.
    doneHeaderOverrides: {
      "Request Received": "Email Request",
      "Status": "Staus",
      "Reason of Changing Email": "Feedback",
    },
    // Admin-only by default — flip in Settings if you want it public later.
    public: false,
    pendingDaysThreshold: 5,
    // Order must match the sheet's header row exactly.
    columns: [
      { key: "Date", label: "Date", type: "date", auto: true },
      { key: "Company Name", label: "Company Name", type: "text", required: true },
      { key: "Agent Code", label: "Agent Code", type: "text", required: true },
      { key: "Old Email", label: "Old Email", type: "text", required: true },
      { key: "New Email", label: "New Email", type: "text", required: true },
      {
        key: "Sales Person",
        label: "Sales Person",
        type: "select",
        required: true,
        dynamicOptions: "salesPeople",
      },
      {
        key: "Approved By",
        label: "Approved By",
        type: "select",
        required: true,
        dynamicOptions: "salesPeople",
      },
      { key: "Request Received", label: "Request Received", type: "text" },
      {
        key: "Status",
        label: "Status",
        type: "select",
        required: true,
        // "Done" and "Not Possible" are set automatically when a
        // request is closed via the Mark done / Not possible actions
        // — they're listed here mainly so edits after the fact make sense.
        options: ["Not Initiated", "In Process", "Done", "Not Possible"],
      },
      { key: "Reason of Changing Email", label: "Reason", type: "text" },
    ],
  },
};
