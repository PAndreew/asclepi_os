# Asclepios architecture

## Principles
- Local first
- Health-data-only agent capabilities
- Raw source preservation plus structured extraction
- Deterministic alerting first, LLM explanation second
- Reviewable provenance for trust
- Stable schema, flexible metric catalog

## Canonical application layout
1. `apps/web` - browser client
2. `apps/server` - canonical local API server
3. `packages/shared` - shared types
4. Legacy `server/` - manual archive/remove path

## Core data model
### Raw sources
- `raw_entries`
- `documents`

### Metric registry
- `metric_definitions`
- `metric_aliases`
- `metric_candidates`

### Normalized facts
- `observations`

### Deterministic safety layer
- `alert_rules`
- `alerts`

### User state
- `profile`
- `reminders`

## Phase 2-oriented data flow
1. User submits a check-in or uploads a document.
2. Raw source is stored unchanged.
3. Deterministic extraction creates normalized `observations` for known metrics.
4. Unmapped metric-like labels go into `metric_candidates`.
5. Deterministic rules generate `alerts` with provenance.
6. Reports, charts, and future assistants query normalized observations plus metric metadata.
7. Local LLM summaries remain advisory and non-diagnostic.

## Safety boundary
The health agent should only call explicit health tools exposed by the application server. It should not receive shell, filesystem, or arbitrary OS capabilities. Automated alerts should remain rule-based and explainable.
