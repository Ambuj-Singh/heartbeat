# Heartbeat Platform

Heartbeat is an open-source real-time infrastructure monitoring platform built for demos, operator workflows, and incremental production adoption. It combines a React dashboard with a Node.js, MongoDB, and Socket.IO backend to manage node health, incidents, alerts, logs, analytics, exports, and auditability across tagged environments.

## Features

- realtime dashboard with websocket updates
- alert center and incident lifecycle workflow
- historical analytics across `1m`, `5m`, `15m`, `1h`, and `24h`
- multi-cluster filtering with `cluster`, `service`, `region`, `environment`, and `node`
- audit trail for operator and system actions
- JSON and CSV exports for incidents and logs
- Slack and generic webhook outbound notifications
- demo mode for local walkthroughs without a live backend
- Docker-based one-command setup

## Screenshots

- `docs/screenshots/overview.png` placeholder
- `docs/screenshots/alerts.png` placeholder
- `docs/screenshots/incidents.png` placeholder

## Repository Layout

- `monitor-ui/`: React frontend
- `backend/`: Express, Socket.IO, and MongoDB backend
- `docker-compose.yml`: local full-stack orchestration
- `guidelines.md`: project-specific development notes

## Quick Start

### Docker

```powershell
docker compose up --build
```

Services:
- frontend: `http://localhost:3000`
- backend: `http://localhost:3002`
- MongoDB: `mongodb://localhost:27017`

### Local Development

Backend:
1. Copy `backend/.env.example` to `backend/.env`
2. Run `npm install`
3. Run `npm run dev`

Frontend:
1. `Set-Location monitor-ui`
2. Copy `monitor-ui/.env.example` to `.env`
3. Run `npm install`
4. Run `npm start`

One-command local dev on Windows:

```powershell
npm run dev:all
```

This creates missing local `.env` files from examples, starts MongoDB with Docker Compose, waits for MongoDB, and opens separate backend/frontend dev server windows.

## Demo Mode

Set `REACT_APP_DEMO_MODE=true` in `monitor-ui/.env` to run the frontend against local mock data. Demo mode disables live sockets, simulates incidents, alerts, logs, and analytics snapshots, and labels the UI clearly so it is not confused with a live environment.

## Environment Variables

Backend highlights:
- `PORT`
- `NODE_ENV`
- `MONGODB_URI`
- `DOCKER_MONITOR_ENABLED`
- `DOCKER_MONITOR_INTERVAL_MS`
- `DOCKER_MONITOR_CLUSTER`
- `CORS_ORIGIN`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `ACCESS_TOKEN_COOKIE_NAME`
- `REFRESH_TOKEN_COOKIE_NAME`
- `COOKIE_SECURE`
- `COOKIE_SAMESITE`
- `SLACK_WEBHOOK_URL`
- `GENERIC_WEBHOOK_URL`
- `ENABLE_OUTBOUND_NOTIFICATIONS`
- `EXPORT_LIMIT_MAX`

Frontend highlights:
- `REACT_APP_API_URL`
- `REACT_APP_SOCKET_URL`
- `REACT_APP_DEMO_MODE`

## Core API Surface

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/system`
- `GET /api/metrics`
- `GET /api/analytics/summary`
- `GET /api/incidents`
- `GET /api/incidents/export`
- `GET /api/alerts`
- `GET /api/logs`
- `GET /api/logs/export`
- `GET /api/audit-logs`
- `GET /api/integrations/status`
- `POST /api/integrations/test`

## Architecture Overview

- frontend pages live in `monitor-ui/src/pages`
- frontend shared data and API access live in `monitor-ui/src/hooks` and `monitor-ui/src/api`
- backend routes live in `backend/server/routes`
- backend business logic lives in `backend/server/services`
- websocket auth and events live in `backend/server/socket`
- validation lives in `backend/server/validation`

## Security Notes

- authentication uses `httpOnly` cookies and rotating refresh tokens
- roles are `ADMIN`, `OPERATOR`, and `VIEWER`
- websocket connections are authenticated through cookies
- outbound integrations are configured only through environment variables

## Roadmap

- packaged Kubernetes and cloud deployment starters
- stronger automated test coverage
- SSO and enterprise auth providers
- richer long-term metrics storage backends
- dedicated incident detail views

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup and contribution expectations.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
