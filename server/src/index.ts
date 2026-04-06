import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { createDb } from './db.js';
import { HealthAgent } from './healthAgent.js';
import { ModelGateway } from './modelGateway.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const publicDir = path.join(rootDir, 'public');

const port = Number(process.env.PORT || 8787);
const appDataDir = process.env.APP_DATA_DIR || path.join(rootDir, 'data');
const openAiBaseUrl = process.env.OPENAI_BASE_URL || 'http://127.0.0.1:11434/v1';
const openAiApiKey = process.env.OPENAI_API_KEY || 'local-dev';
const openAiModel = process.env.OPENAI_MODEL || 'llama3.1';

const db = createDb(appDataDir);
const modelGateway = new ModelGateway(openAiBaseUrl, openAiApiKey, openAiModel);
const healthAgent = new HealthAgent(db, modelGateway);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(publicDir));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'asclepios-phase1', modelEndpoint: openAiBaseUrl, model: openAiModel });
});

app.get('/api/dashboard', (_req, res) => {
  res.json(healthAgent.getDashboard());
});

app.post('/api/checkins', async (req, res) => {
  const schema = z.object({
    period: z.enum(['morning', 'evening', 'ad_hoc']),
    rawText: z.string().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const result = await healthAgent.ingestCheckin(parsed.data.period, parsed.data.rawText);
  return res.json(result);
});

app.get('/api/checkins', (_req, res) => {
  res.json(db.getRecentEntries(50));
});

app.post('/api/reminders', (req, res) => {
  const schema = z.object({
    period: z.enum(['morning', 'evening']),
    timeOfDay: z.string().regex(/^\d{2}:\d{2}$/),
    enabled: z.boolean().default(true),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  db.upsertReminder(parsed.data.period, parsed.data.timeOfDay, parsed.data.enabled);
  return res.json({ ok: true, reminders: db.getReminders() });
});

app.get('/api/reports/summary', (_req, res) => {
  const dashboard = healthAgent.getDashboard();
  const report = {
    generatedAt: new Date().toISOString(),
    counts: dashboard.summary.counts,
    latestAlerts: dashboard.alerts,
    latestObservations: dashboard.observations.slice(0, 10),
    note: 'Phase 1 summary report. PDF/chart export scaffolding can build on this endpoint.'
  };
  res.json(report);
});

app.post('/api/documents', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'file is required' });
  }
  const note = typeof req.body.note === 'string' ? req.body.note : undefined;
  const id = db.insertDocument(req.file.originalname, req.file.mimetype, note);
  return res.json({
    ok: true,
    document: {
      id,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      status: 'uploaded'
    },
    message: 'Document metadata saved. Full PDF/image extraction is queued for the next build step.'
  });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`Asclepios Phase 1 listening on http://localhost:${port}`);
});
