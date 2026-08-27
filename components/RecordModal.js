import { useState } from "react";

export default function RecordModal({ columns, initialValues, onSave, onClose }) {
  const [values, setValues] = useState(initialValues || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const editableColumns = columns.filter((c) => c.type !== "auto");

  const handleChange = (key, val) => {
    setValues((v) => ({ ...v, [key]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const missing = editableColumns.find((c) => c.required && !values[c.key]);
    if (missing) {
      setError(`${missing.label} is required.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(values);
      onClose();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{initialValues?._row ? "Edit record" : "Add record"}</h2>
        <form onSubmit={handleSubmit}>
          {editableColumns.map((col) => (
            <div className="field" key={col.key}>
              <label htmlFor={col.key}>{col.label}</label>
              {col.type === "select" ? (
                <select
                  id={col.key}
                  value={values[col.key] || ""}
                  onChange={(e) => handleChange(col.key, e.target.value)}
                >
                  <option value="">Select…</option>
                  {col.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={col.key}
                  type="text"
                  value={values[col.key] || ""}
                  onChange={(e) => handleChange(col.key, e.target.value)}
                />
              )}
            </div>
          ))}
          {error && <div className="error-text">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
