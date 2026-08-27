import Link from "next/link";
import { useRouter } from "next/router";

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
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
