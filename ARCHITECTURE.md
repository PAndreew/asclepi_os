# Asclepios architecture

## Principles
- Local first
- Health-data-only agent capabilities
- Raw source preservation + structured extraction
- Deterministic alerting first, LLM explanation second
- Reviewable provenance for trust

## Runtime modules
1. Web UI
2. Local API server
3. Health data store
4. Scheduler / reminders
5. Document ingestion service
6. Model gateway for OpenAI-compatible local models
7. Reporting and chart service

## Phase 1 data flow
1. User completes morning/evening check-in.
2. Raw text is stored in `raw_entries`.
3. Simple extraction creates structured observations in `structured_observations`.
4. Timeline, reports and charts query structured data.
5. PDF uploads are stored with `pending` extraction state.
6. Reminders are scheduled by the server.

## Safety boundary
The health agent should only call explicit health tools exposed by the application server. It should not receive shell, filesystem, or arbitrary OS capabilities.
