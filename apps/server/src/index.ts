import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import './lib/db.js';
import { alertsRouter } from './routes/alerts.js';
import { checkinsRouter } from './routes/checkins.js';
import { documentsRouter } from './routes/documents.js';
import { observationsRouter } from './routes/observations.js';
import { remindersRouter } from './routes/reminders.js';
import { reportsRouter } from './routes/reports.js';
import { startReminderScheduler } from './services/reminderScheduler.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '127.0.0.1';

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'asclepios-server' });
});

app.use('/api/checkins', checkinsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/observations', observationsRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/documents', documentsRouter);

app.listen(port, host, () => {
  console.log(`Asclepios server listening on http://${host}:${port}`);
  startReminderScheduler();
});
