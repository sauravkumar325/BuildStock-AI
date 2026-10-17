import React, { useEffect, useRef, useState } from "react";
export const fmt = (v) =>
  Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
export const money = (v) =>
  "₹" + Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
export function Icon({ name }) {
  const paths = {
    inventory: "m3 7 9-4 9 4v10l-9 4-9-4Z M3 7l9 4 9-4 M12 11v10",
    materials: "M4 4h16v16H4z M4 10h16 M10 4v6 M15 10v10",
    projects:
      "M3 21h18 M5 21V7l7-4 7 4v14 M9 9h1 M14 9h1 M9 13h1 M14 13h1 M10 21v-4h4v4",
    movements: "M3 7h17l-4-4 M21 17H4l4 4 M20 7l-4 4 M4 17l4-4",
    intelligence: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z",
    reports: "M5 3h10l4 4v14H5z M14 3v5h5 M9 12h6 M9 16h6",
    alerts: "M5 16h14l-2-4V8a5 5 0 0 0-10 0v4z M10 20h4",
    audit: "M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z M8 12l3 3 5-6",
    users: "M4 21v-2a8 8 0 0 1 16 0v2",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      {name === "dashboard" ? (
        <>
          {[
            [3, 3],
            [14, 3],
            [3, 14],
            [14, 14],
          ].map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="7" height="7" rx="1" />
          ))}
        </>
      ) : (
        <>
          {name === "users" && <circle cx="12" cy="8" r="4" />}
          <path d={paths[name] || paths.inventory} />
        </>
      )}
    </svg>
  );
}
export function Badge({ children, kind = "" }) {
  return <span className={`pill ${kind}`}>{children}</span>;
}
export function Head({ title, subtitle, children }) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">WORKSPACE / {title.toUpperCase()}</div>
        <h1>{title}</h1>
        <p className="subtle">{subtitle}</p>
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}
export function MaterialName({ item }) {
  return (
    <div className="name-cell">
      <span className="material-icon">▧</span>
      <div>
        <strong>{item.material || item.name}</strong>
        <small>{item.sku || ""}</small>
      </div>
    </div>
  );
}
export function Table({
  headers,
  rows,
  empty = "No records yet. Create a project and add materials to get started.",
}) {
  return rows.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i}>
              {cells.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="empty">{empty}</div>
  );
}
export function Field({ name, label, type = "text", value = "", ...props }) {
  return (
    <label className="field">
      {label}
      <input name={name} type={type} defaultValue={value} {...props} />
    </label>
  );
}
export function Select({ name, label, options, value = "" }) {
  return (
    <label className="field">
      {label}
      <select name={name} required defaultValue={value || options[0]?.[0]}>
        {options.map(([id, text]) => (
          <option key={id} value={id}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Pager({ data, onPage }) {
  return (
    <div className="pager">
      <span>
        {fmt(data.total)} records · Page {data.page}
      </span>
      <div className="actions">
        <button
          className="button secondary small"
          disabled={data.page <= 1}
          onClick={() => onPage(data.page - 1)}
        >
          ← Previous
        </button>
        <button
          className="button secondary small"
          disabled={data.page * data.limit >= data.total}
          onClick={() => onPage(data.page + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
export function Modal({
  title,
  label = "Save changes",
  onSubmit,
  onClose,
  children,
}) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    ref.current.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
      aria-labelledby="modal-title"
    >
      <div className="dialog-heading">
        <h2 id="modal-title">{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(e.currentTarget));
          setBusy(true);
          setError("");
          try {
            await onSubmit(data);
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset
          disabled={busy}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        >
          {children}
        </fieldset>
        <div className="form-error" role="alert">
          {error}
        </div>
        <div className="form-footer">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button" type="submit" disabled={busy}>
            {busy ? "Saving…" : label}
          </button>
        </div>
      </form>
    </dialog>
  );
}
