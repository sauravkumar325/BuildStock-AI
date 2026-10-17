# React frontend checks

From `frontend`, run `npm ci`, `npm test`, and `npm run build`. The React interaction suite uses jsdom and mocked APIs; it does not require MySQL or modify a real database. Build React before running backend HTTP tests.

# Verification report

## Executed successfully during project creation

**Node: 8 tests passed** (`cd backend && npm test`)

- Decimal stock arithmetic preserves an exact zero balance for 0.3 − 0.1 − 0.2.
- Overdraw is rejected; withdrawing exactly the available amount is allowed.
- Zero, negative, non-finite, and excessive-precision quantities are rejected.
- Registration rejects an attempt to self-assign administrator privileges.
- Unauthenticated project access returns 401.
- Invalid login input returns 400 before any database query.
- Cross-origin cookie-authenticated writes return 403.
- Frontend files are served with security headers.

**Python: 9 tests passed** (`cd ml-service && python -m unittest discover -s tests -v`)

- Requests without the shared key are rejected.
- Valid empty prediction requests work.
- Invalid horizons are rejected.
- Fewer than 14 days returns insufficient-data status.
- Constant consumption yields the expected forecast, shortage and reorder.
- Zero consumption does not produce negative reorders or a false anomaly.
- Linear growth selects the trend model with the expected forecast.
- NaN values are rejected.
- Missing calendar days are rejected.

JavaScript syntax checks passed for all shipped JavaScript source/test files. Both YAML configuration files parsed successfully. `npm audit --omit=dev --audit-level=moderate` reported **0 vulnerabilities** for the shipped lockfile at the time of checking. This is a dependency advisory check, not a full security assessment. The package overrides Sequelize’s transitive uuid dependency to a patched CommonJS-compatible 11.x release.

## Not executed here

- Real MySQL integration/concurrency tests: no MySQL server is available in the creation environment; attempted system package setup was blocked by environment permissions.
- Docker image builds and Docker Compose startup: Docker is unavailable here.
- Browser visual/interactive QA: no supported browser QA capability is available here.
- Render deployment and live health checks: no Render account/database connection was supplied.

These limits do not count as passing tests. The included MySQL integration test was invoked without RUN_DB_TESTS and correctly reported **skipped**.

## Run the MySQL integration test

Use a disposable database whose name ends in `_test`. The test creates and removes its own fixtures, but must never point at a real inventory database.

As a MySQL administrator:

```sql
CREATE DATABASE buildstock_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON buildstock_test.* TO 'buildstock'@'localhost';
```

From `backend`, with your regular connection settings in `.env`, run in PowerShell:

```powershell
$env:DB_NAME="buildstock_test"
$env:RUN_DB_TESTS="true"
npm run test:integration
Remove-Item Env:DB_NAME
Remove-Item Env:RUN_DB_TESTS
```

On macOS/Linux:

```bash
DB_NAME=buildstock_test RUN_DB_TESTS=true npm run test:integration
```

Set a valid JWT_SECRET in `.env` before the test. The suite checks:

1. A retried movement UUID does not create another movement.
2. Reusing a UUID with different data fails.
3. Two concurrent 7-unit withdrawals against 10 units allow only one and leave 3 units.
4. Only successful movements receive audit entries.
5. Unassigned users cannot read a project.
6. Viewers cannot write stock.
7. Assigned viewers can read balances and export CSV.
8. Materials with stock cannot be archived.
9. Completed projects reject new movements.

The integration suite closes connections and removes its own fixtures in a finally block. Tests do not drop tables or the database.
