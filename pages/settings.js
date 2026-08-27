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
  }, [checkedAuth]);

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
    </Shell>
  );
}
