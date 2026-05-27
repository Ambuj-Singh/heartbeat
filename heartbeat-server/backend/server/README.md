# Heartbeat Backend

## Setup

1. Copy `backend/.env.example` to `backend/.env`
2. Ensure MongoDB is running
3. Install dependencies:
   `npm install`
4. Start the server in development:
   `npm run dev`

Default bootstrap login:
- username: value of `BOOTSTRAP_ADMIN_USERNAME`
- password: value of `BOOTSTRAP_ADMIN_PASSWORD`

## Runtime

- REST base: `http://localhost:3002/api`
- Socket.IO server: `http://localhost:3002`

## Core endpoints

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/metrics?range=1m|5m|15m|1h`
- `GET /api/logs?level=ERROR&search=timeout`
- `GET /api/logs?level=ERROR&search=timeout&page=1&limit=50`
- `GET /api/incidents?status=ACTIVE&node=node-1`
- `GET /api/nodes?status=DEAD&sort=retries`
- `GET /api/alerts`
- `GET /api/ai/insights`

## Socket events

- Socket handshake auth:
  - browser sends secure auth cookies automatically with `withCredentials: true`
- Incoming: `metrics:update`
- Outgoing:
  - `dashboard:init`
  - `dashboard:update`
  - `metrics:broadcast`
  - `logs:stream`
  - `alerts:stream`
  - `incidents:update`
  - `ai:insight`

## Example metrics payload

```json
{
  "alive": 5,
  "dead": 1,
  "unknown": 0,
  "timestamp": "2026-04-04T12:00:00.000Z",
  "nodes": {
    "node-1": { "status": "ALIVE", "retries": 0 },
    "node-2": { "status": "DEAD", "retries": 4 }
  },
  "logs": [
    { "message": "node-2 probe failed", "level": "ERROR" }
  ]
}
```

## Auth

- Access tokens are stored in `httpOnly` cookies, not `localStorage`
- Refresh tokens are stored in separate rotating `httpOnly` cookies
- All `/api/*` routes except `/api/health`, `/api/auth/login`, `/api/auth/refresh`, and `/api/auth/logout` require a valid access cookie
- Role model:
  - `ADMIN`
  - `OPERATOR`
  - `VIEWER`
- Sensitive routes restricted to `ADMIN` and `OPERATOR`:
  - `/api/logs`
  - `/api/alerts`
  - `/api/ai/insights`
- Socket connections without a valid access cookie are rejected
- Refresh token theft is reduced by:
  - `httpOnly` cookies
  - `sameSite` cookie policy
  - optional `secure` cookies in production
  - server-side hashed refresh token storage
  - refresh token rotation

## Validation

- Request inputs are validated with `zod`
- `metrics:update` socket payloads are validated before persistence or broadcast
- Invalid REST or socket payloads are rejected safely with structured error details

## Performance

- Timestamp fields are indexed for time-series lookups
- Logs and metrics use TTL indexes for automatic expiry
- Metrics queries are capped by `METRICS_QUERY_LIMIT`
- Logs API supports pagination with `page` and `limit`
