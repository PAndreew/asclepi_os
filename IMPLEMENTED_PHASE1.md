# Implemented backend refactor

## Canonical backend
- `apps/server` is now the canonical backend target
- `apps/web` remains the current frontend target
- `packages/shared` was updated for the normalized model
- legacy `server/` can be removed or archived manually

## Implemented changes
- Introduced `metric_definitions`
- Introduced `metric_aliases`
- Introduced `metric_candidates`
- Replaced `structured_observations` as the active model with normalized `observations`
- Added deterministic `alert_rules`
- Added alert provenance storage in `alerts`
- Added legacy migration logic from `structured_observations` to `observations`
- Added metrics API endpoints
- Updated summary reporting to use normalized observations

## Main endpoints
- `GET /api/health`
- `GET /api/checkins`
- `POST /api/checkins`
- `GET /api/observations`
- `GET /api/alerts`
- `GET /api/metrics`
- `GET /api/metrics/aliases`
- `GET /api/metrics/candidates`
- `GET /api/reports/summary`
- `GET /api/reminders`
- `POST /api/reminders`
- `GET /api/documents`
- `POST /api/documents/upload`
- `GET /api/profile`
- `PUT /api/profile`

## Design outcome
The backend now uses a stable schema with row-based observations and a flexible metric catalog. New or unknown metrics are captured as candidates instead of mutating the schema at runtime.
