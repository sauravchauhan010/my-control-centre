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
  const [visibility, setVisibility] = useState(null); // null = still loading

  useEffect(() => {
    fetch("/api/session")
      .then((res) => res.json())
      .then((data) => setIsAdmin(Boolean(data.authenticated)))
      .catch(() => setIsAdmin(false));

    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => setVisibility(data.settings || {}))
      .catch(() => setVisibility({}));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.reload();
  };

  // Admin sees every built module regardless of its public/private
  // setting (so they can navigate to and manage it). Everyone else
  // only sees modules currently marked public.
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!item.href) return false; // hide "coming soon" placeholders entirely
    if (isAdmin) return true;
    return visibility ? Boolean(visibility[item.key]) : false;
  });

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          Rayna Admin
          <span>Internal tools</span>
        </div>
        {visibleNavItems.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`nav-item ${router.pathname === item.href ? "active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
        <div className="sidebar-footer">
          {isAdmin ? (
            <>
              <Link
                href="/settings"
                className={`nav-item ${router.pathname === "/settings" ? "active" : ""}`}
              >
                Settings
              </Link>
              <button className="nav-item logout-btn" onClick={handleLogout}>
                Log out
              </button>
            </>
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
