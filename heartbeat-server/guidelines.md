# Project Guidelines

## Overview

Heartbeat is a real-time infrastructure monitoring and observability platform.

The project currently includes:
- React frontend with route-based pages
- Socket.IO realtime updates
- Node.js + Express backend
- MongoDB persistence with Mongoose
- JWT auth for REST and websocket connections
- Zod validation for request and socket payloads
- Incident lifecycle management
- Alert center and auditability foundations

This repo is split into:
- `monitor-ui/`
  Frontend dashboard
- `backend/`
  Backend runtime files and application source

## Core Product Areas

The platform supports:
- realtime node health monitoring
- incident lifecycle tracking
- alert generation and alert workflow
- logs exploration
- analytics by time range
- AI insight summaries
- audit trail for operator actions

## Tagging Model

Yes, the system is tag-aware.

The platform is designed to support multi-cluster and multi-environment monitoring through these fields:
- `cluster`
- `service`
- `region`
- `environment`
- `node`

These tags should be treated as first-class filters across backend and frontend work.

When adding new features, assume they should work with tagged data unless there is a strong reason not to.

Apply tags consistently to:
- node records
- incident records
- alert records
- log records
- analytics filters

## Frontend Architecture

Frontend stack:
- React
- React Router
- Recharts
- Material UI Icons
- Socket.IO client
- custom CSS

Important frontend areas:
- `monitor-ui/src/App.js`
  route registration
- `monitor-ui/src/hooks/useDashboard.js`
  shared dashboard state, realtime integration, analytics range handling
- `monitor-ui/src/components/`
  reusable layout and UI blocks
- `monitor-ui/src/pages/`
  route-level screens
- `monitor-ui/src/api/`
  REST and socket client helpers

Frontend pages include:
- `/overview`
- `/nodes`
- `/incidents`
- `/alerts`
- `/logs`
- `/analytics`
- `/ai`
- `/audit`

Frontend expectations:
- keep route-based structure
- prefer reusable hooks/components
- keep `App.js` thin
- preserve current layout/sidebar/topbar pattern
- use URL query params for filter and time-range state where possible

## Backend Architecture

Backend stack:
- Node.js
- Express
- MongoDB + Mongoose
- Socket.IO
- dotenv
- helmet
- cors
- express-rate-limit
- jsonwebtoken
- zod

Backend structure:
- `backend/server/config/`
- `backend/server/models/`
- `backend/server/routes/`
- `backend/server/services/`
- `backend/server/socket/`
- `backend/server/validation/`
- `backend/server/app.js`
- `backend/server/server.js`
- `backend/server.js`

Backend rules:
- keep routes thin
- put business logic in services
- validate new inputs with Zod
- protect routes with existing auth middleware
- use RBAC correctly

Roles:
- `VIEWER`
  read only
- `OPERATOR`
  acknowledge and resolve workflow actions
- `ADMIN`
  full access

## Realtime Contract

Primary socket event:
- incoming: `metrics:update`

Common outgoing events:
- `dashboard:init`
- `dashboard:update`
- `metrics:broadcast`
- `logs:stream`
- `alerts:stream`
- `incidents:update`
- `ai:insight`

Socket auth:
- client must send JWT in handshake auth

## Key Backend Endpoints

Auth:
- `POST /api/auth/login`

Health:
- `GET /api/health`

Metrics and analytics:
- `GET /api/metrics?range=1m|5m|15m|1h|24h`
- `GET /api/analytics/summary?range=...`

Nodes:
- `GET /api/nodes`

Incidents:
- `GET /api/incidents`
- `PATCH /api/incidents/:id/acknowledge`
- `PATCH /api/incidents/:id/resolve`
- `PATCH /api/incidents/:id/notes`

Alerts:
- `GET /api/alerts`
- `PATCH /api/alerts/:id/acknowledge`
- `PATCH /api/alerts/:id/resolve`

Logs:
- `GET /api/logs`

Audit:
- `GET /api/audit-logs`

AI:
- `GET /api/ai/insights`

## Important Commands

### Root Backend Entry

Install backend dependencies:
```powershell
npm install
```

Run backend in dev mode:
```powershell
npm run dev
```

Run backend normally:
```powershell
npm start
```

### Frontend

Move into frontend:
```powershell
Set-Location monitor-ui
```

Install frontend dependencies:
```powershell
npm install
```

Run frontend dev server:
```powershell
npm start
```

Build frontend:
```powershell
npm run build
```

Run frontend tests:
```powershell
npm test -- --watchAll=false --runInBand
```

## Environment Setup

Backend env file:
- copy `backend/.env.example` to `backend/.env`

Important backend env values:
- `PORT`
- `MONGODB_URI`
- `CORS_ORIGIN`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `BOOTSTRAP_ADMIN_USERNAME`
- `BOOTSTRAP_ADMIN_PASSWORD`
- `BOOTSTRAP_ADMIN_ROLE`
- `LOG_TTL_SECONDS`
- `METRIC_TTL_SECONDS`
- `METRICS_QUERY_LIMIT`
- `INCIDENT_COOLDOWN_SECONDS`

MongoDB must be running before starting the backend.

## Development Conventions

- Do not rewrite the system when extending it.
- Prefer incremental changes.
- Preserve current realtime flow.
- Keep auth and validation intact.
- Add indexes when adding query-heavy fields.
- Use pagination for list endpoints.
- Maintain null/undefined safety in frontend components.
- Keep alert, incident, and audit actions traceable.
- If a feature can be filtered by tags, implement the filters.

## When Adding New Features

Before merging new work, check:
- does it support tags where relevant?
- does it respect RBAC?
- does it validate input?
- does it fit the current route/page structure?
- does it preserve realtime behavior?
- does it need audit logging?
- does it need pagination or query limits?

## Verification Checklist

Backend:
```powershell
Get-ChildItem -Recurse backend\\server -Filter *.js | ForEach-Object { node --check $_.FullName }
```

Frontend:
```powershell
Set-Location monitor-ui
npm run build
```

If you change auth, routing, analytics, alerts, or incidents, verify both frontend and backend paths.
