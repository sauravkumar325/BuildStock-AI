const { test } = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const { buildSync } = require("esbuild");
const Module = require("node:module");
const path = require("node:path");
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost:5173",
});
for (const key of [
  "window",
  "document",
  "HTMLElement",
  "HTMLDialogElement",
  "FormData",
  "Event",
  "MouseEvent",
])
  global[key] = dom.window[key];
Object.defineProperty(global, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute("open", "");
};
const React = require("react");
const {
  configure,
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  cleanup,
} = require("@testing-library/react");
configure({ defaultHidden: true });
const bundle = buildSync({
  entryPoints: [path.join(__dirname, "../src/App.jsx")],
  bundle: true,
  write: false,
  format: "cjs",
  platform: "node",
  packages: "external",
}).outputFiles[0].text;
const compiled = new Module(path.join(__dirname, "compiled.cjs"), module);
compiled.filename = path.join(__dirname, "compiled.cjs");
compiled.paths = module.paths;
compiled._compile(bundle, compiled.filename);
const App = compiled.exports.default;
test("React screens and complete user interactions against mocked API", async () => {
  let signed = false,
    role = "admin",
    failStock = true;
  const writes = [];
  const user = () => ({
    id: 1,
    name: "Saurav Kumar",
    email: "saurav@example.com",
    role,
  });
  let projects = [
    { id: 1, name: "PCU Block D", location: "Pune", status: "active" },
    { id: 2, name: "Site B", location: "Pune", status: "active" },
  ];
  let materials = [
    {
      id: 1,
      name: "Steel",
      sku: "ST-01",
      category: "Metal",
      unit: "kg",
      unitPrice: 60,
      minimumStock: 20,
    },
  ];
  const item = {
    ...materials[0],
    material: "Steel",
    project: "PCU Block D",
    quantity: 100,
    value: 6000,
    active: true,
    lowStock: false,
  };
  let members = [
    { id: 2, name: "Viewer User", email: "viewer@example.com", role: "viewer" },
  ];
  global.fetch = async (input, options = {}) => {
    const url = new URL(input, "http://localhost:5173"),
      p = url.pathname.replace("/api", "");
    let body = {},
      status = 200;
    if (options.method && options.method !== "GET") {
      const d = options.body ? JSON.parse(options.body) : null;
      writes.push({ p, d, method: options.method });
      if (p === "/auth/login") {
        signed = true;
        body = { user: user() };
      } else if (p === "/auth/logout") {
        signed = false;
      } else if (p === "/stock/in" && failStock) {
        failStock = false;
        status = 409;
        body = { error: "Please retry this receipt" };
      } else if (p === "/projects") projects.push({ ...d, id: 3 });
      else if (p === "/materials") materials.push({ ...d, id: 2 });
      else if (p.includes("/members/") && options.method === "DELETE")
        members = [];
    } else if (p === "/auth/me") {
      status = signed ? 200 : 401;
      body = signed ? { user: user() } : { error: "Please log in again." };
    } else if (p === "/projects") body = projects;
    else if (p === "/materials") body = materials;
    else if (p === "/dashboard")
      body = {
        inventoryValue: 6000,
        totalMaterials: 1,
        projects: 2,
        lowStockCount: 0,
        lowStock: [],
        movement: [{ date: "2026-10-15", inValue: 6000, outValue: 200 }],
      };
    else if (p === "/inventory") body = [item];
    else if (p === "/stock/history")
      body = {
        items: [
          {
            date: "2026-10-15",
            Material: materials[0],
            Project: projects[0],
            User: user(),
            type: "IN",
            quantity: 100,
            reason: "Delivery",
          },
        ],
        total: 30,
        page: Number(url.searchParams.get("page")),
        limit: 20,
      };
    else if (p === "/intelligence")
      body = {
        available: true,
        message: "Ready",
        forecasts: [
          {
            ...item,
            status: "ready",
            predictedDemand: 25,
            shortage: 0,
            recommendedReorder: 0,
            method: "moving_average",
            validationMAE: 1,
            anomaly: true,
          },
          { ...item, status: "collecting", historyDays: 3 },
        ],
      };
    else if (p === "/notifications")
      body = {
        available: true,
        alerts: [
          {
            material: "Steel",
            project: "PCU Block D",
            type: "LOW_STOCK",
            severity: "warning",
            message: "Review stock",
          },
        ],
      };
    else if (p === "/reports")
      body = {
        valuationMethod: "Current catalog",
        generatedAt: "2026-10-15",
        items: [{ ...item, consumed: 10 }],
      };
    else if (p === "/audit-logs")
      body = {
        items: [
          {
            createdAt: "2026-10-15",
            User: user(),
            Project: projects[0],
            Material: materials[0],
            action: "STOCK_IN",
            details: { quantity: 100 },
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
      };
    else if (p === "/users")
      body = [
        user(),
        {
          id: 2,
          name: "Viewer User",
          email: "viewer@example.com",
          role: "viewer",
        },
      ];
    else if (p.endsWith("/members")) body = members;
    else {
      status = 404;
      body = { error: "Unexpected fixture: " + p };
    }
    return { ok: status < 400, status, json: async () => body };
  };
  const click = (name) =>
    fireEvent.click(screen.getByRole("button", { name, exact: true }));
  const nav = async (label, title) => {
    fireEvent.click(
      within(screen.getByRole("navigation")).getByRole("button", {
        name: label,
        exact: true,
      }),
    );
    await screen.findByRole("heading", { name: title, exact: true });
  };
  const fill = (label, value) =>
    fireEvent.change(screen.getByLabelText(label, { exact: true }), {
      target: { value },
    });
  const submit = () => fireEvent.submit(document.querySelector("dialog form"));
  const closed = () =>
    waitFor(() => assert.ok(!document.querySelector("dialog")));
  render(React.createElement(App));
  await screen.findByRole("heading", { name: "Welcome back" });
  fill("Email address", "saurav@example.com");
  fill("Password", "password12345");
  fireEvent.submit(document.querySelector(".login-form form"));
  await screen.findByRole("heading", { name: "Site overview" });
  for (const [label, title] of [
    ["Projects", "Projects"],
    ["Materials", "Material catalog"],
    ["Inventory", "Inventory"],
    ["Stock movements", "Stock movements"],
    ["AI insights", "AI insights"],
    ["Reports", "Reports"],
    ["Notifications", "Notifications"],
    ["Audit trail", "Audit trail"],
    ["Team & access", "Team & access"],
  ])
    await nav(label, title);
  click("Change role");
  fill("Role", "manager");
  submit();
  await closed();
  assert.equal(writes.at(-1).d.role, "manager");
  await nav("Projects", "Projects");
  fireEvent.click(
    screen.getAllByRole("button", { name: "Members", exact: true })[0],
  );
  await screen.findByRole("button", { name: "Remove", exact: true });
  click("Remove");
  await waitFor(() =>
    assert.ok(!screen.queryByRole("button", { name: "Remove", exact: true })),
  );
  submit();
  await closed();
  fireEvent.click(
    screen.getAllByRole("button", { name: "View inventory →", exact: true })[0],
  );
  await screen.findByRole("heading", { name: "Inventory", exact: true });
  assert.equal(screen.getByLabelText("Filter by project").value, "1");
  fill("Find a material or project…", "missing");
  assert.equal(document.querySelectorAll("tbody tr").length, 0);
  fill("Find a material or project…", "Steel");
  assert.equal(document.querySelectorAll("tbody tr").length, 1);
  click("＋ Stock in");
  fill("Quantity", "10");
  fill("Reason / reference", "Supplier delivery");
  submit();
  await screen.findByText("Please retry this receipt");
  submit();
  await closed();
  const receipts = writes.filter((x) => x.p === "/stock/in");
  assert.equal(receipts.length, 2);
  assert.equal(receipts[0].d.idempotencyKey, receipts[1].d.idempotencyKey);
  assert.equal(receipts[1].d.projectId, 1);
  await nav("Stock movements", "Stock movements");
  click("Next →");
  await screen.findByText("30 records · Page 2");
  await nav("Materials", "Material catalog");
  click("＋ Add material");
  fill("Material name", "Cement");
  fill("SKU", "CE-01");
  fill("Category", "Cement");
  fill("Unit (bags, kg, tonnes…)", "bags");
  submit();
  await closed();
  await screen.findByText("2 materials");
  await nav("Projects", "Projects");
  click("＋ New project");
  fill("Project name", "New site");
  fill("Location", "Mumbai");
  submit();
  await closed();
  assert.equal(writes.at(-1).d.name, "New site");
  await nav("Reports", "Reports");
  assert.match(
    screen.getByRole("link", { name: "↓ Export CSV" }).href,
    /projectId=1&format=csv/,
  );
  click("Sign out");
  await screen.findByRole("heading", { name: "Welcome back" });
  role = "viewer";
  fill("Email address", "viewer@example.com");
  fill("Password", "password12345");
  fireEvent.submit(document.querySelector(".login-form form"));
  await screen.findByRole("heading", { name: "Site overview" });
  assert.equal(
    screen.queryByRole("button", { name: "＋ Stock in", exact: true }),
    null,
  );
  assert.equal(
    screen.queryByRole("button", { name: "Team & access", exact: true }),
    null,
  );
  cleanup();
});
