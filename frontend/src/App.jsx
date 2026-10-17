import React, { useCallback, useEffect, useState } from "react";
import { api, send } from "./api.js";
import { Icon } from "./components.jsx";
import Login from "./Login.jsx";
import Pages from "./Pages.jsx";
import Forms from "./Forms.jsx";
function Workspace({ user, onLogout, toast }) {
  const [view, setView] = useState("dashboard"),
    [projectId, setProjectId] = useState(""),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const [projects, setProjects] = useState([]),
    [materials, setMaterials] = useState([]),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [modal, setModal] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    (async () => {
      const [p, m] = await Promise.all([api("/projects"), api("/materials")]);
      const endpoints = {
        dashboard: "/dashboard",
        inventory: "/inventory",
        movements: "/stock/history",
        intelligence: "/intelligence",
        reports: "/reports",
        alerts: "/notifications",
        audit: "/audit-logs",
        users: "/users",
      };
      const params = new URLSearchParams({
        page: String(page),
        ...(projectId ? { projectId } : {}),
      });
      const result = endpoints[view]
        ? await api(endpoints[view] + "?" + params)
        : {};
      if (!cancelled) {
        setProjects(p);
        setMaterials(m);
        setData(result);
        setLoading(false);
      }
    })().catch((e) => {
      if (!cancelled) {
        setError(e.message);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [view, projectId, page, revision]);
  const tabs = [
    ["dashboard", "Overview"],
    ["projects", "Projects"],
    ["materials", "Materials"],
    ["inventory", "Inventory"],
    ["movements", "Stock movements"],
    ["intelligence", "AI insights"],
    ["reports", "Reports"],
    ["alerts", "Notifications"],
    ...(["admin", "manager"].includes(user.role)
      ? [["audit", "Audit trail"]]
      : []),
    ...(user.role === "admin" ? [["users", "Team & access"]] : []),
  ];
  const navigate = (next, project) => {
    setLoading(true);
    setView(next);
    setPage(1);
    if (project !== undefined) setProjectId(project);
  };
  const open = (type, value) => {
    if (
      type === "stock" &&
      (!projects.some((p) => p.status === "active") || !materials.length)
    ) {
      toast("Create an active project and a material first.");
      return;
    }
    setModal({ type, value });
  };
  return (
    <>
      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">▥</span>
            <div>
              BuildStock<small>MATERIAL INTELLIGENCE</small>
            </div>
          </div>
          <div className="nav-label">YOUR WORKSPACE</div>
          <nav className="nav">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                className={view === id ? "active" : ""}
                onClick={() => {
                  if (view !== id) navigate(id);
                }}
              >
                <Icon name={id} />
                {label}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <strong>Built for what’s next.</strong>Better visibility.
            <br />
            Better material decisions.
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div className="crumb">
              Workspace <span> / </span>{" "}
              {tabs.find((t) => t[0] === view)?.[1] || "Overview"}
            </div>
            <div className="top-actions">
              <select
                aria-label="Filter by project"
                value={projectId}
                onChange={(e) => {
                  setLoading(true);
                  setProjectId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All assigned projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="avatar" title={user.name}>
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <button
                className="logout"
                onClick={async () => {
                  try {
                    await send("/auth/logout", {});
                    onLogout();
                  } catch (e) {
                    toast(e.message);
                  }
                }}
              >
                Sign out
              </button>
            </div>
          </header>
          <main className="content">
            {loading ? (
              <div className="loading">Loading your workspace…</div>
            ) : error ? (
              <>
                <div className="notice error-notice" role="alert">
                  {error}
                </div>
                <button
                  className="button secondary"
                  onClick={() => setRevision((r) => r + 1)}
                >
                  Try again
                </button>
              </>
            ) : (
              <Pages
                key={view + "-" + projectId}
                {...{
                  view,
                  data,
                  projects,
                  materials,
                  user,
                  projectId,
                  page,
                  open,
                  navigate,
                }}
                onPage={(p) => {
                  setLoading(true);
                  setPage(p);
                }}
              />
            )}
          </main>
        </div>
      </div>
      {modal && (
        <Forms
          key={`${modal.type}-${modal.value?.id || modal.value || "new"}`}
          {...{ modal, projects, materials, projectId }}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            toast("Saved successfully.");
            setRevision((r) => r + 1);
          }}
        />
      )}
    </>
  );
}
export default function App() {
  const [user, setUser] = useState(null),
    [checking, setChecking] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const toast = useCallback((text) => setMessage({ text, id: Date.now() }), []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(timer);
  }, [message]);
  const check = useCallback(async () => {
    setChecking(true);
    setError("");
    try {
      setUser((await api("/auth/me")).user);
    } catch (e) {
      if (e.status === 401) setUser(null);
      else setError(e.message);
    } finally {
      setChecking(false);
    }
  }, []);
  useEffect(() => {
    check();
    const expired = () => {
      setUser(null);
      toast("Your session expired. Please sign in again.");
    };
    window.addEventListener("buildstock:unauthorized", expired);
    return () => window.removeEventListener("buildstock:unauthorized", expired);
  }, [check, toast]);
  return (
    <>
      {checking ? (
        <div className="loading">Loading your workspace…</div>
      ) : error ? (
        <main className="content">
          <div className="notice error-notice" role="alert">
            {error}
          </div>
          <button className="button" onClick={check}>
            Retry
          </button>
        </main>
      ) : user ? (
        <Workspace user={user} onLogout={() => setUser(null)} toast={toast} />
      ) : (
        <Login onLogin={setUser} toast={toast} />
      )}
      <div
        id="toast"
        className={message ? "show" : ""}
        role="status"
        aria-live="polite"
      >
        {message?.text || ""}
      </div>
    </>
  );
}
