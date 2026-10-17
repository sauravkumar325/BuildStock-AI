# BuildStock — React frontend

The UI now uses React components, hooks, and JSX. The original CSS, colours, layouts, responsive breakpoints and backend API are retained. No HTML-string rendering or DOM event binding is used for application screens.

## If you already run BuildStock on Windows

1. Extract this ZIP to a new folder and open its `buildstock` folder in VS Code.
2. Copy your existing `backend/.env` into this version's `backend` folder. Keep your existing MySQL database settings and secrets. Your database lives in MySQL; it is not inside this ZIP. No database reset or reseed is needed.
3. For React development, change this line in `backend/.env`:

   ```env
   APP_ORIGIN=http://localhost:5173
   ```

   Keep `PORT=3000` and `NODE_ENV=development`. Restart the backend after changing its environment.
4. Terminal 1 — from `buildstock`:

   ```powershell
   cd backend
   npm.cmd ci
   npm.cmd run dev
   ```

5. Terminal 2 — from `buildstock`:

   ```powershell
   cd frontend
   npm.cmd ci
   npm.cmd run dev
   ```

6. Open **http://localhost:5173** and use your existing login.
7. Run the Python ML service as before for AI forecasts. The Python instructions and first-time MySQL setup are in `START_HERE.md`.

Use Node.js 22 or newer. `frontend/package.json` is now included. If you see ENOENT, run `dir` and make sure you are in the folder containing that file. In PowerShell use `npm.cmd` if script execution policy blocks `npm`.

The Vite server proxies `/api` to `http://localhost:3000`. Cookie authentication remains same-origin in the browser. Both frontend and backend must be running; use localhost consistently, not 127.0.0.1. Do not use Live Server.

## Production / single server on your PC

```powershell
cd frontend
npm.cmd ci
npm.cmd run build
cd ../backend
npm.cmd ci
npm.cmd start
```

Before starting the backend, set `APP_ORIGIN=http://localhost:3000` for local use and restart it. Open **http://localhost:3000**. A verified build is already included in this ZIP; rebuild after editing React source. For an actual HTTPS deployment use `NODE_ENV=production` and its HTTPS origin. Docker and Render configurations build React automatically.

## React source structure

- `frontend/src/main.jsx`: React root and shared stylesheet.
- `frontend/src/App.jsx`: session, navigation, project scope, API loading and toast state.
- `frontend/src/Login.jsx`: login and registration.
- `frontend/src/Pages.jsx`: overview, projects, materials, inventory, stock history, AI insights, notifications, reports, audit and team screens.
- `frontend/src/Forms.jsx`: project/material forms, archive, stock transactions, roles and membership.
- `frontend/src/components.jsx`: reusable table, dialog, fields, badges, icons and pagination.
- `frontend/src/api.js`: same-origin API requests and session-expiry handling.
- `frontend/styles.css`: original design, unchanged.
- `frontend/vite.config.js`: development and preview proxy.

All mutations use the original backend routes, including stable idempotency keys on stock submission retries. Permissions are reflected in the UI and still enforced by the backend. Search, project filtering, CSV downloads and pagination remain available.

## Verification

Run `npm.cmd test` and `npm.cmd run build` in `frontend`, then `npm.cmd test` in `backend`. Backend HTTP tests require the frontend build. Full database integration requires your configured MySQL test database; see `docs/TESTING.md`.

### Checks performed for this conversion

- React production build: passed.
- Eight backend HTTP/security/stock tests: passed.
- React DOM interaction suite: passed with mocked API responses (all ten screens, login/logout, role controls, stock retry idempotency, memberships, project/material creation, search, project filter, pagination, and CSV link).
- The stylesheet is unchanged from the uploaded project. Browser screenshot verification was blocked by the execution environment. Live MySQL and ML end-to-end checks were not run.
