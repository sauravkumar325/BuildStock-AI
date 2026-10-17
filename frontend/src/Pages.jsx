import React, { useState } from "react";
import {
  Badge,
  Head,
  Icon,
  MaterialName,
  Table,
  Pager,
  fmt,
  money,
} from "./components.jsx";
export default function Pages({
  view,
  data,
  projects,
  materials,
  user,
  projectId,
  page,
  onPage,
  open,
  navigate,
}) {
  const [search, setSearch] = useState("");
  const manage = ["admin", "manager"].includes(user.role),
    stock = ["admin", "manager", "storekeeper"].includes(user.role);
  const stockButtons = stock && (
    <>
      <button className="button secondary" onClick={() => open("stock", "OUT")}>
        ↗ Stock out
      </button>
      <button className="button" onClick={() => open("stock", "IN")}>
        ＋ Stock in
      </button>
    </>
  );
  const searchBox = (placeholder) => (
    <input
      className="search"
      placeholder={placeholder}
      aria-label={placeholder}
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  );
  const filtered = (items) =>
    items.filter((i) =>
      Object.values(i).join(" ").toLowerCase().includes(search.toLowerCase()),
    );
  const quantity = (i) => (
    <>
      {fmt(i.quantity)} <small>{i.unit}</small>
    </>
  );
  if (view === "dashboard") {
    const d = data,
      max = Math.max(
        1,
        ...d.movement.flatMap((x) => [Number(x.inValue), Number(x.outValue)]),
      );
    return (
      <>
        <Head
          title="Site overview"
          subtitle="A clear view of your materials. A confident plan for tomorrow."
        >
          {stockButtons}
        </Head>
        <section className="stats">
          {[
            [
              money(d.inventoryValue),
              "Inventory value",
              "Current catalog valuation",
              "inventory",
            ],
            [
              fmt(d.totalMaterials),
              "Active materials",
              "Across your assigned projects",
              "materials",
            ],
            [
              fmt(d.projects),
              "Projects",
              "Connected construction sites",
              "projects",
            ],
            [
              fmt(d.lowStockCount),
              "Low-stock items",
              "Project / material combinations",
              "alerts",
            ],
          ].map(([n, l, f, i], index) => (
            <article
              key={l}
              className={`stat ${index === 0 ? "featured" : ""}`}
            >
              <div className="stat-label">
                {l}
                <Icon name={i} />
              </div>
              <div className="stat-number">{n}</div>
              <div className="stat-foot">{f}</div>
            </article>
          ))}
        </section>
        <section className="grid-main">
          <article className="panel">
            <div className="panel-title">
              <h2>Material movement</h2>
              <Badge>Last 14 days</Badge>
            </div>
            <p className="subtle">Recorded movement value · INR</p>
            <div
              className="chart"
              role="img"
              aria-label="Stock in and stock out values over the last fourteen days"
            >
              {d.movement.map((x) => (
                <div
                  className="chart-day"
                  key={x.date}
                  title={`${x.date}: In ${money(x.inValue)}, Out ${money(x.outValue)}`}
                >
                  <div
                    className="chart-bar"
                    style={{ height: `${(Number(x.inValue) / max) * 85}%` }}
                  />
                  <div
                    className="chart-bar out"
                    style={{ height: `${(Number(x.outValue) / max) * 85}%` }}
                  />
                  <small>{x.date.slice(8)}</small>
                </div>
              ))}
            </div>
            <div className="legend">
              <span>Stock in</span>
              <span>Stock out</span>
            </div>
          </article>
          <article className="panel insight-panel">
            <div className="eyebrow">BUILDSTOCK INTELLIGENCE</div>
            <span className="spark">✧</span>
            <h2>
              Ahead of the shortage.
              <br />
              Ahead of the schedule.
            </h2>
            <p>
              Turn daily consumption into a 7-day material forecast. Plan
              replenishments and review unusual usage before it slows your site
              down.
            </p>
            <button className="button" onClick={() => navigate("intelligence")}>
              Explore AI insights ↗
            </button>
          </article>
        </section>
        <section className="panel table-panel">
          <div className="panel-title">
            <h2>Needs your attention</h2>
            <Badge kind="warning">{d.lowStockCount} low-stock items</Badge>
          </div>
          <Table
            headers={["Material", "Project", "Available", "Minimum", "Status"]}
            empty="No low-stock alerts in this view."
            rows={d.lowStock
              .slice(0, 8)
              .map((i) => [
                <MaterialName item={i} />,
                i.project,
                quantity(i),
                fmt(i.minimumStock),
                <Badge kind="warning">Low stock</Badge>,
              ])}
          />
        </section>
      </>
    );
  }
  if (view === "projects") {
    const items = projectId
      ? projects.filter((p) => String(p.id) === projectId)
      : projects;
    return (
      <>
        <Head
          title="Projects"
          subtitle="Keep each construction site connected and accounted for."
        >
          {manage && (
            <button className="button" onClick={() => open("project")}>
              ＋ New project
            </button>
          )}
        </Head>
        <section className="project-grid">
          {items.map((p) => (
            <article key={p.id} className="panel project-card">
              <div className="panel-title">
                <div className="project-symbol">▥</div>
                <Badge>{p.status}</Badge>
              </div>
              <h2>{p.name}</h2>
              <p className="subtle">{p.location}</p>
              <div className="actions">
                <button
                  className="button secondary small"
                  onClick={() => navigate("inventory", String(p.id))}
                >
                  View inventory →
                </button>
                {manage && (
                  <button
                    className="button secondary small"
                    onClick={() => open("project", p)}
                  >
                    Edit
                  </button>
                )}
                {user.role === "admin" && (
                  <button
                    className="button secondary small"
                    onClick={() => open("members", p.id)}
                  >
                    Members
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
        {!items.length && (
          <div className="empty">
            No assigned projects yet. An administrator can assign access.
          </div>
        )}
      </>
    );
  }
  if (view === "materials")
    return (
      <>
        <Head
          title="Material catalog"
          subtitle="One consistent catalog for every site and every movement."
        >
          {manage && (
            <button className="button" onClick={() => open("material")}>
              ＋ Add material
            </button>
          )}
        </Head>
        <section className="panel table-panel">
          <div className="panel-title">
            <h2>{materials.length} materials</h2>
            {searchBox("Search materials…")}
          </div>
          <Table
            headers={[
              "Material",
              "Category",
              "Unit",
              "Unit price",
              "Minimum stock",
              ...(manage ? ["Actions"] : []),
            ]}
            rows={filtered(materials).map((i) => [
              <MaterialName item={i} />,
              i.category,
              i.unit,
              money(i.unitPrice),
              fmt(i.minimumStock),
              ...(manage
                ? [
                    <div className="actions">
                      <button
                        className="button secondary small"
                        onClick={() => open("material", i)}
                      >
                        Edit
                      </button>
                      <button
                        className="button danger small"
                        onClick={() => open("archive", i.id)}
                      >
                        Archive
                      </button>
                    </div>,
                  ]
                : []),
            ])}
          />
        </section>
      </>
    );
  if (view === "inventory")
    return (
      <>
        <Head
          title="Inventory"
          subtitle="Live stock balances, separated by project."
        >
          {stockButtons}
        </Head>
        <section className="panel table-panel">
          <div className="panel-title">
            <h2>Current stock</h2>
            {searchBox("Find a material or project…")}
          </div>
          <Table
            headers={[
              "Material",
              "Project",
              "Available",
              "Minimum",
              "Value",
              "Status",
            ]}
            rows={filtered(data).map((i) => [
              <MaterialName item={i} />,
              i.project,
              quantity(i),
              fmt(i.minimumStock),
              money(i.value),
              <Badge kind={i.lowStock ? "warning" : ""}>
                {!i.active ? "Archived" : i.lowStock ? "Low stock" : "In stock"}
              </Badge>,
            ])}
          />
        </section>
      </>
    );
  if (view === "movements")
    return (
      <>
        <Head
          title="Stock movements"
          subtitle="Every receipt and withdrawal, with a clear history."
        >
          {stockButtons}
        </Head>
        <section className="panel table-panel">
          <div className="panel-title">
            <h2>Movement ledger</h2>
            <Badge>Immutable history</Badge>
          </div>
          <Table
            headers={[
              "Date · UTC",
              "Material",
              "Project",
              "Type",
              "Quantity",
              "Recorded by",
              "Reason",
            ]}
            rows={data.items.map((i) => [
              i.date,
              i.Material?.name,
              i.Project?.name,
              <Badge kind={i.type === "OUT" ? "warning" : ""}>{i.type}</Badge>,
              `${fmt(i.quantity)} ${i.Material?.unit || ""}`,
              i.User?.name,
              <div className="detail-json">{i.reason}</div>,
            ])}
          />
          <Pager data={data} onPage={onPage} />
        </section>
      </>
    );
  if (view === "intelligence")
    return (
      <>
        <Head
          title="AI insights"
          subtitle="Plan the next seven days with your consumption history."
        />
        <div className={`notice ${data.available ? "" : "error-notice"}`}>
          {data.message} Safety stock uses the material’s minimum level. At
          least 14 complete days are needed; forecasts are recalculated when
          this page opens.
        </div>
        <section className="panel table-panel">
          <div className="panel-title">
            <h2>Demand & replenishment</h2>
            <Badge>7-day horizon</Badge>
          </div>
          <Table
            headers={[
              "Material / project",
              "Available",
              "Predicted demand",
              "Potential shortage",
              "Reorder suggestion",
              "Model / review",
            ]}
            rows={data.forecasts.map((i) => [
              <>
                <strong>{i.material}</strong>
                <small>
                  {i.project} · {i.unit}
                </small>
              </>,
              fmt(i.quantity),
              i.status === "ready" ? fmt(i.predictedDemand) : "—",
              i.status === "ready" ? fmt(i.shortage) : "—",
              i.status === "ready" ? (
                <strong>{fmt(i.recommendedReorder)}</strong>
              ) : (
                "—"
              ),
              i.status === "ready" ? (
                <>
                  <Badge>{i.method.replaceAll("_", " ")}</Badge>
                  <small>
                    {i.validationMAE === null
                      ? "No holdout score yet"
                      : "Holdout MAE: " + fmt(i.validationMAE)}
                  </small>
                  {i.anomaly && (
                    <Badge kind="review">Review unusual usage</Badge>
                  )}
                </>
              ) : (
                <>
                  <Badge kind="warning">Collecting history</Badge>
                  <small>{i.historyDays}/14 days</small>
                </>
              ),
            ])}
          />
        </section>
        <p className="subtle" style={{ marginTop: 18 }}>
          Reorder = max(0, predicted demand + safety stock − available stock).
          Reorders use the material’s unit; round to supplier pack sizes before
          ordering. Unusual usage is a review signal, not a conclusion about its
          cause.
        </p>
      </>
    );
  if (view === "alerts")
    return (
      <>
        <Head
          title="Notifications"
          subtitle="Signals that help you keep the site moving."
        />
        {!data.available && (
          <div className="notice error-notice">{data.message}</div>
        )}
        {data.alerts.length ? (
          data.alerts.map((a, i) => (
            <article key={i} className="alert-card">
              <Badge kind={a.severity}>{a.type.replaceAll("_", " ")}</Badge>
              <div>
                <h3>
                  {a.material} · {a.project}
                </h3>
                <p>{a.message}</p>
              </div>
            </article>
          ))
        ) : (
          <div className="panel empty">
            All clear. There are no current stock alerts.
          </div>
        )}
      </>
    );
  if (view === "reports")
    return (
      <>
        <Head
          title="Reports"
          subtitle="A project-wise summary for your next material review."
        >
          <a
            className="button"
            href={`/api/reports?${new URLSearchParams(projectId ? { projectId } : {})}&format=csv`}
            download
          >
            ↓ Export CSV
          </a>
        </Head>
        <div className="notice">
          {data.valuationMethod} Generated{" "}
          {new Date(data.generatedAt).toLocaleString()}.
        </div>
        <section className="panel table-panel">
          <Table
            headers={[
              "Project",
              "Material",
              "Current stock",
              "All-time consumption",
              "Unit price",
              "Stock value",
            ]}
            rows={data.items.map((i) => [
              i.project,
              i.material,
              `${fmt(i.quantity)} ${i.unit}`,
              `${fmt(i.consumed)} ${i.unit}`,
              money(i.unitPrice),
              money(i.value),
            ])}
          />
        </section>
      </>
    );
  if (view === "audit")
    return (
      <>
        <Head
          title="Audit trail"
          subtitle="Who changed what, where, and when."
        />
        <section className="panel table-panel">
          <Table
            headers={["When", "Who", "Action", "Project / material", "Details"]}
            rows={data.items.map((i) => [
              new Date(i.createdAt).toLocaleString(),
              i.User?.name || "System",
              <Badge>{i.action.replaceAll("_", " ")}</Badge>,
              <>
                {i.Project?.name || "—"}
                <small>{i.Material?.name || ""}</small>
              </>,
              <div className="detail-json">{JSON.stringify(i.details)}</div>,
            ])}
          />
          <Pager data={data} onPage={onPage} />
        </section>
      </>
    );
  if (view === "users")
    return (
      <>
        <Head
          title="Team & access"
          subtitle="Assign roles here. Assign project access from each project’s Members button."
        />
        <div className="notice">
          Administrators access all projects. Other users only access assigned
          projects. Managers edit the shared material catalog; storekeepers
          record movements; viewers can read and export reports.
        </div>
        <section className="panel table-panel">
          <Table
            headers={["Name", "Email", "Role", "Action"]}
            rows={data.map((u) => [
              u.name,
              u.email,
              <Badge>{u.role}</Badge>,
              u.id === user.id ? (
                "Your account"
              ) : (
                <button
                  className="button secondary small"
                  onClick={() => open("role", u)}
                >
                  Change role
                </button>
              ),
            ])}
          />
        </section>
      </>
    );
  return null;
}
