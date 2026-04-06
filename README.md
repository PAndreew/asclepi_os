# Asclepios Phase 1

Local-first personal health data gatherer, organiser and analyser.

## Phase 1 included
- Local web UI
- Morning/evening free-text check-ins
- Raw entry storage
- Structured observation extraction
- Basic reminder settings storage
- Simple suspicious-pattern alerting
- Local SQLite database
- Local OpenAI-compatible model gateway stub
- Report summary endpoint scaffold
- Document upload metadata scaffold

## Architecture
- `server/`: local Node/TypeScript server and static web UI
- `server/public/`: browser UI
- `server/src/db.ts`: SQLite setup and queries
- `server/src/extract.ts`: simple natural-language extraction for sleep, blood pressure, weight, temperature, medications, symptoms
- `server/src/alerts.ts`: threshold-based flags
- `server/src/modelGateway.ts`: local OpenAI-compatible endpoint wrapper scaffold for Ollama / llama.cpp
- `server/src/healthAgent.ts`: constrained health-agent orchestration layer

## Quick start
1. Install Node.js 20+
2. In this folder run `npm install`
3. Copy `.env.example` to `.env`
4. Run `npm run dev`
5. Open `http://localhost:8787`

## Notes
- The agent is designed to access only the health database layer, not the host OS.
- PDF/image ingestion is scaffolded for Phase 2, but metadata endpoints already exist.
- The extraction layer is intentionally deterministic-first for safety.

## Next recommended steps
1. Replace rule extractor with PI/BeeZee-compatible tool runner
2. Add encrypted-at-rest key handling
3. Add PDF parsing pipeline
4. Add local notification daemon
5. Add phone pairing / private network access
