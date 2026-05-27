# Contributing

## Setup

Backend:
1. Copy `backend/.env.example` to `backend/.env`
2. Run `npm install`
3. Run `npm run dev`

Frontend:
1. `Set-Location monitor-ui`
2. Copy `monitor-ui/.env.example` to `.env`
3. Run `npm install`
4. Run `npm start`

## Contribution Expectations

- keep changes incremental
- preserve auth, RBAC, validation, and websocket behavior
- reuse existing hooks, services, and route structure before adding new layers
- update docs when env vars, APIs, or setup steps change
- keep demo mode working if you touch shared frontend data flows

## Tagging Model

Treat these as first-class filters across features:
- `cluster`
- `service`
- `region`
- `environment`
- `node`

## Before Opening a PR

- run the backend checks you touched
- run `npm run build` inside `monitor-ui`
- verify exported files, demo mode, and docker docs still make sense
