# Asclepios

Local-first personal health journal and assistant scaffold.

## Structure

| Path | Role |
|---|---|
| `apps/server` | Canonical backend (Express + SQLite) |
| `apps/web` | React web client |
| `packages/shared` | Shared TypeScript types |

## Quick start

```bash
npm install
npm run dev
```

Server runs on `http://127.0.0.1:8787`.

## Backend capabilities

- Free-text morning, evening, and freeform check-ins
- Raw entry preservation in SQLite
- Normalized observation storage (`observations` table)
- Curated `metric_definitions` and `metric_aliases`
- Deterministic alert rules with stored provenance
- Candidate metric capture for unmapped labels
- Reminder storage
- Document upload metadata scaffold
- Local OpenAI-compatible summary gateway scaffold

## Design principles

- Raw source preserved first, extraction second
- Deterministic extraction and alerting — LLMs assist with summaries only
- Stable schema: row-based observations, flexible metric growth via definitions, aliases, and candidates

## API

```
GET  /api/health
GET  /api/checkins
POST /api/checkins
GET  /api/observations
GET  /api/alerts
GET  /api/metrics
GET  /api/metrics/aliases
GET  /api/metrics/candidates
GET  /api/reports/summary
GET  /api/reminders
POST /api/reminders
GET  /api/documents
POST /api/documents/upload
GET  /api/profile
PUT  /api/profile
```
