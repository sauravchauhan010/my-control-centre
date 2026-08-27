import { useEffect, useMemo, useState } from "react";
import Shell from "../components/Shell";
import RecordModal from "../components/RecordModal";
import { modules } from "../lib/modules";

const config = modules.agents;

export default function AgentsPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalRecord, setModalRecord] = useState(null); // null = closed, {} = new, {...} = edit
  const [loadError, setLoadError] = useState(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/agents");
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
    load();
  }, []);

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
    const res = await fetch("/api/agents", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEdit ? { ...values, _row: modalRecord._row } : values),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Save failed");
    }
    await load();
  };

  const handleDelete = async (record) => {
    const confirmed = window.confirm(
      `Delete ${record["Company Name"] || "this record"}? This can't be undone.`
    );
    if (!confirmed) return;
    const res = await fetch("/api/agents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _row: record._row }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error || "Delete failed");
      return;
    }
    await load();
  };

  return (
    <Shell>
      <div className="sticky-top">
        <div className="page-header">
          <h1>Agent Information</h1>
          <p>Directory of agents and which salesperson they're assigned to.</p>
        </div>

        <div className="toolbar">
          <div className="toolbar-left">
            <input
              className="search-input"
              placeholder="Search company, code, person…"
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
          <button className="btn-primary" onClick={() => setModalRecord({})}>
            + Add agent
          </button>
        </div>
      </div>

      <div className="card table-card">
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : loadError ? (
          <div className="empty-state error-text">{loadError}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            {search ? "No agents match your search." : "No agents yet — add the first one."}
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {config.columns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r._row}>
                    {config.columns.map((col) => (
                      <td key={col.key}>{r[col.key]}</td>
                    ))}
                    <td className="row-actions">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalRecord && (
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
