import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

// Add an entry here each time a new module goes live.
// `href: null` renders it greyed out as a preview of what's coming.
const NAV_ITEMS = [
  { key: "agents", label: "Agent Information", href: "/agents" },
  { key: "email-change", label: "Email Change Requests", href: null },
  { key: "api-checklist", label: "API Integration Checklist", href: null },
  { key: "daily-tasks", label: "Daily Tasks", href: null },
  { key: "daily-report", label: "Daily Report", href: null },
];

export default function Shell({ children }) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/session")
      .then((res) => res.json())
      .then((data) => setIsAdmin(Boolean(data.authenticated)))
      .catch(() => setIsAdmin(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.reload();
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          Rayna Admin
          <span>Internal tools</span>
        </div>
        {NAV_ITEMS.map((item) =>
          item.href ? (
            <Link
              key={item.key}
              href={item.href}
              className={`nav-item ${router.pathname === item.href ? "active" : ""}`}
            >
              {item.label}
            </Link>
          ) : (
            <span key={item.key} className="nav-item disabled">
              {item.label}
            </span>
          )
        )}
        <div className="sidebar-footer">
          {isAdmin ? (
            <button className="nav-item logout-btn" onClick={handleLogout}>
              Log out
            </button>
          ) : (
            <Link href="/login" className="nav-item">
              Admin login
            </Link>
          )}
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
