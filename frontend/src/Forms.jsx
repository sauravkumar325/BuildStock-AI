import React, { useEffect, useState } from "react";
import { Field, Select, Modal } from "./components.jsx";
import { api, send } from "./api.js";
function Members({ id, onClose, onSaved }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [removing, setRemoving] = useState(null);
  const load = async () => {
    const [users, members] = await Promise.all([
      api("/users"),
      api(`/projects/${id}/members`),
    ]);
    setData({ users, members });
  };
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [id]);
  const available =
    data?.users.filter((u) => !data.members.some((m) => m.id === u.id)) || [];
  return (
    <Modal
      title="Project members"
      onClose={onClose}
      label={available.length ? "Assign member" : "Done"}
      onSubmit={async (d) => {
        if (!data || removing !== null)
          throw new Error("Please wait for members to finish loading.");
        if (d.userId)
          await send(`/projects/${id}/members`, { userId: Number(d.userId) });
        await onSaved();
      }}
    >
      <div className="notice">
        Administrators already have access to all projects.
      </div>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {!data ? (
        <>
          <p>Loading members…</p>
          {error && (
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setError("");
                load().catch((e) => setError(e.message));
              }}
            >
              Try again
            </button>
          )}
        </>
      ) : (
        <>
          {data.members.map((m) => (
            <div className="alert-card" key={m.id}>
              <div>
                <strong>{m.name}</strong>
                <p>{m.email}</p>
              </div>
              <button
                className="button danger small"
                type="button"
                disabled={removing !== null}
                onClick={async () => {
                  setRemoving(m.id);
                  setError("");
                  try {
                    await api(`/projects/${id}/members/${m.id}`, {
                      method: "DELETE",
                    });
                    await load();
                  } catch (e) {
                    setError(e.message);
                  } finally {
                    setRemoving(null);
                  }
                }}
              >
                Remove
              </button>
            </div>
          ))}
          {available.length ? (
            <Select
              key={available.map((u) => u.id).join(",")}
              name="userId"
              label="Assign a member"
              options={available.map((u) => [u.id, `${u.name} · ${u.role}`])}
            />
          ) : (
            <p className="subtle">All users are already assigned.</p>
          )}
        </>
      )}
    </Modal>
  );
}
export default function Forms({
  modal,
  projects,
  materials,
  projectId,
  onClose,
  onSaved,
}) {
  const { type, value } = modal;
  const [key] = useState(() => crypto.randomUUID());
  if (type === "members")
    return <Members id={value} onClose={onClose} onSaved={onSaved} />;
  let title,
    label = "Save changes",
    fields,
    submit;
  if (type === "project") {
    const p = value;
    title = p ? "Edit project" : "Create a project";
    fields = (
      <>
        <Field
          name="name"
          label="Project name"
          value={p?.name}
          required
          maxLength={160}
        />
        <Field
          name="location"
          label="Location"
          value={p?.location}
          required
          maxLength={255}
        />
        <Select
          name="status"
          label="Status"
          options={[
            ["active", "Active"],
            ["completed", "Completed"],
          ]}
          value={p?.status || "active"}
        />
      </>
    );
    submit = (d) =>
      send("/projects" + (p ? "/" + p.id : ""), d, p ? "PUT" : "POST");
  }
  if (type === "material") {
    const m = value;
    title = m ? "Edit material" : "Add a material";
    fields = (
      <>
        <Field
          name="name"
          label="Material name"
          value={m?.name}
          required
          maxLength={160}
        />
        <div className="form-grid">
          <Field
            name="sku"
            label="SKU"
            value={m?.sku}
            required
            maxLength={60}
          />
          <Field
            name="category"
            label="Category"
            value={m?.category}
            required
            maxLength={80}
          />
          <Field
            name="unit"
            label="Unit (bags, kg, tonnes…)"
            value={m?.unit}
            required
            maxLength={30}
          />
          <Field
            name="unitPrice"
            label="Unit price · INR"
            type="number"
            value={m?.unitPrice || "0"}
            required
            min="0"
            step="0.01"
          />
          <Field
            name="minimumStock"
            label="Minimum stock / safety stock"
            type="number"
            value={m?.minimumStock || "0"}
            required
            min="0"
            step="0.001"
          />
        </div>
      </>
    );
    submit = (d) =>
      send("/materials" + (m ? "/" + m.id : ""), d, m ? "PUT" : "POST");
  }
  if (type === "archive") {
    title = "Archive material";
    label = "Archive material";
    fields = (
      <p className="subtle">
        This removes the material from active lists and keeps its history. All
        project balances must be zero.
      </p>
    );
    submit = () => api("/materials/" + value, { method: "DELETE" });
  }
  if (type === "stock") {
    const incoming = value === "IN";
    title = incoming ? "Receive materials" : "Issue materials";
    label = incoming ? "Confirm stock in" : "Confirm stock out";
    fields = (
      <>
        <Select
          name="projectId"
          label="Project"
          options={projects
            .filter((p) => p.status === "active")
            .map((p) => [p.id, p.name])}
          value={
            projects.some(
              (p) => p.status === "active" && String(p.id) === projectId,
            )
              ? projectId
              : ""
          }
        />
        <Select
          name="materialId"
          label="Material"
          options={materials.map((m) => [m.id, `${m.name} (${m.unit})`])}
        />
        <Field
          name="quantity"
          label="Quantity"
          type="number"
          required
          min="0.001"
          step="0.001"
        />
        <label className="field">
          Reason / reference
          <textarea
            name="reason"
            required
            maxLength={500}
            placeholder="Supplier delivery, work area, or correction reference"
          />
        </label>
        <p className="subtle">
          Recorded with today’s UTC date. Movements cannot be edited or deleted.
        </p>
      </>
    );
    submit = (d) =>
      send("/stock/" + value.toLowerCase(), {
        ...d,
        projectId: Number(d.projectId),
        materialId: Number(d.materialId),
        idempotencyKey: key,
      });
  }
  if (type === "role") {
    title = "Change user role";
    fields = (
      <Select
        name="role"
        label="Role"
        value={value.role}
        options={[
          ["viewer", "Viewer — read assigned projects"],
          ["storekeeper", "Storekeeper — record stock"],
          ["manager", "Manager — manage materials and projects"],
          ["admin", "Admin — all projects and users"],
        ]}
      />
    );
    submit = (d) => send(`/users/${value.id}/role`, d, "PUT");
  }
  return (
    <Modal
      title={title}
      label={label}
      onClose={onClose}
      onSubmit={async (d) => {
        await submit(d);
        await onSaved();
      }}
    >
      {fields}
    </Modal>
  );
}
