import { useEffect, useMemo, useState } from "react";
import Shell from "../components/Shell";
import RecordModal from "../components/RecordModal";
import { modules } from "../lib/modules";

const config = modules.emailChange;

function parseDate(str) {
  // Expects dd/mm/yyyy (what the API auto-fills); falls back to Date() parsing.
  if (!str) return null;
  const parts = str.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const parsed = new Date(`${y}-${m}-${d}`);
    if (!isNaN(parsed)) return parsed;
  }
  const fallback = new Date(str);
  return isNaN(fallback) ? null : fallback;
}

function daysSince(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return null;
  const diffMs = Date.now() - d.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export default function EmailChangePage() {
  const [tabKey, setTabKey] = useState("pending");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState("");
  const [modalRecord, setModalRecord] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/session")
      .then((res) => res.json())
      .then((data) => setIsAdmin(Boolean(data.authenticated)))
      .catch(() => setIsAdmin(false));
  }, []);

  const load = async (tab = tabKey) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/email-change?tab=${tab}`);
      if (!res.ok) throw new Error("Failed to load records");
      const data = await res.json();
      setRecords(data.records);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(tabKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabKey]);

  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter((r) =>
      config.columns.some((col) =>
        String(r[col.key] || "").toLowerCase().includes(q)
      )
    );
  }, [records, search]);

  const handleSave = async (values) => {
    const isEdit = Boolean(modalRecord && modalRecord._row);
    const res = await fetch("/api/email-change", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isEdit ? { ...values, _row: modalRecord._row, tab: tabKey } : values
      ),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Save failed");
    }
    await load(tabKey);
  };

  const handleDelete = async (record) => {
    const confirmed = window.confirm(
      `Delete the request for ${record["Company Name"] || "this record"}? This can't be undone.`
    );
    if (!confirmed) return;
    const res = await fetch("/api/email-change", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _row: record._row, tab: tabKey }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error || "Delete failed");
      return;
    }
    await load(tabKey);
  };

  const handleClose = async (record, action, confirmText) => {
    const confirmed = window.confirm(confirmText);
    if (!confirmed) return;
    const res = await fetch("/api/email-change", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...record, action }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error || "Update failed");
      return;
    }
    await load(tabKey);
  };

  return (
    <Shell>
      <div className="sticky-top">
        <div className="page-header">
          <h1>Email Change Requests</h1>
          <p>Client-requested email updates, tracked from request to done.</p>
        </div>

        <div className="tab-switch">
          <button
            className={tabKey === "pending" ? "tab-btn active" : "tab-btn"}
            onClick={() => setTabKey("pending")}
          >
            Pending
          </button>
          <button
            className={tabKey === "done" ? "tab-btn active" : "tab-btn"}
            onClick={() => setTabKey("done")}
          >
            Done
          </button>
        </div>

        <div className="toolbar">
          <div className="toolbar-left">
            <input
              className="search-input"
              placeholder="Search company, agent code, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {!loading && !loadError && (
              <span className="result-count">
                {search
                  ? `${filtered.length} of ${records.length}`
                  : `${records.length} total`}
              </span>
            )}
          </div>
          {isAdmin && tabKey === "pending" && (
            <button className="btn-primary" onClick={() => setModalRecord({})}>
              + New request
            </button>
          )}
        </div>
        {!isAdmin && (
          <p className="viewer-note">
            Viewing only. <a href="/login">Log in as admin</a> to add, edit, or delete records.
          </p>
        )}
      </div>

      <div className="card table-card">
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : loadError ? (
          <div className="empty-state error-text">{loadError}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            {search ? "No requests match your search." : "No requests here yet."}
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {config.columns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const overdue =
                    tabKey === "pending" &&
                    (() => {
                      const days = daysSince(r["Date"]);
                      return days !== null && days >= config.pendingDaysThreshold;
                    })();
                  return (
                    <tr key={r._row} className={overdue ? "row-overdue" : ""}>
                      {config.columns.map((col) => (
                        <td key={col.key}>{r[col.key]}</td>
                      ))}
                      {isAdmin && (
                        <td className="row-actions">
                          {tabKey === "pending" && (
                            <>
                              <button
                                className="btn-secondary"
                                onClick={() =>
                                  handleClose(
                                    r,
                                    "markDone",
                                    `Mark the request for ${r["Company Name"] || "this record"} as Done? It will move to the Done tab.`
                                  )
                                }
                              >
                                Mark done
                              </button>
                              <button
                                className="btn-secondary"
                                onClick={() =>
                                  handleClose(
                                    r,
                                    "markNotPossible",
                                    `Mark the request for ${r["Company Name"] || "this record"} as Not Possible? It will move to the Done tab.`
                                  )
                                }
                              >
                                Not possible
                              </button>
                            </>
                          )}
                          <button
                            className="btn-secondary"
                            onClick={() => setModalRecord(r)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-danger"
                            onClick={() => handleDelete(r)}
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalRecord && isAdmin && (
        <RecordModal
          columns={config.columns}
          initialValues={modalRecord}
          onSave={handleSave}
          onClose={() => setModalRecord(null)}
        />
      )}
    </Shell>
  );
}
