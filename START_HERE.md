# Run BuildStock

Choose **Option A (Docker)** if Docker Desktop is installed. Otherwise use **Option B** with your local MySQL, Node.js, and Python.

## Option A — Docker Desktop

1. Extract the ZIP and open the `buildstock` folder in VS Code.
2. Copy the root `.env.example` to `.env`.
3. Replace every `replace-...` value in `.env`. Use separate strong passwords/keys. `JWT_SECRET` must be at least 32 random characters. A convenient generator is:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. In the terminal, from the `buildstock` folder, run:

   ```bash
   docker compose up --build -d
   docker compose logs -f backend
   ```

   Wait for “BuildStock listening on port 3000”, then press Ctrl+C to leave the log view. The containers continue running.

5. Create your administrator:

   ```bash
   docker compose exec backend npm run admin:create
   ```

6. Optional: add two sample sites, four materials, and 35 days of **synthetic** stock activity:

   ```bash
   docker compose exec backend npm run seed
   ```

7. Open **http://localhost:3000**. Log in with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` you chose.
8. Remove the `ADMIN_PASSWORD` value from `.env`, then run `docker compose up -d backend` to remove it from the container environment. The account password is already stored as a bcrypt hash.

Stop with `docker compose down`. The named MySQL volume preserves data. Do not add `-v` unless you intentionally want to delete the database.

## Option B — Local development (Windows / VS Code)

Prerequisites: Node.js 22 or newer, MySQL 8.0+ (8.4 recommended), Python 3.12, and a running MySQL server. Use the database and account you create below, not the MySQL root account, for the application.

### 1. Create the MySQL database

Run this in MySQL Workbench. Choose your own database password and put the same value in the backend `.env`.

```sql
CREATE DATABASE buildstock CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'buildstock'@'localhost' IDENTIFIED BY 'your-strong-db-password';
GRANT ALL PRIVILEGES ON buildstock.* TO 'buildstock'@'localhost';
```

The schema initializer creates the six application tables automatically. MySQL client configuration may require choosing `localhost` rather than `127.0.0.1`; use the working local host in `DB_HOST`.

### 2. Configure and initialize the backend

Open a VS Code terminal in `buildstock`:

```powershell
cd backend
Copy-Item .env.example .env
npm ci
```

On macOS/Linux use `cp .env.example .env` instead of `Copy-Item`.

Edit `backend/.env`:

- Set `DB_HOST`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` to your MySQL settings.
- Replace `JWT_SECRET` with a random secret of at least 32 characters.
- Set `ML_API_KEY` to another random secret; Python must use exactly the same value.
- For React development set `APP_ORIGIN=http://localhost:5173`; keep port 3000 for the Express production build. Open the website using the matching exact address.
- Set `ADMIN_NAME`, `ADMIN_EMAIL`, and a strong `ADMIN_PASSWORD` (10–72 UTF-8 bytes).

Then run:

```powershell
npm run db:init
npm run admin:create
npm run seed
npm run dev
```

`npm run seed` is optional and works only when there are no projects or materials. Never use the demo seed for actual inventory. Remove `ADMIN_PASSWORD` from `.env` after account creation.

### 3. Start Python in a second terminal

From the root `buildstock` folder, using PowerShell:

```powershell
cd ml-service
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
$env:ML_API_KEY="paste-the-exact-key-from-backend-env"
.\.venv\Scripts\python.exe app.py
```

On macOS/Linux:

```bash
cd ml-service
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
export ML_API_KEY='paste-the-exact-key-from-backend-env'
.venv/bin/python app.py
```

Python’s `.env.example` is a reference only; the local command above supplies its environment. There is no automatic Python dotenv loading. Flask’s development server is for local use; the Render/Docker configuration uses Gunicorn.

### 4. Start React in a third terminal

From `buildstock`:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Visit **http://localhost:5173** and sign in using the administrator account you created. Use the Vite URL, not double-clicking `index.html` or VS Code Live Server. For production, run `npm.cmd run build` inside `frontend`, set backend `APP_ORIGIN=http://localhost:3000`, restart the backend, and open port 3000. See `REACT_SETUP.md`.

Try this workflow:

1. **Projects → New project**: create your site.
2. **Materials → Add material**: create Cement, unit `bags`, price `390`, minimum `200`.
3. **Inventory → Stock in**: receive `500` bags for the site.
4. **Stock out**: issue `60` bags with a reason.
5. Confirm the balance is `440` in Inventory.
6. **Reports → Export CSV**: download the report.
7. Register a second account. As admin, set its role in **Team & access** and assign its site through **Projects → Members**.
8. **AI insights**: with fresh data, see “Collecting history”; the sample seed provides enough historical activity to exercise forecasting immediately.

## Common issues

| Problem | Fix |
|---|---|
| Cannot connect to MySQL | Start MySQL; check DB_HOST/PORT/USER/PASSWORD; ensure the database exists. |
| Tables do not exist | Run `npm run db:init` from `backend`. |
| Invalid JWT secret at startup | Replace the placeholder with at least 32 random characters. |
| “Request origin is not allowed” | Match the browser address exactly to APP_ORIGIN, including port; do not mix localhost and 127.0.0.1. |
| Login succeeds but no projects appear | An admin must assign project membership; new registrations are viewers. |
| Python unavailable | Start the Python service; match ML_API_KEY in both services and check ML_URL. |
| Seed refuses to run | It intentionally requires an empty project/material database. Use the UI for existing data. |
| Material cannot be archived | Its balance must be zero in every project. |
| Material unit cannot be changed | Historical quantities already use the original unit; create a new material instead. |
| A new password does not change an existing admin | `admin:create` only creates accounts; it deliberately does not overwrite them. |

## Run tests

From `backend`: `npm test`.

From `ml-service`, after installing dependencies: `python -m unittest discover -s tests -v` (or use your virtual environment’s Python).

For the MySQL integration test, follow `docs/TESTING.md` and use a separate database ending in `_test`.
