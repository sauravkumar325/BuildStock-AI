# BuildStock REST API

Base URL: `/api`. Requests and responses use JSON unless exporting CSV. The browser authenticates with the HttpOnly `bs_token` cookie set by login. Server-to-server requests can also provide a valid Bearer JWT issued with this installation’s signing configuration; the login response intentionally does not expose the token to JavaScript.

Cookie-authenticated writes must include the matching `Origin` header. Browsers do this automatically. Stock dates use UTC. List pagination uses `page=1&limit=50` (maximum 100) and returns `{items,total,page,limit}` where indicated.

| Method | Route | Purpose / access |
|---|---|---|
| POST | `/auth/register` | `{name,email,password}`; creates viewer only; registration setting applies |
| POST | `/auth/login` | `{email,password}`; returns user and sets cookie |
| POST | `/auth/logout` | Clears cookie |
| GET | `/auth/me` | Current authenticated user |
| GET | `/projects` | Accessible projects |
| POST | `/projects` | `{name,location,status}`; admin/manager |
| PUT | `/projects/:id` | Same fields; admin/assigned manager |
| GET | `/projects/:id/members` | Accessible project members |
| POST | `/projects/:id/members` | `{userId}`; admin |
| DELETE | `/projects/:id/members/:userId` | Remove assignment; admin |
| GET | `/materials` | Shared active catalog; `archived=true` includes archived records |
| POST | `/materials` | Create material; admin/manager |
| PUT | `/materials/:id` | Full material form; admin/manager |
| DELETE | `/materials/:id` | Archive only when all balances are zero; admin/manager |
| GET | `/inventory?projectId=1` | Current balances for allowed projects |
| POST | `/stock/in` | Receive stock; admin/manager/storekeeper with project access |
| POST | `/stock/out` | Issue stock; same access and balance checks |
| GET | `/stock/history` | Paginated; optional projectId and materialId |
| GET | `/dashboard` | Metrics and last 14 days’ monetary movement; optional projectId |
| GET | `/reports` | Inventory, current valuation, all-time consumption; optional projectId |
| GET | `/reports?format=csv` | CSV download; optional projectId |
| GET | `/intelligence` | Seven-day forecasts and alerts; optional projectId |
| GET | `/notifications` | Same derived alerts and forecasts; optional projectId |
| GET | `/audit-logs` | Paginated; admin or assigned manager; optional projectId |
| GET | `/users` | User list; admin |
| PUT | `/users/:id/role` | `{role}`; admin; cannot change own role |

All PUT catalog endpoints expect the full form. There are no endpoints to edit/delete historical stock movements or audit entries.

## Material example

```json
{
  "name": "OPC 53 Cement",
  "sku": "CEM-053",
  "category": "Cement",
  "unit": "bags",
  "unitPrice": "390.00",
  "minimumStock": "200.000"
}
```

## Stock example

```json
{
  "projectId": 1,
  "materialId": 1,
  "quantity": "50.000",
  "reason": "Supplier delivery INV-001",
  "idempotencyKey": "55747367-0a49-45bb-89c7-44ce32c76e86"
}
```

Use a new UUID for each new movement. Reuse it only for an exact retry. The server assigns user, type, date, and posting price; these cannot be supplied by the client. Quantity must be positive, below 10 billion, and have at most 3 decimal places.

## Errors

Errors return `{"error":"Readable message"}`. Typical codes:

- 400: invalid input or unsupported self-role change.
- 401: missing/expired authentication.
- 403: role/project permission denied or wrong request origin.
- 404: missing project/material.
- 409: insufficient stock, duplicate data, completed project, or blocked archival/unit change.
- 429: rate limit reached.
- 500: unexpected server error; details remain server-side.

If Python is unavailable, `/intelligence` and `/notifications` return `available:false`, an empty forecast list, and working low-stock alerts. This does not block ordinary stock operations.

## Python service

`POST /predict` requires `X-API-Key`. It accepts `{horizon,series}`. Each series contains `key`, `currentStock`, `safetyStock`, `todayUsage`, and a consecutive `history` array of `{date,quantity}`. It returns `{predictions:[...]}`. The internal API supports horizons from 1–30 days; the application uses 7. Both services expose `/health`.
