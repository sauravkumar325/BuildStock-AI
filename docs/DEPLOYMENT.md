# Deploy on Render

The source is prepared for Render, but no live services or database have been provisioned for you. Deployment requires your Render account, a connected Git repository, and MySQL connection details.

The supplied `render.yaml` declares a Node web service and a private Python service. The selected service plans incur charges; review the plans in Render before creating them. MySQL is separately provisioned. Render’s Blueprint `databases` section is for PostgreSQL, so this project does not use it or substitute PostgreSQL for MySQL.

## 1. Prepare MySQL

Use an existing MySQL 8+ host, or follow Render’s official MySQL deployment guide to operate MySQL as a private service with persistent disk storage. Create the `buildstock` database and an application account with access only to that database. Arrange backups.

For an external database, enable network access from your Render service and TLS. The blueprint defaults `DB_SSL=true`, which verifies the certificate. If your provider uses a custom CA, extend the database SSL configuration with that CA; do not disable verification to work around a certificate error. For a private, non-TLS MySQL service, explicitly set `DB_SSL=false` and keep it private.

## 2. Push the project to a Git repository

Commit the extracted `buildstock` contents with `render.yaml` at the repository root. Include both `backend/package-lock.json` and `frontend/package-lock.json`. Never commit `.env`, actual passwords, node_modules, or a database dump.

## 3. Create a Render Blueprint

Connect the repository and choose the supplied blueprint. Supply:

- `APP_ORIGIN`: the exact HTTPS origin of the Node service, without a trailing slash, such as `https://your-buildstock.onrender.com`. Update it if Render assigns a different URL.
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`; adjust `DB_PORT` if necessary.
- The blueprint generates `JWT_SECRET` and the Python `ML_API_KEY`.
- `ML_HOSTPORT` points to the Python private service; the Node configuration adds `http://` automatically.
- Both services must be in the same region to use the private address.

The web build installs frontend dependencies, runs `vite build`, then installs production backend dependencies. Express serves the generated `frontend/dist` assets. Its pre-deploy command initializes missing tables with `npm run db:init`, and its start command runs the Express server. The health endpoint `/health` reports whether MySQL is reachable. Python starts through Gunicorn on port 8000.

`db:init` is an initial schema creator, not a versioned migration system. It does not automatically alter existing columns; add and review migrations before future schema changes.

## 4. Create the first administrator

Temporarily set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in the Node service’s environment. In its Render shell, run:

```bash
cd backend
npm run admin:create
```

Remove `ADMIN_PASSWORD` afterward and redeploy to clear it from the running environment. Log in at the Node service URL. Demo seeding is intentionally disabled when `NODE_ENV=production`; enter actual material and project data through the UI.

Set `ALLOW_REGISTRATION=false` after team onboarding if self-registration is unnecessary. The initial version has no email invitation flow or password reset UI.

## 5. Verify before relying on it

- Login, project creation and member assignment work.
- Receiving 10 units and issuing 7 leaves 3.
- Two concurrent withdrawals cannot overdraw.
- A viewer cannot post stock and an unassigned user cannot read a project.
- Inventory reports export and audit entries appear.
- Python is reachable using the private address and shared key.
- HTTPS is active and APP_ORIGIN exactly matches the public address.
- Run the included integration suite against a disposable MySQL test database.

Rate limiting currently uses process memory and is intended for one Node instance. Horizontal deployment needs a shared rate-limit store. JWTs expire after eight hours; logout clears the browser cookie but there is no token-revocation table. Authentication rechecks the user’s current role on every request.

## Official reference sources

- Node/Express on Render: https://render.com/docs/deploy-node-express-app
- Render Blueprint fields: https://render.com/docs/blueprint-spec
- MySQL on Render: https://render.com/docs/deploy-mysql
- Sequelize transactions and row locks: https://sequelize.org/docs/v6/other-topics/transactions/

Consult these sources for current hosting options and pricing. No successful deployment is claimed in this package.
