import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Shell from "../components/Shell";
import { modules } from "../lib/modules";

export default function SettingsPage() {
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingKey, setSavingKey] = useState(null);

  const [people, setPeople] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [addingPerson, setAddingPerson] = useState(false);

  useEffect(() => {
    fetch("/api/session")
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.replace("/login");
        } else {
          setCheckedAuth(true);
        }
      });
  }, [router]);

  useEffect(() => {
    if (!checkedAuth) return;
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data.settings || {});
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
    loadPeople();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedAuth]);

  const loadPeople = async () => {
    setPeopleLoading(true);
    try {
      const res = await fetch("/api/sales-people");
      const data = await res.json();
      setPeople(data.people || []);
    } catch {
      setPeople([]);
    } finally {
      setPeopleLoading(false);
    }
  };

  const addPerson = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAddingPerson(true);
    try {
      const res = await fetch("/api/sales-people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to add");
      setNewName("");
      await loadPeople();
    } catch (err) {
      alert(err.message);
    } finally {
      setAddingPerson(false);
    }
  };

  const removePerson = async (person) => {
    const confirmed = window.confirm(`Remove ${person.name} from the list?`);
    if (!confirmed) return;
    try {
      const res = await fetch("/api/sales-people", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row: person._row }),
      });
      if (!res.ok) throw new Error("Failed to remove");
      await loadPeople();
    } catch (err) {
      alert(err.message);
    }
  };

  const toggle = async (moduleKey) => {
    const next = !settings[moduleKey];
    setSavingKey(moduleKey);
    setSettings((s) => ({ ...s, [moduleKey]: next })); // optimistic
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleKey, public: next }),
      });
      if (!res.ok) throw new Error("Failed to save");
    } catch (err) {
      setSettings((s) => ({ ...s, [moduleKey]: !next })); // revert
      alert(err.message);
    } finally {
      setSavingKey(null);
    }
  };

  if (!checkedAuth) return null;

  return (
    <Shell>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Control which modules anyone can view without logging in.</p>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : error ? (
          <div className="empty-state error-text">{error}</div>
        ) : (
          <div className="settings-list">
            {Object.values(modules).map((mod) => (
              <div className="settings-row" key={mod.key}>
                <div>
                  <div className="settings-row-label">{mod.label}</div>
                  <div className="settings-row-sub">
                    {settings[mod.key]
                      ? "Anyone with the link can view this (editing still requires login)"
                      : "Only admins can view or edit this"}
                  </div>
                </div>
                <button
                  className={`toggle ${settings[mod.key] ? "on" : ""}`}
                  onClick={() => toggle(mod.key)}
                  disabled={savingKey === mod.key}
                  aria-pressed={Boolean(settings[mod.key])}
                  aria-label={`Make ${mod.label} ${settings[mod.key] ? "private" : "public"}`}
                >
                  <span className="toggle-knob" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="page-header" style={{ marginTop: 32 }}>
        <h1>Sales People</h1>
        <p>This list feeds every salesperson dropdown across the platform.</p>
      </div>

      <div className="card">
        <form className="add-person-form" onSubmit={addPerson}>
          <input
            className="search-input"
            style={{ width: 240 }}
            placeholder="Add a name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button className="btn-primary" type="submit" disabled={addingPerson}>
            {addingPerson ? "Adding…" : "+ Add"}
          </button>
        </form>

        {peopleLoading ? (
          <div className="empty-state">Loading…</div>
        ) : people.length === 0 ? (
          <div className="empty-state">No names yet — add your first one above.</div>
        ) : (
          <div className="settings-list">
            {people.map((p) => (
              <div className="settings-row" key={p._row}>
                <div className="settings-row-label">{p.name}</div>
                <button className="btn-danger" onClick={() => removePerson(p)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
